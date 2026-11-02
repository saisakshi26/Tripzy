import type {
  AssistantIntent,
  AssistantResult,
  DayPlan,
  Itinerary,
  Kind,
  Preferences,
  RestaurantOption,
  Slot,
  StayOption,
} from '@/types';
import { getDestination } from './data/destinations';
import { getAttraction } from './lookup';
import { makeCtx, refreshItinerary, scheduleDay, scoreAttraction, sightSlot } from './planner';
import { selectedStay } from './budget';
import { nightlyCost } from './stays';
import { inr } from './utils';

/** Optional UI context so buttons like “replace this hotel” know what “this” is. */
export interface AssistantContext {
  areaId?: string;
  day?: number;
  attractionId?: string;
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const KIND_WORDS: [RegExp, Kind][] = [
  [/adventur|thrill|adrenaline|rafting|zip|jeep|safari/, 'adventure'],
  [/trek|hike|hiking|trail/, 'trekking'],
  [/beach|sea ?side|coast/, 'beaches'],
  [/water ?sport|kayak|boat|snorkel|dive|diving/, 'water'],
  [/wildlife|animal|bird|safari/, 'wildlife'],
  [/nightlife|night life|party|club/, 'nightlife'],
  [/temple|spiritual|shrine/, 'temples'],
  [/heritage|history|historic|fort|palace/, 'heritage'],
  [/cultur|dance|music|local experience/, 'culture'],
  [/shop|market|bazaar|souvenir/, 'shopping'],
  [/photo/, 'photography'],
  [/nature|waterfall|garden|scenic|view/, 'nature'],
  [/food|culinary|cooking|tasting/, 'food'],
  [/relax|spa|slow|calm/, 'relaxation'],
];

const kindFromText = (t: string): Kind => {
  for (const [re, k] of KIND_WORDS) if (re.test(t)) return k;
  return 'adventure';
};

// ───────────────────────── intent parsing (rule based) ─────────────────────────

export function parseIntent(message: string, it: Itinerary, ctx: AssistantContext = {}): AssistantIntent {
  const m = message.toLowerCase();
  const dayMatch = m.match(/day\s*(\d+)/);
  const areaNamed = it.days
    .map((d) => ({ id: d.areaId, name: d.areaName.toLowerCase() }))
    .find((a) => m.includes(a.name));

  if (/(replace|change|swap|switch|different|another|new|alternative).*(hotel|stay|hostel|resort|homestay|accommodation|lodging|room)/.test(m) ||
      /(hotel|stay|hostel|resort|homestay|accommodation).*(replace|change|swap|switch|cheaper|better|different)/.test(m)) {
    return { type: 'replace_hotel', areaId: ctx.areaId ?? areaNamed?.id };
  }
  if (/(reduce|cut|lower|trim|decrease|slash|save).*(budget|cost|spend|spending|total|expens|price)/.test(m) ||
      /(too expensive|over budget|bring (it )?down)/.test(m)) {
    const pct = m.match(/(\d{1,2})\s*%/);
    return { type: 'reduce_budget', percent: pct ? Math.min(40, Math.max(5, Number(pct[1]))) : 15 };
  }
  if (/(vegetarian|veg\b|vegan|pure veg)/.test(m) && /(restaurant|food|eat|place|meal|cafe|café|dining|nearby|option)/.test(m)) {
    return { type: 'veg_restaurants' };
  }
  if (/(cheap|cheaper|budget|afford|inexpensive|less expensive|low.?cost)/.test(m) && /(restaurant|food|eat|meal|dining|cafe|café|place)/.test(m)) {
    return { type: 'cheaper_restaurants' };
  }
  if ((/(relax|slower|lighter|less packed|less busy|ease|easier|chill|calmer|more relaxed)/.test(m)) && (dayMatch || ctx.day)) {
    return { type: 'relax_day', day: dayMatch ? Number(dayMatch[1]) : (ctx.day as number) };
  }
  if (/(add|include|one more|another|more|extra).*(adventure|trek|hike|water|beach|nightlife|temple|heritage|culture|cultural|shopping|photo|wildlife|nature|food|activity|experience|thrill)/.test(m)) {
    return { type: 'add_activity', kind: kindFromText(m) };
  }
  if (/(alternative|alternate|instead|replace|swap|something else|other than|different|skip|remove|not interested).*(attraction|sight|place|visit|activity|fort|temple|museum|beach|trek)/.test(m) ||
      /(alternative|alternate|instead of|something else)/.test(m)) {
    return { type: 'alternative_attraction', query: ctx.attractionId ?? message };
  }
  if (/relax|slower|lighter/.test(m) && it.days.length) return { type: 'relax_day', day: ctx.day ?? 1 };
  return { type: 'unknown' };
}

// ───────────────────────── helpers ─────────────────────────

const mealTitle = (slot: Slot, r: RestaurantOption) => `${slot.period === 'evening' ? 'Dinner' : 'Lunch'} — ${r.name}`;
const mealDesc = (r: RestaurantOption) => `${r.cuisine}. Try: ${r.dishes.join(', ')}.`;

const optionAllowed = (r: RestaurantOption, prefs: Preferences): boolean => {
  if (prefs.alcohol !== 'yes' && r.alcoholCentred) return false;
  const vegDiet = prefs.diet === 'vegetarian' || prefs.diet === 'vegan' || prefs.diet === 'eggetarian';
  if (vegDiet && r.diet === 'nonveg') return false;
  return true;
};

const usedAttractions = (it: Itinerary): Set<string> =>
  new Set(it.days.flatMap((d) => d.slots.filter((s) => s.attractionId).map((s) => `${d.destinationId}:${s.attractionId}`)));

const sightsOf = (d: DayPlan) => d.slots.filter((s) => s.kind === 'sight');

function swapMeal(slot: Slot, r: RestaurantOption): Slot {
  return { ...slot, restaurantId: r.id, title: mealTitle(slot, r), desc: mealDesc(r) };
}

const stayLabel = (s: StayOption) => `${s.name}${s.verified ? '' : ' (sample)'}`;

function stayPool(it: Itinerary, areaId: string, prefs: Preferences): StayOption[] {
  return it.stays.filter((s) => s.areaId === areaId && (s.rating === null || s.rating >= prefs.minRating));
}

const result = (itinerary: Itinerary, reply: string, intent: AssistantIntent, changed: boolean): AssistantResult => ({
  itinerary,
  reply,
  intent,
  changed,
  usedAI: false,
});

// ───────────────────────── operations ─────────────────────────

export function replaceHotel(it0: Itinerary, prefs: Preferences, areaId?: string, cheaper = false): AssistantResult {
  const intent: AssistantIntent = { type: 'replace_hotel', areaId };
  const it = clone(it0);
  const nightsBy = new Map<string, number>();
  it.days.forEach((d, i) => {
    if (i < it.days.length - 1) nightsBy.set(d.areaId, (nightsBy.get(d.areaId) ?? 0) + 1);
  });
  const target =
    areaId && nightsBy.has(areaId) ? areaId : [...nightsBy.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? it.days[0]?.areaId;
  if (!target) return result(it0, 'There is no stay to replace in this trip yet.', intent, false);
  const current = selectedStay(it, target);
  const pool = stayPool(it, target, prefs).filter((s) => s.id !== current?.id);
  if (!pool.length) return result(it0, `I could not find another stay in ${it.days.find((d) => d.areaId === target)?.areaName ?? 'that area'} that meets your ${prefs.minRating}+ rating requirement.`, intent, false);
  let pick: StayOption | undefined;
  if (cheaper && current) {
    pick = [...pool].filter((s) => s.pricePerNight < current.pricePerNight).sort((a, b) => a.pricePerNight - b.pricePerNight)[0];
    if (!pick) return result(it0, `${stayLabel(current)} is already the most affordable option I have for that area.`, intent, false);
  } else {
    pick = pool.find((s) => s.withinNightlyBudget) ?? pool[0];
  }
  it.stayChoice[target] = pick.id;
  const next = refreshItinerary(it, prefs);
  const delta = current ? nightlyCost(pick, prefs) - nightlyCost(current, prefs) : 0;
  const areaName = it.days.find((d) => d.areaId === target)?.areaName ?? '';
  return result(
    next,
    `Done — in ${areaName} I replaced ${current ? stayLabel(current) : 'your stay'} with ${stayLabel(pick)} (${pick.type}${pick.rating ? `, ${pick.rating.toFixed(1)}★` : ''}). ` +
      `That is ${delta === 0 ? 'about the same price' : `${inr(Math.abs(delta))} per night ${delta > 0 ? 'more' : 'less'}`}${pick.priceEstimated ? ' (estimated price)' : ''}. Budget updated.`,
    intent,
    true,
  );
}

export function cheaperRestaurants(it0: Itinerary, prefs: Preferences): AssistantResult {
  const intent: AssistantIntent = { type: 'cheaper_restaurants' };
  const it = clone(it0);
  let changes = 0;
  const swaps: string[] = [];
  it.days = it.days.map((d) => ({
    ...d,
    slots: d.slots.map((s) => {
      if (s.kind !== 'meal' || !s.restaurantId) return s;
      const cur = it.restaurants.find((r) => r.id === s.restaurantId);
      if (!cur) return s;
      const cand = it.restaurants
        .filter((r) => r.areaId === cur.areaId && r.avgPP < cur.avgPP && optionAllowed(r, prefs))
        .sort((a, b) => a.avgPP - b.avgPP)[0];
      if (!cand) return s;
      changes++;
      swaps.push(`Day ${d.day}: ${cur.name} → ${cand.name} (about ${inr(cand.avgPP)} pp)`);
      return swapMeal(s, cand);
    }),
  }));
  if (!changes) return result(it0, 'Your meals are already at the most affordable options available for each area. Ask me to “reduce the total budget” to find savings elsewhere.', intent, false);
  const before = it0.budget.total;
  const next = refreshItinerary(it, prefs);
  return result(next, `I swapped ${changes} meal${changes > 1 ? 's' : ''} for cheaper choices, saving about ${inr(Math.max(0, before - next.budget.total))}:\n${swaps.slice(0, 6).join('\n')}`, intent, true);
}

export function vegRestaurants(it0: Itinerary, prefs: Preferences): AssistantResult {
  const intent: AssistantIntent = { type: 'veg_restaurants' };
  const it = clone(it0);
  const used = new Set<string>();
  const swaps: string[] = [];
  it.days = it.days.map((d) => ({
    ...d,
    slots: d.slots.map((s) => {
      if (s.kind !== 'meal' || !s.restaurantId) return s;
      const cur = it.restaurants.find((r) => r.id === s.restaurantId);
      if (!cur) return s;
      if (cur.diet === 'veg') {
        used.add(cur.id);
        return s;
      }
      const cand = it.restaurants
        .filter((r) => r.areaId === cur.areaId && (r.diet === 'veg' || r.diet === 'both') && r.id !== cur.id && optionAllowed(r, prefs))
        .sort((a, b) => Number(b.diet === 'veg') - Number(a.diet === 'veg') || Number(used.has(a.id)) - Number(used.has(b.id)) || a.avgPP - b.avgPP)[0];
      if (!cand) return s;
      used.add(cand.id);
      swaps.push(`Day ${d.day}: ${cur.name} → ${cand.name} (${cand.diet === 'veg' ? 'pure vegetarian' : 'veg & non-veg menu'})`);
      return swapMeal(s, cand);
    }),
  }));
  const vegList = it.restaurants.filter((r) => r.diet === 'veg').slice(0, 5).map((r) => `${r.name} (${r.areaName})`);
  if (!swaps.length) {
    return result(
      it0,
      vegList.length
        ? `Your plan already leans vegetarian-friendly. Vegetarian kitchens on your route: ${vegList.join(', ')}.`
        : 'I could not find vegetarian-focused kitchens for the areas on your route — most places there offer vegetarian dishes, so ask for veg options.',
      intent,
      false,
    );
  }
  const next = refreshItinerary(it, prefs);
  return result(next, `I moved your meals to vegetarian-friendly places:\n${swaps.slice(0, 6).join('\n')}${vegList.length ? `\n\nPure-veg kitchens on your route: ${vegList.join(', ')}.` : ''}`, intent, true);
}

export function addActivity(it0: Itinerary, prefs: Preferences, kind: Kind): AssistantResult {
  const intent: AssistantIntent = { type: 'add_activity', kind };
  const it = clone(it0);
  const ctx = makeCtx(prefs);
  const used = usedAttractions(it);
  const areasOnRoute = new Set(it.days.map((d) => d.areaId));
  const cands: { a: ReturnType<typeof getAttraction> & {}; score: number; destId: string }[] = [];
  for (const dd of it.destinations) {
    const dest = getDestination(dd.id);
    if (!dest) continue;
    for (const a of dest.attractions) {
      if (!areasOnRoute.has(a.areaId) || used.has(`${dest.id}:${a.id}`) || !a.kinds.includes(kind)) continue;
      const s = scoreAttraction(a, ctx);
      if (s === null) continue;
      cands.push({ a, score: s, destId: dest.id });
    }
  }
  cands.sort((x, y) => y.score - x.score);
  for (const c of cands) {
    const days = it.days
      .map((d, idx) => ({ d, idx }))
      .filter(({ d }) => d.areaId === c.a.areaId && d.destinationId === c.destId)
      .map(({ d, idx }) => ({ d, idx, load: sightsOf(d).reduce((h, s) => h + s.durationH, 0), last: idx === it.days.length - 1 }))
      .filter((x) => x.load + c.a.hours <= 10)
      .sort((x, y) => Number(x.last) - Number(y.last) || x.load - y.load);
    const target = days[0];
    if (!target) continue;
    const period: Slot['period'] = c.a.evening ? 'evening' : 'afternoon';
    const slot = sightSlot(c.a, period, target.d.day, 90 + target.d.slots.length);
    const slots = [...target.d.slots];
    let at = slots.findIndex((s) => s.period === 'evening');
    if (period === 'afternoon' && at === -1) at = slots.length;
    if (period === 'evening') {
      const dinner = slots.findIndex((s) => s.kind === 'meal' && s.period === 'evening');
      at = dinner === -1 ? slots.length : dinner;
    }
    slots.splice(at, 0, slot);
    it.days[target.idx] = scheduleDay({ ...target.d, slots }, prefs);
    const next = refreshItinerary(it, prefs);
    return result(
      next,
      `Added “${c.a.name}” to Day ${target.d.day} (${it.days[target.idx].areaName}) — ${c.a.desc} It takes about ${c.a.hours}h${c.a.fee ? ` and costs roughly ${inr(c.a.fee)} per adult` : ' and is free'}. I picked the lightest day in that area so it stays comfortable.`,
      intent,
      true,
    );
  }
  return result(it0, `Everything matching “${kind}” in the areas on your route is already in your plan, or would overload a day. Try another interest, or add a day to your dates.`, intent, false);
}

export function relaxDay(it0: Itinerary, prefs: Preferences, dayNo: number): AssistantResult {
  const intent: AssistantIntent = { type: 'relax_day', day: dayNo };
  const idx = dayNo - 1;
  if (!it0.days[idx]) return result(it0, `Your trip has ${it0.days.length} day${it0.days.length > 1 ? 's' : ''}, so there is no Day ${dayNo}.`, intent, false);
  const it = clone(it0);
  const day = it.days[idx];
  const sights = sightsOf(day);
  const removed: string[] = [];
  let slots = [...day.slots];
  if (sights.length > 2) {
    const ranked = [...sights].sort((a, b) => b.durationH - a.durationH); // longest first
    for (const s of ranked.slice(0, sights.length - 2)) {
      removed.push(s.title);
      slots = slots.filter((x) => x.id !== s.id);
    }
  }
  if (!slots.some((s) => s.kind === 'rest')) {
    const dinner = slots.findIndex((s) => s.kind === 'meal' && s.period === 'evening');
    const rest: Slot = {
      id: `d${day.day}-rest-${Date.now().toString(36).slice(-4)}`,
      period: 'afternoon',
      kind: 'rest',
      time: '',
      title: 'Rest & recharge',
      desc: 'A deliberate pause: a long lunch, a swim or a nap at your stay before the evening.',
      durationH: 1.5,
      feePP: 0,
      travelKm: 0,
      travelMin: 0,
      mode: '',
    };
    slots.splice(dinner === -1 ? slots.length : dinner, 0, rest);
  }
  it.days[idx] = scheduleDay({ ...day, slots, relaxed: true, tips: [...day.tips, 'Made more relaxed on request — later start and a rest window.'].slice(-4) }, prefs);
  const next = refreshItinerary(it, prefs);
  return result(
    next,
    `Day ${dayNo} is now relaxed: it starts 30 minutes later, keeps ${Math.min(2, sights.length)} sight${Math.min(2, sights.length) === 1 ? '' : 's'}, and includes a rest window.${removed.length ? ` I removed: ${removed.join(', ')}.` : ''}`,
    intent,
    true,
  );
}

export function alternativeAttraction(it0: Itinerary, prefs: Preferences, query: string, ctxAttraction?: string): AssistantResult {
  const intent: AssistantIntent = { type: 'alternative_attraction', query };
  const it = clone(it0);
  const q = query.toLowerCase();
  const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'for', 'suggest', 'alternative', 'alternatives', 'alternate', 'attraction', 'something', 'else', 'instead', 'replace', 'swap', 'with', 'other', 'than', 'this', 'that', 'place', 'visit', 'sight', 'please', 'can', 'you', 'day']);
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  let found: { dayIdx: number; slotIdx: number } | undefined;
  let bestHits = 0;
  it.days.forEach((d, di) =>
    d.slots.forEach((s, si) => {
      if (s.kind !== 'sight') return;
      const hits = s.attractionId === ctxAttraction || s.attractionId === query ? 99 : words.filter((w) => s.title.toLowerCase().includes(w)).length;
      if (hits > bestHits) {
        bestHits = hits;
        found = { dayIdx: di, slotIdx: si };
      }
    }),
  );
  if (!found) {
    // default: swap the costliest paid attraction
    let top = -1;
    it.days.forEach((d, di) =>
      d.slots.forEach((s, si) => {
        if (s.kind === 'sight' && s.feePP > top) {
          top = s.feePP;
          found = { dayIdx: di, slotIdx: si };
        }
      }),
    );
  }
  if (!found) return result(it0, 'There are no attractions in this plan to replace yet.', intent, false);
  const day = it.days[found.dayIdx];
  const old = day.slots[found.slotIdx];
  const oldAtt = old.attractionId ? getAttraction(day.destinationId, old.attractionId) : undefined;
  const dest = getDestination(day.destinationId);
  if (!dest || !oldAtt) return result(it0, 'I could not work out which attraction you meant — try naming it, e.g. “alternatives to Mattupetty Dam”.', intent, false);
  const ctx = makeCtx(prefs);
  const used = usedAttractions(it);
  const cands = dest.attractions
    .filter((a) => a.id !== oldAtt.id && !used.has(`${dest.id}:${a.id}`) && !!a.evening === !!oldAtt.evening)
    .map((a) => ({ a, s: scoreAttraction(a, ctx) }))
    .filter((x): x is { a: typeof x.a; s: number } => x.s !== null)
    .map(({ a, s }) => ({
      a,
      score: s + a.kinds.filter((k) => oldAtt.kinds.includes(k)).length * 2 + (a.areaId === oldAtt.areaId ? 4 : 0) - Math.abs(a.hours - oldAtt.hours) * 0.3,
    }))
    .sort((x, y) => y.score - x.score);
  if (!cands.length) return result(it0, `I have no unused alternatives to “${old.title}” that fit your preferences.`, intent, false);
  const pick = cands[0].a;
  const fresh = sightSlot(pick, old.period, day.day, found.slotIdx);
  const slots = [...day.slots];
  slots[found.slotIdx] = fresh;
  it.days[found.dayIdx] = scheduleDay({ ...day, slots }, prefs);
  const next = refreshItinerary(it, prefs);
  const others = cands.slice(1, 3).map((c) => c.a.name);
  return result(
    next,
    `Replaced “${old.title}” on Day ${day.day} with “${pick.name}” — ${pick.desc}${others.length ? `\n\nOther options if you prefer: ${others.join(', ')}.` : ''}`,
    intent,
    true,
  );
}

