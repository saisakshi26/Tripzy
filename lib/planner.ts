import type {
  Area,
  Attraction,
  DayPlan,
  Destination,
  Itinerary,
  Kind,
  Preferences,
  RestaurantData,
  RestaurantOption,
  Slot,
  StayOption,
} from '@/types';
import { computeBudget, selectedStay } from './budget';
import {
  isMobilityLimited,
  tierIndex,
  travellerCount,
  tripDays,
  usesWheelchair,
  validatePrefs,
} from './defaults';
import { getDestination } from './data/destinations';
import { getArea, getAttraction, optionId } from './lookup';
import { buildDemoStays, nightlyCost } from './stays';
import {
  addDays,
  durationLabel,
  haversineKm,
  hhmm,
  mapsSearchUrl,
  monthOf,
  prettyDate,
  uid,
} from './utils';

export class PlanError extends Error {}

// ───────────────────────── constants ─────────────────────────

const SIGHTS_PER_DAY = { relaxed: 2, balanced: 3, packed: 4 } as const;
const LOCAL_SPEED: Record<Preferences['transport'], number> = {
  own: 30,
  rental: 30,
  cab: 30,
  public: 18,
  bike: 28,
  mix: 24,
};
const HIGHWAY_SPEED = 45;
const MEAL_CAP: Record<Preferences['tier'], number> = { budget: 400, standard: 800, premium: 1600, luxury: 99999 };

const KIND_THEME: Partial<Record<Kind, string>> = {
  heritage: 'Heritage',
  nature: 'Nature',
  beaches: 'Beach',
  adventure: 'Adventure',
  trekking: 'Trail',
  temples: 'Temple',
  culture: 'Culture',
  shopping: 'Bazaar',
  food: 'Food',
  wildlife: 'Wildlife',
  water: 'Water',
  relaxation: 'Slow',
  photography: 'Golden-hour',
  nightlife: 'After-dark',
};

