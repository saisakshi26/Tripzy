/* Offline checks for the planning engine, budget maths, preference rules and assistant.
   Run with:  npm run test:engine   (no API keys or network needed) */
import { generateItinerary } from '../lib/planner';
import { DEFAULT_PREFS, tripDays, validatePrefs } from '../lib/defaults';
import { runAssistant } from '../lib/assistant';
import { sanitizePrefs } from '../lib/sanitize';
import { destinations, getDestination } from '../lib/data/destinations';
import type { Preferences } from '../types';

let passed = 0;
let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
};

const base = (over: Partial<Preferences>): Preferences => ({
  ...DEFAULT_PREFS,
  destinationIds: ['kerala'],
  startDate: '2026-12-10',
  endDate: '2026-12-15',
  ...over,
});

console.log('\nDestinations');
check('8 destinations in the required order', destinations.map((d) => d.id).join() === 'maharashtra,telangana,kerala,goa,tamilnadu,meghalaya,karnataka,rajasthan');
for (const d of destinations) check(`${d.name}: has areas, attractions and restaurants`, d.areas.length >= 2 && d.attractions.length >= 8 && d.restaurants.length >= 8);

console.log('\nItinerary generation (every destination, 4 days)');
for (const d of destinations) {
  const it = generateItinerary(base({ destinationIds: [d.id], endDate: '2026-12-13' }));
  check(`${d.name}: 4 days, each with slots, stays and budget`, it.days.length === 4 && it.days.every((x) => x.slots.length > 0) && it.stays.length > 0 && it.budget.total > 0);
}

console.log('\nPreference rules');
const noAlc = generateItinerary(base({ destinationIds: ['goa'], alcohol: 'no', endDate: '2026-12-14' }));
const alcIds = new Set(getDestination('goa')!.attractions.filter((a) => a.alcohol).map((a) => a.id));
check('alcohol = no: no alcohol-centred attractions', !noAlc.days.some((d) => d.slots.some((s) => s.attractionId && alcIds.has(s.attractionId))));
check('alcohol = no: no alcohol-centred restaurants offered', noAlc.restaurants.every((r) => !r.alcoholCentred));
const veg = generateItinerary(base({ diet: 'vegetarian', destinationIds: ['rajasthan'], endDate: '2026-12-16' }));
check('vegetarian: no non-veg restaurants offered', veg.restaurants.every((r) => r.diet !== 'nonveg'));
check('vegetarian: every meal slot uses a vegetarian-friendly place', veg.days.flatMap((d) => d.slots).filter((s) => s.kind === 'meal').every((s) => veg.restaurants.find((r) => r.id === s.restaurantId)?.diet !== 'nonveg'));
const relaxed = generateItinerary(base({ pace: 'relaxed', endDate: '2026-12-14' }));
const packed = generateItinerary(base({ pace: 'packed', endDate: '2026-12-14' }));
const sights = (it: ReturnType<typeof generateItinerary>) => it.days.reduce((n, d) => n + d.slots.filter((s) => s.kind === 'sight').length, 0);
check('relaxed pace plans fewer sights than packed', sights(relaxed) < sights(packed), `${sights(relaxed)} vs ${sights(packed)}`);
const pub = generateItinerary(base({ transport: 'public', endDate: '2026-12-14' }));
check('public transport: transport labels use buses/walking, not a private cab', pub.days.flatMap((d) => d.slots).filter((s) => s.kind === 'sight').every((s) => /Walk|bus|auto/i.test(s.mode)));
const lux = generateItinerary(base({ tier: 'luxury', budgetTotal: 400000 }));
const bud = generateItinerary(base({ tier: 'budget', budgetTotal: 40000 }));
check('luxury costs more than budget tier', lux.budget.total > bud.budget.total * 1.5, `${lux.budget.total} vs ${bud.budget.total}`);
const mobility = generateItinerary(base({ seniors: true, walking: 'low', endDate: '2026-12-14' }));
check('seniors / low walking: no strenuous (walk=3) attractions', mobility.days.flatMap((d) => d.slots).every((s) => !s.attractionId || (getDestination('kerala')!.attractions.find((a) => a.id === s.attractionId)?.walk ?? 1) < 3));
const multi = generateItinerary(base({ destinationIds: ['kerala', 'goa'], endDate: '2026-12-17' }));
check('multi-destination trip covers both destinations', new Set(multi.days.map((d) => d.destinationId)).size === 2);
check('different days are not identical copies', new Set(multi.days.map((d) => d.title)).size === multi.days.length);