export function reduceBudget(it0: Itinerary, prefs: Preferences, percent: number): AssistantResult {
  const intent: AssistantIntent = { type: 'reduce_budget', percent };
  let it = clone(it0);
  const start = it0.budget.total;
  const target = start * (1 - percent / 100);
  const steps: string[] = [];
  const total = () => it.budget.total;

  // 1) cheaper stays everywhere
  const areas = [...new Set(it.days.map((d) => d.areaId))];
  let stayCount = 0;
  for (const a of areas) {
    const cur = selectedStay(it, a);
    const cheapest = stayPool(it, a, prefs).sort((x, y) => x.pricePerNight - y.pricePerNight)[0];
    if (cur && cheapest && cheapest.pricePerNight < cur.pricePerNight) {
      it.stayChoice[a] = cheapest.id;
      stayCount++;
    }
  }
  if (stayCount) {
    it = refreshItinerary(it, prefs);
    steps.push(`switched ${stayCount} stay${stayCount > 1 ? 's' : ''} to the most affordable matching option`);
  }

  // 2) cheaper meals
  if (total() > target) {
    const r = cheaperRestaurants(it, prefs);
    if (r.changed) {
      it = r.itinerary;
      steps.push('moved meals to lower-cost eateries');
    }
  }

  // 3) swap the two costliest paid attractions for cheaper ones
  for (let i = 0; i < 2 && total() > target; i++) {
    const paid = it.days
      .flatMap((d) => d.slots.filter((s) => s.kind === 'sight' && s.feePP >= 800).map((s) => ({ id: s.attractionId as string, fee: s.feePP })))
      .sort((a, b) => b.fee - a.fee)[0];
    if (!paid) break;
    const before = total();
    const r = alternativeAttraction(it, prefs, paid.id, paid.id);
    if (!r.changed || r.itinerary.budget.total >= before) break;
    it = r.itinerary;
    steps.push('replaced a high-cost activity with a cheaper alternative');
  }

  // 4) assume more street-food / local eating
  if (total() > target && it.adjustments.foodFactor > 0.8) {
    it = clone(it);
    it.adjustments.foodFactor = Math.max(0.8, Math.round((it.adjustments.foodFactor - 0.1) * 100) / 100);
    it = refreshItinerary(it, prefs);
    steps.push('assumed more street-food and local-eatery meals');
  }

  if (!steps.length) return result(it0, 'This plan is already at the lowest-cost options I can find. Shortening the trip by a day is the next biggest saving.', intent, false);
  const saved = start - total();
  const hit = total() <= target;
  return result(
    it,
    `I ${steps.join(', then ')}. New estimated total: ${inr(total())} (saved ${inr(saved)}, ${Math.round((saved / start) * 100)}%).${hit ? '' : ` That is short of the ${percent}% target — dropping a day or choosing a cheaper destination mix would save more.`}`,
    intent,
    true,
  );
}