const shortName = (n: string): string => n.split(/ & | and |,|\(/)[0].trim();

const modeLabel = (mode: Preferences['transport'], km: number): string => {
  switch (mode) {
    case 'own':
      return 'Own vehicle';
    case 'rental':
      return 'Rental car';
    case 'cab':
      return 'Cab / taxi';
    case 'bike':
      return 'Rented bike';
    case 'public':
      return km < 1.5 ? 'Walk' : 'Local bus / auto';
    default:
      return km < 6 ? 'Auto / cab' : 'Cab / local bus';
  }
};

const intercityModeLabel = (mode: Preferences['transport'], km: number): string => {
  switch (mode) {
    case 'own':
      return 'Drive your own vehicle';
    case 'rental':
      return 'Self-drive rental car';
    case 'cab':
      return 'Private cab';
    case 'bike':
      return 'Ride your rented bike';
    case 'public':
      return km > 400 ? 'Train / overnight bus' : 'State bus or train';
    default:
      return km >= 150 ? 'Train / bus' : 'Private cab';
  }
};

// ───────────────────────── context ─────────────────────────

export interface Ctx {
  prefs: Preferences;
  T: number;
  limited: boolean;
  wheelchair: boolean;
  noAlcohol: boolean;
  vegDiet: boolean;
}

export const makeCtx = (prefs: Preferences): Ctx => ({
  prefs,
  T: travellerCount(prefs),
  limited: isMobilityLimited(prefs),
  wheelchair: usesWheelchair(prefs),
  noAlcohol: prefs.alcohol !== 'yes',
  vegDiet: prefs.diet === 'vegetarian' || prefs.diet === 'vegan' || prefs.diet === 'eggetarian',
});

interface Scored {
  a: Attraction;
  score: number;
}

/** Hard filters + soft scoring for one attraction. Returns null when excluded. */
export function scoreAttraction(a: Attraction, ctx: Ctx): number | null {
  const { prefs } = ctx;
  if (ctx.noAlcohol && a.alcohol) return null;
  if (ctx.limited && a.walk === 3) return null;
  if (ctx.wheelchair && a.walk >= 2) return null;
  if (
    prefs.children > 0 &&
    a.kinds.includes('nightlife') &&
    !a.kinds.some((k) => k === 'culture' || k === 'food' || k === 'shopping')
  )
    return null;

  let score = 0;
  const overlap = a.kinds.filter((k) => prefs.interests.includes(k)).length;
  score += Math.min(overlap, 2) * 3;
  if (prefs.discovery === 'hidden') score += a.famous ? 0 : 2;
  else if (prefs.discovery === 'famous') score += a.famous ? 2 : 0;
  else score += 1;
  if (prefs.tier === 'budget') score -= a.fee / 1000;
  if (prefs.tier === 'luxury' && a.fee > 0) score += 0.3;
  if (prefs.walking === 'high' && a.walk >= 2) score += 0.8;
  if (prefs.walking === 'low') score -= a.walk * 0.4;
  if (prefs.pace === 'relaxed' && a.hours > 4) score -= 1;
  return score;
}

function rankPool(dest: Destination, areaId: string, ctx: Ctx): Scored[] {
  const out: Scored[] = [];
  for (const a of dest.attractions) {
    if (a.areaId !== areaId) continue;
    const s = scoreAttraction(a, ctx);
    if (s !== null) out.push({ a, score: s });
  }
  return out.sort((x, y) => y.score - x.score);
}

// ───────────────────────── restaurants ─────────────────────────

export function restaurantAllowed(r: RestaurantData, ctx: Ctx): boolean {
  if (ctx.noAlcohol && r.alcoholCentred) return false;
  if (ctx.vegDiet && r.diet === 'nonveg') return false;
  return true;
}

const vegNoteOf = (r: RestaurantData, prefs: Preferences): string => {
  if (r.diet === 'veg') return prefs.diet === 'vegan' ? 'Vegetarian kitchen — ask for dairy-free preparation' : 'Vegetarian kitchen';
  if (r.diet === 'both') return prefs.diet === 'vegan' ? 'Veg & non-veg menu — confirm vegan dishes' : 'Veg and non-veg options';
  return 'Non-vegetarian focus; veg options limited';
};

function toRestaurantOption(destId: string, r: RestaurantData, area: Area, prefs: Preferences): RestaurantOption {
  const why: string[] = [];
  if (prefs.diet !== 'none') why.push(prefs.diet === 'non-vegetarian' ? 'serves the non-veg dishes you enjoy' : `works with your ${prefs.diet} preference`);
  const styleHit = r.styles.filter((s) => prefs.foodInterests.includes(s));
  if (styleHit.length) why.push(`matches your interest in ${styleHit.join(' & ')} food`);
  if (prefs.alcohol !== 'yes' && !r.alcoholCentred) why.push('not built around alcohol');
  if (prefs.allergies.trim()) why.push(`tell staff about “${prefs.allergies.trim()}” before ordering`);
  if (!why.length) why.push('a well-regarded local choice for the area');
  return {
    id: optionId(destId, r.id),
    areaId: area.id,
    areaName: area.name,
    name: r.generic ? `${r.name} (local suggestion)` : r.name,
    cuisine: r.cuisine,
    diet: r.diet,
    rating: null,
    reviewCount: null,
    verified: false,
    source: 'demo',
    generic: !!r.generic,
    address: area.name,
    avgPP: r.avgPP,
    priceEstimated: true,
    dishes: r.dishes,
    hours: r.hours ?? 'Check current opening hours',
    mapsUrl: mapsSearchUrl(r.generic ? `${r.cuisine} restaurant in ${area.name}` : `${r.name} ${area.name}`),
    why: why.join('; ') + '.',
    distanceNote: `In ${area.name}`,
    vegNote: vegNoteOf(r, prefs),
    alcoholCentred: !!r.alcoholCentred,
  };
}

function pickMeal(
  dest: Destination,
  area: Area,
  ctx: Ctx,
  used: Set<string>,
  meal: 'lunch' | 'dinner',
): RestaurantData | undefined {
  const { prefs } = ctx;
  const cap = MEAL_CAP[prefs.tier];
  const inArea = dest.restaurants.filter((r) => r.areaId === area.id && restaurantAllowed(r, ctx));
  const pool = inArea.length ? inArea : dest.restaurants.filter((r) => restaurantAllowed(r, ctx));
  let best: RestaurantData | undefined;
  let bestScore = -Infinity;
  for (const r of pool) {
    let s = 0;
    s += r.styles.filter((x) => prefs.foodInterests.includes(x)).length * 2;
    s += used.has(optionId(dest.id, r.id)) ? -4 : 3;
    s += r.avgPP <= cap ? 2 : -2;
    if (meal === 'lunch') s -= r.avgPP / 2000;
    else s += tierIndex(prefs.tier) >= 2 ? r.avgPP / 3000 : -r.avgPP / 3000;
    if (ctx.vegDiet && r.diet === 'veg') s += 1.5;
    if (prefs.diet === 'non-vegetarian' && r.diet !== 'veg') s += 0.5;
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return best;
}

// ───────────────────────── scheduling ─────────────────────────

const dayStartMinutes = (prefs: Preferences, relaxed: boolean): number => {
  const base = prefs.earlyStart === 'early' ? 7 * 60 : prefs.earlyStart === 'late' ? 10 * 60 : 8 * 60 + 30;
  return base + (relaxed ? 30 : 0);
};

/** Re-computes clock times and travel distances for every slot of a day (used after edits too). */
export function scheduleDay(day: DayPlan, prefs: Preferences): DayPlan {
  const speed = LOCAL_SPEED[prefs.transport];
  let t = dayStartMinutes(prefs, day.relaxed);
  let prevKm: number | null = null;
  const slots = day.slots.map((slot): Slot => {
    const s = { ...slot };
    if (s.kind === 'transfer') {
      s.time = hhmm(t);
      t += s.durationH * 60;
      prevKm = null;
      return s;
    }
    if (s.kind === 'sight') {
      const att = s.attractionId ? getAttraction(day.destinationId, s.attractionId) : undefined;
      const km = att ? (prevKm === null ? att.km + 2 : Math.abs(att.km - prevKm) + 2) : 3;
      s.travelKm = Math.round(km * 10) / 10;
      s.travelMin = Math.round((km / speed) * 60 + 8);
      t += s.travelMin;
      if (s.period === 'evening') t = Math.max(t, 16 * 60 + 45);
      s.time = hhmm(t);
      s.mode = modeLabel(prefs.transport, km);
      t += s.durationH * 60;
      prevKm = att ? att.km : prevKm;
      return s;
    }
    if (s.kind === 'meal') {
      t = Math.max(t + 10, s.period === 'evening' ? 19 * 60 + 15 : 12 * 60 + 45);
      s.time = hhmm(t);
      t += s.durationH * 60;
      return s;
    }
    s.time = hhmm(t);
    t += s.durationH * 60;
    return s;
  });
  return { ...day, slots };
}

export function rescheduleAll(it: Itinerary, prefs: Preferences): Itinerary {
  return { ...it, days: it.days.map((d) => scheduleDay(d, prefs)) };
}

/** Recompute schedule + budget after any change. */
export function refreshItinerary(it: Itinerary, prefs: Preferences): Itinerary {
  const next = rescheduleAll(it, prefs);
  next.nights = Math.max(0, next.days.length - 1);
  return { ...next, budget: computeBudget(next, prefs) };
}

// ───────────────────────── generation ─────────────────────────

interface Segment {
  dest: Destination;
  area: Area;
  days: number;
  pool: Scored[];
}

const allocateDays = (total: number, parts: number): number[] => {
  const base = Math.floor(total / parts);
  const extra = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
};

const areaCountFor = (d: number): number => (d <= 2 ? 1 : d <= 4 ? 2 : d <= 6 ? 3 : 4);

const roadKm = (a: Area, b: Area): number => Math.round(haversineKm(a, b) * 1.3);

function buildSegments(prefs: Preferences, ctx: Ctx, dests: Destination[], nDays: number): Segment[] {
  const split = allocateDays(nDays, dests.length);
  const segments: Segment[] = [];
  dests.forEach((dest, di) => {
    const d = split[di];
    if (d <= 0) return;
    const k = Math.min(areaCountFor(d), dest.areas.length);
    const scored = dest.areas.map((area, idx) => {
      const pool = rankPool(dest, area.id, ctx);
      const s = pool.slice(0, 6).reduce((sum, p) => sum + Math.max(p.score, 0.5), 0);
      return { area, idx, pool, s };
    });
    const chosen = [...scored].sort((x, y) => y.s - x.s).slice(0, k).sort((x, y) => x.idx - y.idx);
    const counts = Array.from({ length: k }, () => Math.floor(d / k));
    const extra = d % k;
    const byScore = chosen.map((c, i) => ({ i, s: c.s })).sort((x, y) => y.s - x.s);
    for (let e = 0; e < extra; e++) counts[byScore[e].i]++;
    chosen.forEach((c, i) => {
      if (counts[i] > 0) segments.push({ dest, area: c.area, days: counts[i], pool: c.pool });
    });
  });
  return segments;
}

function pickSights(pool: Scored[], used: Set<string>, destId: string, n: number): Attraction[] {
  const key = (a: Attraction) => `${destId}:${a.id}`;
  const avail = pool.filter((p) => !used.has(key(p.a)));
  if (!avail.length || n <= 0) return [];
  const picked: Scored[] = [];
  if (n >= 2) {
    const ev = avail.find((p) => p.a.evening);
    if (ev) picked.push(ev);
  }
  while (picked.length < n) {
    const anchor = picked.find((p) => !p.a.evening) ?? picked[0];
    let best: Scored | undefined;
    let bestScore = -Infinity;
    for (const p of avail) {
      if (picked.includes(p)) continue;
      if (p.a.evening && picked.some((x) => x.a.evening)) continue;
      let s = p.score;
      if (anchor) s -= Math.abs(p.a.km - anchor.a.km) / 25;
      if (p.a.hours >= 5 && picked.length > 0) s -= 3;
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
    if (!best) break;
    picked.push(best);
  }
  // do not overload the day
  let total = picked.reduce((s, p) => s + p.a.hours, 0);
  while (total > 9.5 && picked.length > 1) {
    let drop = 0;
    for (let i = 1; i < picked.length; i++) if (picked[i].score < picked[drop].score) drop = i;
    total -= picked[drop].a.hours;
    picked.splice(drop, 1);
  }
  picked.forEach((p) => used.add(key(p.a)));
  return picked.map((p) => p.a);
}

export const sightSlot = (a: Attraction, period: Slot['period'], dayNo: number, idx: number): Slot => ({
  id: `d${dayNo}-s${idx}-${a.id}`,
  period,
  kind: 'sight',
  time: '',
  title: a.name,
  desc: `${a.desc} Best time: ${a.bestTime.toLowerCase()}.`,
  attractionId: a.id,
  durationH: a.hours,
  feePP: a.fee,
  travelKm: 0,
  travelMin: 0,
  mode: '',
  kinds: a.kinds,
});

const REST_IDEAS = [
  'Slow down: late brunch, a swim or a spa treatment at your stay.',
  'Free time to recharge — read, nap or stroll nearby at your own pace.',
  'Unscheduled window: wander the neighbourhood and pick up souvenirs.',
  'Light afternoon: tea, journaling and an easy walk close to your stay.',
];

export function generateItinerary(prefs: Preferences): Itinerary {
  const errors = validatePrefs(prefs);
  if (errors.length) throw new PlanError(errors.join(' '));
  const dests = prefs.destinationIds.map((id) => getDestination(id)).filter((d): d is Destination => !!d);
  if (!dests.length) throw new PlanError('None of the selected destinations are available.');
  const nDays = tripDays(prefs);
  const ctx = makeCtx(prefs);
  const segments = buildSegments(prefs, ctx, dests, nDays);

  const usedSights = new Set<string>();
  const usedMeals = new Set<string>();
  const days: DayPlan[] = [];
  const visitedAreas: { dest: Destination; area: Area }[] = [];
  let prevArea: Area | null = null;
  let prevDest: Destination | null = null;
  let dayNo = 1;
  let leisureCounter = 0;
  const baseSights = SIGHTS_PER_DAY[prefs.pace];

  for (const seg of segments) {
    if (!visitedAreas.some((v) => v.area.id === seg.area.id)) visitedAreas.push({ dest: seg.dest, area: seg.area });
    for (let j = 0; j < seg.days; j++) {
      const isFirst = dayNo === 1;
      const isLast = dayNo === nDays;
      const transferKm = j === 0 && prevArea ? roadKm(prevArea, seg.area) : 0;
      const transferH = transferKm > 0 ? transferKm / HIGHWAY_SPEED + 0.4 : 0;

      let n: number = baseSights;
      if (transferKm > 0) n -= transferH > 5 ? 2 : 1;
      if (isFirst) n -= 1;
      if (isLast && nDays > 1) n -= 1;
      if (nDays === 1) n = Math.max(n, 2);
      n = Math.max(1, n);

      const sights = pickSights(seg.pool, usedSights, seg.dest.id, n);
      const evening = sights.filter((a) => a.evening)[0];
      const regular = sights.filter((a) => a !== evening).sort((x, y) => x.km - y.km);

      const slots: Slot[] = [];
      const relaxedDay = prefs.pace === 'relaxed' || isFirst || isLast || transferKm > 0;

      if (transferKm > 0 && prevArea && prevDest) {
        const crossing = prevDest.id !== seg.dest.id;
        slots.push({
          id: `d${dayNo}-transfer`,
          period: 'morning',
          kind: 'transfer',
          time: '',
          title: `Transfer: ${prevArea.name} → ${seg.area.name}`,
          desc: `${intercityModeLabel(prefs.transport, transferKm)} — about ${transferKm} km, roughly ${durationLabel(transferH)} including stops.${crossing ? ' You are moving between destinations; book tickets early.' : ''}`,
          durationH: Math.round(transferH * 10) / 10,
          feePP: 0,
          travelKm: transferKm,
          travelMin: Math.round(transferH * 60),
          mode: intercityModeLabel(prefs.transport, transferKm),
        });
      }

      const morningCount = regular.length === 1 ? 1 : regular.length === 2 ? 1 : Math.ceil(regular.length / 2);
      regular.slice(0, morningCount).forEach((a, i) => slots.push(sightSlot(a, 'morning', dayNo, i)));

      const lunchR = pickMeal(seg.dest, seg.area, ctx, usedMeals, 'lunch');
      if (lunchR) {
        usedMeals.add(optionId(seg.dest.id, lunchR.id));
        slots.push({
          id: `d${dayNo}-lunch`,
          period: 'afternoon',
          kind: 'meal',
          time: '',
          title: `Lunch — ${lunchR.name}`,
          desc: `${lunchR.cuisine}. Try: ${lunchR.dishes.join(', ')}.`,
          restaurantId: optionId(seg.dest.id, lunchR.id),
          durationH: 1,
          feePP: 0,
          travelKm: 0,
          travelMin: 0,
          mode: '',
        });
      }

      const afternoon = regular.slice(morningCount);
      afternoon.forEach((a, i) => slots.push(sightSlot(a, 'afternoon', dayNo, i + 10)));

      if (!afternoon.length && !evening && transferKm === 0) {
        slots.push({
          id: `d${dayNo}-rest`,
          period: 'afternoon',
          kind: 'rest',
          time: '',
          title: sights.length ? 'Rest & recharge' : `Leisure in ${seg.area.name}`,
          desc: sights.length ? REST_IDEAS[(dayNo + leisureCounter) % REST_IDEAS.length] : seg.area.leisure[leisureCounter++ % seg.area.leisure.length] + '.',
          durationH: 1.5,
          feePP: 0,
          travelKm: 0,
          travelMin: 0,
          mode: '',
        });
      } else if (!sights.length) {
        slots.push({
          id: `d${dayNo}-leisure`,
          period: 'afternoon',
          kind: 'rest',
          time: '',
          title: `Leisure in ${seg.area.name}`,
          desc: seg.area.leisure[leisureCounter++ % seg.area.leisure.length] + '.',
          durationH: 2,
          feePP: 0,
          travelKm: 0,
          travelMin: 0,
          mode: '',
        });
      }

      if (evening) slots.push(sightSlot(evening, 'evening', dayNo, 20));

      const dinnerR = pickMeal(seg.dest, seg.area, ctx, usedMeals, 'dinner');
      if (dinnerR) {
        usedMeals.add(optionId(seg.dest.id, dinnerR.id));
        slots.push({
          id: `d${dayNo}-dinner`,
          period: 'evening',
          kind: 'meal',
          time: '',
          title: `Dinner — ${dinnerR.name}`,
          desc: `${dinnerR.cuisine}. Try: ${dinnerR.dishes.join(', ')}.`,
          restaurantId: optionId(seg.dest.id, dinnerR.id),
          durationH: 1.25,
          feePP: 0,
          travelKm: 0,
          travelMin: 0,
          mode: '',
        });
      }

      // title & theme
      const names = [...regular, ...(evening ? [evening] : [])].map((a) => shortName(a.name));
      const kindCount = new Map<Kind, number>();
      sights.forEach((a) => a.kinds.forEach((k) => kindCount.set(k, (kindCount.get(k) ?? 0) + 1)));
      const topKind = [...kindCount.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
      const theme = topKind ? `${KIND_THEME[topKind] ?? 'Local'} day` : 'Easy day';
      let title: string;
      if (isFirst && names.length) title = `Arrive in ${seg.area.name} · ${names[0]}`;
      else if (isFirst) title = `Arrive in ${seg.area.name}`;
      else if (transferKm > 0 && prevArea) title = `${prevArea.name} → ${seg.area.name}${names[0] ? ` · ${names[0]}` : ''}`;
      else if (isLast && names.length) title = `${names[0]} & a slow farewell`;
      else if (names.length >= 2) title = `${theme}: ${names[0]} & ${names[1]}`;
      else if (names.length === 1) title = `${theme}: ${names[0]}`;
      else title = `Easy day in ${seg.area.name}`;

      const day: DayPlan = {
        day: dayNo,
        date: addDays(prefs.startDate, dayNo - 1),
        destinationId: seg.dest.id,
        areaId: seg.area.id,
        areaName: seg.area.name,
        title,
        theme,
        relaxed: relaxedDay,
        slots,
        tips: [],
        transferKm,
      };
      day.tips = buildTips(day, seg.dest, prefs, ctx, sights, { isFirst, isLast });
      days.push(scheduleDay(day, prefs));

      prevArea = seg.area;
      prevDest = seg.dest;
      dayNo++;
    }
  }

  // restaurants (all suitable curated options for visited areas)
  const restaurants: RestaurantOption[] = [];
  for (const { dest, area } of visitedAreas) {
    dest.restaurants
      .filter((r) => r.areaId === area.id && restaurantAllowed(r, ctx))
      .forEach((r) => restaurants.push(toRestaurantOption(dest.id, r, area, prefs)));
  }

  // stays
  const stays: StayOption[] = [];
  const stayChoice: Record<string, string> = {};
  for (const { dest, area } of visitedAreas) {
    const sightKms = days
      .filter((d) => d.areaId === area.id)
      .flatMap((d) => d.slots)
      .filter((s) => s.kind === 'sight' && s.attractionId)
      .map((s) => getAttraction(dest.id, s.attractionId as string)?.km ?? 0);
    const avgKm = sightKms.length ? sightKms.reduce((a, b) => a + b, 0) / sightKms.length : 3;
    const options = buildDemoStays({ prefs, dest, areaId: area.id, areaName: area.name, avgSightKm: avgKm });
    stays.push(...options);
    const pick = options.find((o) => o.withinNightlyBudget) ?? options[0];
    if (pick) stayChoice[area.id] = pick.id;
  }

  const it: Itinerary = {
    id: uid('trip'),
    createdAt: new Date().toISOString(),
    destinations: dests.map((d) => ({ id: d.id, name: d.name })),
    startDate: prefs.startDate,
    endDate: prefs.endDate,
    nights: Math.max(0, nDays - 1),
    travellers: ctx.T,
    days,
    stays,
    stayChoice,
    restaurants,
    budget: { lines: [], total: 0, budget: 0, remaining: 0, perPerson: 0, perDay: 0, over: false, suggestions: [] },
    overview: buildOverview(prefs, dests, nDays, ctx.T),
    adjustments: { foodFactor: 1, activityFactor: 1 },
    source: { itinerary: 'demo', places: 'demo', warnings: [] },
  };
  it.budget = computeBudget(it, prefs);
  return it;
}

// ───────────────────────── tips & overview ─────────────────────────

function buildTips(
  day: DayPlan,
  dest: Destination,
  prefs: Preferences,
  ctx: Ctx,
  sights: Attraction[],
  flags: { isFirst: boolean; isLast: boolean },
): string[] {
  const tips: string[] = [];
  if (flags.isFirst && !dest.bestMonths.includes(monthOf(prefs.startDate))) tips.push(`Season note: ${dest.offSeasonNote}`);
  if (flags.isFirst && prefs.occasion.trim()) tips.push(`Special occasion (${prefs.occasion.trim()}): ask your stay in advance about a small surprise or a better room.`);
  if (flags.isLast) tips.push('Keep a three-hour buffer before any departure and settle your bill the evening before.');

  const pool: string[] = [];
  pool.push(dest.tips[(day.day - 1) % dest.tips.length]);
  if (sights[0]) pool.push(`${shortName(sights[0].name)}: best ${sights[0].bestTime.toLowerCase()}.`);
  if (prefs.earlyStart === 'early') pool.push('Early start planned — sights are cooler and quieter before 10 am.');
  if (prefs.earlyStart === 'late') pool.push('Late start planned — the day begins after a relaxed breakfast, so evenings carry the main sights.');
  if (prefs.children > 0) pool.push('With children: keep water and snacks handy and take a rest break after each major sight.');
  if (ctx.limited) pool.push('Walking is kept to easy stretches — ask your driver to park close to entrances.');
  if (ctx.noAlcohol && day.slots.some((s) => s.period === 'evening')) pool.push('Evenings use cafés, markets and cultural shows rather than bars, as you asked.');
  if (prefs.allergies.trim()) pool.push(`Mention “${prefs.allergies.trim()}” to every restaurant before ordering.`);
  if (ctx.vegDiet) pool.push('Meals are chosen from vegetarian-friendly kitchens; confirm ingredients for any broth or ghee.');
  if (prefs.transport === 'public') pool.push('Check bus and train timings the evening before — IRCTC and state bus apps are the most reliable.');
  if (prefs.transport === 'own') pool.push('Keep your FASTag topped up and fuel above a quarter tank on hill or desert roads.');
  if (prefs.transport === 'bike') pool.push('Carry your licence and RC, wear a helmet and avoid riding after dark on ghat roads.');
  if (prefs.guided === 'guided') pool.push('Book a licensed local guide for the main sight of the day — it adds context and saves time at entrances.');
  if (prefs.interests.includes('photography')) pool.push('For photos, aim for the first and last hour of daylight.');
  if (prefs.notes.trim() && day.day === 1) pool.push(`Your note: “${prefs.notes.trim()}” — share it with your host or driver.`);
  if (day.transferKm > 0) pool.push('On transfer days, leave early and plan a proper lunch stop on the way.');

  // rotate through the pool by day number so consecutive days read differently
  for (let k = 0; tips.length < 3 && k < pool.length * 2; k++) {
    const t = pool[(k + day.day) % pool.length];
    if (t && !tips.includes(t)) tips.push(t);
  }
  return tips.slice(0, 4);
}

const TIER_LABEL = { budget: 'Budget', standard: 'Standard', premium: 'Premium', luxury: 'Luxury' } as const;
const TRANSPORT_LABEL: Record<Preferences['transport'], string> = {
  own: 'Own vehicle',
  rental: 'Rental car',
  public: 'Public transport',
  cab: 'Cab / taxi',
  bike: 'Bike rental',
  mix: 'Mix of transport',
};
const STAY_LABEL: Record<Preferences['stayType'], string> = {
  any: 'No preference',
  hotel: 'Hotel',
  hostel: 'Hostel',
  resort: 'Resort',
  homestay: 'Homestay',
  boutique: 'Boutique stay',
};
const DIET_LABEL: Record<Preferences['diet'], string> = {
  none: 'No restrictions',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  eggetarian: 'Eggetarian',
  'non-vegetarian': 'Non-vegetarian',
};

function buildOverview(prefs: Preferences, dests: Destination[], nDays: number, T: number): Itinerary['overview'] {
  const pace = { relaxed: 'Relaxed pace', balanced: 'Balanced pace', packed: 'Packed schedule' }[prefs.pace];
  const disc = { hidden: 'hidden gems', famous: 'famous highlights', mix: 'highlights & hidden gems' }[prefs.discovery];
  const group = { solo: 'Solo', couple: 'Couple', friends: 'Friends', family: 'Family' }[prefs.groupType];
  const names = dests.map((d) => d.name).join(' & ');
  const alc = prefs.alcohol === 'yes' ? '' : ' with no alcohol-centred plans';
  return {
    style: `${group} · ${pace} · ${disc}`,
    stayPref: `${STAY_LABEL[prefs.stayType]} · ${prefs.room === 'shared' ? 'shared' : 'private'} room · ${TIER_LABEL[prefs.tier]}`,
    foodPref: `${DIET_LABEL[prefs.diet]}${prefs.alcohol === 'yes' ? '' : ' · alcohol-free'}`,
    transportPref: TRANSPORT_LABEL[prefs.transport],
    summary: `${nDays} day${nDays > 1 ? 's' : ''} in ${names} for ${T} traveller${T > 1 ? 's' : ''}, planned as a ${pace.toLowerCase()} trip around ${prefs.interests.slice(0, 3).join(', ') || 'local highlights'}${alc}.`,
  };
}

// ───────────────────────── helpers for UI / assistant ─────────────────────────

export const selectedStays = (it: Itinerary): StayOption[] =>
  Object.keys(it.stayChoice)
    .map((areaId) => selectedStay(it, areaId))
    .filter((s): s is StayOption => !!s);

export const nightsInArea = (it: Itinerary, areaId: string): number =>
  it.days.filter((d, i) => d.areaId === areaId && i < it.days.length - 1).length;

export const stayTotalFor = (it: Itinerary, prefs: Preferences, stay: StayOption): number =>
  nightlyCost(stay, prefs) * Math.max(1, nightsInArea(it, stay.areaId));

export const dayLabel = (d: DayPlan): string => `Day ${d.day} · ${prettyDate(d.date)}`;

export { getArea };