console.log('\nBudget maths');
const it = generateItinerary(base({ budgetTotal: 120000, adults: 2, children: 1 }));
const sum = it.budget.lines.reduce((s, l) => s + l.amount, 0);
check('line items add up to the total', sum === it.budget.total);
check('remaining = budget − total', it.budget.remaining === it.budget.budget - it.budget.total);
check('per-day and per-person figures are consistent', Math.abs(it.budget.perDay * it.days.length - it.budget.total) < 1 && Math.abs(it.budget.perPerson * 3 - it.budget.total) < 1);
const perPerson = generateItinerary(base({ budgetTotal: 30000, budgetScope: 'person', adults: 2 }));
check('per-person budget is multiplied by travellers', perPerson.budget.budget === 60000);
const tight = generateItinerary(base({ budgetTotal: 15000 }));
check('over-budget plans flag it and suggest alternatives', tight.budget.over && tight.budget.suggestions.length > 0);

console.log('\nValidation & sanitising');
check('missing dates are rejected', validatePrefs({ ...DEFAULT_PREFS, destinationIds: ['goa'] }).length > 0);
check('end before start is rejected', validatePrefs(base({ endDate: '2026-12-01' })).length > 0);
check('trip length counts both ends', tripDays(base({})) === 6);
const dirty = sanitizePrefs({ destinationIds: ['goa', 'mars'], adults: -4, children: 'x', tier: 'ultra', minRating: 4.2, interests: ['nature', 'hacking'], startDate: 'soon' });
check('sanitiser drops unknown destinations / enums / dates', dirty.destinationIds.join() === 'goa' && dirty.adults === 1 && dirty.tier === 'standard' && dirty.minRating === 4.2 && dirty.interests.join() === 'nature' && dirty.startDate === '');

console.log('\nAssistant');
const trip = generateItinerary(base({ budgetTotal: 90000, endDate: '2026-12-16' }));
const ask = (msg: string, ctx = {}) => runAssistant(trip, trip.days.length ? base({ budgetTotal: 90000, endDate: '2026-12-16' }) : DEFAULT_PREFS, msg, ctx);
const hotel = ask('Can you replace this hotel?');
check('replace hotel: swaps the stay and updates the budget', hotel.changed && Object.values(hotel.itinerary.stayChoice).join() !== Object.values(trip.stayChoice).join());
const cheap = ask('Suggest cheaper restaurants');
check('cheaper restaurants: lowers food cost', cheap.changed && (cheap.itinerary.budget.lines.find((l) => l.key === 'food')!.amount < trip.budget.lines.find((l) => l.key === 'food')!.amount));
const addAdv = ask('Add one more adventure activity');
check('add adventure: adds a sight', addAdv.changed && addAdv.itinerary.days.flatMap((d) => d.slots).filter((s) => s.kind === 'sight').length === trip.days.flatMap((d) => d.slots).filter((s) => s.kind === 'sight').length + 1, addAdv.reply);
const relax = ask('Make Day 2 more relaxed');
check('relax day 2: day 2 is flagged relaxed with ≤ 2 sights', relax.itinerary.days[1].relaxed && relax.itinerary.days[1].slots.filter((s) => s.kind === 'sight').length <= 2);
const vegAsk = ask('Find vegetarian restaurants nearby');
check('vegetarian request is understood', vegAsk.intent.type === 'veg_restaurants');
const reduce = ask('Reduce the total budget by 20%');
check('reduce budget: total goes down', reduce.changed && reduce.itinerary.budget.total < trip.budget.total, reduce.reply);
const alt = ask('Suggest alternatives to ' + trip.days[1].slots.find((s) => s.kind === 'sight')!.title);
check('alternative attraction: replaces the named sight', alt.changed && alt.intent.type === 'alternative_attraction', alt.reply);
check('unknown requests get a helpful reply, no change', !ask('what is the weather').changed);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