// ───────────────────────── entry point ─────────────────────────

export const HELP_REPLY =
  'I can adjust this trip for you. Try: “replace this hotel”, “suggest cheaper restaurants”, “add one more adventure activity”, “make Day 2 more relaxed”, “find vegetarian restaurants nearby”, “reduce the total budget by 15%” or “suggest alternatives to Mattupetty Dam”.';

export function applyIntent(it: Itinerary, prefs: Preferences, intent: AssistantIntent, message = '', ctx: AssistantContext = {}): AssistantResult {
  const m = message.toLowerCase();
  switch (intent.type) {
    case 'replace_hotel':
      return replaceHotel(it, prefs, intent.areaId ?? ctx.areaId, /cheap|budget|afford|less/.test(m));
    case 'cheaper_restaurants':
      return cheaperRestaurants(it, prefs);
    case 'veg_restaurants':
      return vegRestaurants(it, prefs);
    case 'add_activity':
      return addActivity(it, prefs, intent.kind);
    case 'relax_day':
      return relaxDay(it, prefs, intent.day);
    case 'reduce_budget':
      return reduceBudget(it, prefs, intent.percent);
    case 'alternative_attraction':
      return alternativeAttraction(it, prefs, intent.query, ctx.attractionId);
    default:
      return result(it, HELP_REPLY, { type: 'unknown' }, false);
  }
}

export function runAssistant(it: Itinerary, prefs: Preferences, message: string, ctx: AssistantContext = {}): AssistantResult {
  const intent = parseIntent(message, it, ctx);
  return applyIntent(it, prefs, intent, message, ctx);
}
