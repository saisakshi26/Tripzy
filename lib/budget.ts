import type { BudgetBreakdown, BudgetTier, Itinerary, Preferences, StayOption } from '@/types';
import { headcountFees, headcountFood, tierIndex, totalBudgetOf, travellerCount } from './defaults';
import { getDestination } from './data/destinations';
import { nightlyCost } from './stays';
import { inr } from './utils';

const BREAKFAST: Record<BudgetTier, number> = { budget: 100, standard: 180, premium: 320, luxury: 600 };
const MEAL_FALLBACK: Record<BudgetTier, number> = { budget: 220, standard: 420, premium: 900, luxury: 1800 };
const SHOPPING: Record<BudgetTier, number> = { budget: 120, standard: 250, premium: 500, luxury: 1000 };
const ARRIVAL_PP: Record<BudgetTier, number> = { budget: 3000, standard: 4500, premium: 7000, luxury: 12000 };

const round10 = (n: number) => Math.round(n / 10) * 10;

export function localTransportCost(prefs: Preferences, km: number, tierIdx: number): number {
  const T = travellerCount(prefs);
  const bikes = Math.ceil(T / 2);
  const dayKm = km + 10;
  const publicCost = T * Math.max(120, dayKm * 4);
  const cabCost = Math.max(1500 + tierIdx * 400, dayKm * 18);
  switch (prefs.transport) {
    case 'own':
      return dayKm * 7 + 150;
    case 'rental':
      return 2200 + dayKm * 7;
    case 'cab':
      return cabCost;
    case 'public':
      return publicCost;
    case 'bike':
      return bikes * (600 + dayKm * 3);
    default:
      return 0.5 * publicCost + 0.5 * cabCost;
  }
}

export function intercityCost(prefs: Preferences, km: number): number {
  const T = travellerCount(prefs);
  const bikes = Math.ceil(T / 2);
  const publicCost = km > 700 ? T * (3500 + km * 2) : T * km * (km <= 350 ? 1.6 : 2);
  switch (prefs.transport) {
    case 'own':
    case 'rental':
      return km * 7 + (km > 300 ? 300 : 0);
    case 'cab':
      return km * 16;
    case 'public':
      return publicCost;
    case 'bike':
      return km * 3 * bikes;
    default:
      return km >= 150 ? publicCost : km * 16;
  }
}

export const selectedStay = (it: Itinerary, areaId: string): StayOption | undefined => {
  const id = it.stayChoice[areaId];
  return it.stays.find((s) => s.id === id) ?? it.stays.find((s) => s.areaId === areaId);
};

export function computeBudget(it: Itinerary, prefs: Preferences): BudgetBreakdown {
  const T = travellerCount(prefs);
  const ti = tierIndex(prefs.tier);
  const dayCount = Math.max(1, it.days.length);
  const feeHeads = headcountFees(prefs);
  const foodHeads = headcountFood(prefs);
  const priceIdx = getDestination(it.destinations[0]?.id ?? '')?.priceIndex ?? 1;

  // accommodation: a night is spent in the area of every day except the last
  let accommodation = 0;
  it.days.forEach((d, i) => {
    if (i >= it.days.length - 1) return;
    const stay = selectedStay(it, d.areaId);
    if (stay) accommodation += nightlyCost(stay, prefs);
  });

  // food
  let food = 0;
  for (const d of it.days) {
    food += BREAKFAST[prefs.tier] * T * priceIdx;
    const meals = d.slots.filter((s) => s.kind === 'meal');
    if (!meals.length) {
      food += MEAL_FALLBACK[prefs.tier] * 2 * foodHeads;
      continue;
    }
    for (const m of meals) {
      const r = it.restaurants.find((x) => x.id === m.restaurantId);
      food += (r ? r.avgPP : MEAL_FALLBACK[prefs.tier]) * foodHeads;
    }
  }
  food *= it.adjustments.foodFactor;

  // local transport + intercity
  let local = 0;
  let intercity = 0;
  for (const d of it.days) {
    const km = d.slots.reduce((sum, s) => sum + (s.kind === 'sight' ? s.travelKm : 0), 0);
    local += localTransportCost(prefs, km, ti);
    if (d.transferKm > 0) intercity += intercityCost(prefs, d.transferKm);
  }
  intercity += ARRIVAL_PP[prefs.tier] * T * (it.destinations.length > 1 ? 1.2 : 1);

  // activities & entry fees
  let activities = 0;
  let entry = 0;
  for (const d of it.days) {
    let sightsToday = 0;
    for (const s of d.slots) {
      if (s.kind !== 'sight') continue;
      sightsToday++;
      const isActivity = (s.kinds ?? []).some((k) => k === 'adventure' || k === 'water' || k === 'wildlife');
      if (isActivity) activities += s.feePP * feeHeads;
      else entry += s.feePP * feeHeads;
    }
    if (sightsToday > 0) {
      if (prefs.guided === 'guided') activities += 600 * (prefs.adults + prefs.children * 0.5);
      else if (prefs.guided === 'mix') activities += 250 * (prefs.adults + prefs.children * 0.5);
    }
  }
  activities *= it.adjustments.activityFactor;
  entry *= it.adjustments.activityFactor;

  const shopping = SHOPPING[prefs.tier] * T * dayCount;
  const subtotal = accommodation + food + local + intercity + activities + entry + shopping;
  const buffer = subtotal * 0.08;

  const lines = [
    { key: 'accommodation', label: 'Accommodation', amount: round10(accommodation) },
    { key: 'food', label: 'Food & drinks', amount: round10(food) },
    { key: 'local', label: 'Local transport', amount: round10(local) },
    { key: 'intercity', label: 'Intercity & arrival travel', amount: round10(intercity) },
    { key: 'activities', label: 'Activities & guides', amount: round10(activities) },
    { key: 'entry', label: 'Entry fees', amount: round10(entry) },
    { key: 'shopping', label: 'Shopping allowance', amount: round10(shopping) },
    { key: 'buffer', label: 'Emergency buffer (8%)', amount: round10(buffer) },
  ];
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const budget = totalBudgetOf(prefs);
  const remaining = budget - total;
  const over = total > budget;

  const suggestions: string[] = [];
  const byKey = (k: string) => lines.find((l) => l.key === k)?.amount ?? 0;
  if (over) {
    suggestions.push(`This plan is about ${inr(total - budget)} over your ${inr(budget)} budget. Ask the assistant to “reduce the total budget” and it will rework stays, meals and optional paid activities.`);
    if (byKey('accommodation') > total * 0.3) suggestions.push(`Accommodation is your largest cost (${inr(byKey('accommodation'))}). Homestays or hostels could save roughly ${inr(byKey('accommodation') * 0.35)}.`);
    if (byKey('food') > total * 0.2) suggestions.push(`Choosing street-food and local eateries could save roughly ${inr(byKey('food') * 0.25)}.`);
    if (byKey('intercity') > total * 0.2) suggestions.push(`Trains and buses between areas could cut intercity travel by roughly ${inr(byKey('intercity') * 0.3)}.`);
    suggestions.push(`Trimming one day would save about ${inr(total / dayCount)}.`);
  } else if (remaining > budget * 0.25) {
    suggestions.push(`You have ${inr(remaining)} of headroom — consider upgrading one stay or adding a signature experience.`);
  }

  return {
    lines,
    total,
    budget,
    remaining,
    perPerson: total / T,
    perDay: total / dayCount,
    over,
    suggestions,
  };
}
