import type { BudgetTier, Destination, Preferences, StayOption, StayType } from '@/types';
import { headcountFees, isMobilityLimited, roomsNeeded, tierIndex, travellerCount } from './defaults';
import { optionId } from './lookup';
import { mapsSearchUrl } from './utils';

type Kind = Exclude<StayType, 'any'>;

const TIER_BASE: Record<BudgetTier, number> = { budget: 1400, standard: 3200, premium: 7000, luxury: 15000 };

const TYPE_LABEL: Record<Kind, string> = {
  hotel: 'hotel',
  hostel: 'hostel',
  resort: 'resort',
  homestay: 'homestay',
  boutique: 'boutique stay',
};

const TIER_WORD: Record<BudgetTier, string> = {
  budget: 'budget',
  standard: 'mid-range',
  premium: 'upscale',
  luxury: 'luxury',
};

interface Archetype {
  type: Kind;
  tier: BudgetTier;
  mult: number;
  rooms: string[];
  facilities: string[];
}

const ARCHETYPES: Archetype[] = [
  { type: 'hostel', tier: 'budget', mult: 0.4, rooms: ['Dorm bed (shared)', 'Small private room'], facilities: ['Wi-Fi'] },
  { type: 'homestay', tier: 'budget', mult: 0.9, rooms: ['Double room', 'Family room'], facilities: ['Wi-Fi', 'Breakfast', 'Family friendly', 'Parking'] },
  { type: 'homestay', tier: 'standard', mult: 1.0, rooms: ['Double room', 'Family room'], facilities: ['Wi-Fi', 'Breakfast', 'Air conditioning', 'Family friendly', 'Parking'] },
  { type: 'hotel', tier: 'standard', mult: 1.05, rooms: ['Standard double', 'Twin room'], facilities: ['Wi-Fi', 'Air conditioning', 'Breakfast', 'Parking'] },
  { type: 'hotel', tier: 'premium', mult: 1.0, rooms: ['Deluxe room', 'Club room'], facilities: ['Wi-Fi', 'Air conditioning', 'Breakfast', 'Parking', 'Swimming pool', 'Family friendly'] },
  { type: 'boutique', tier: 'premium', mult: 1.1, rooms: ['Heritage room', 'Suite'], facilities: ['Wi-Fi', 'Air conditioning', 'Breakfast'] },
  { type: 'resort', tier: 'premium', mult: 1.15, rooms: ['Garden-view room', 'Villa'], facilities: ['Wi-Fi', 'Air conditioning', 'Breakfast', 'Swimming pool', 'Parking', 'Family friendly'] },
  { type: 'boutique', tier: 'luxury', mult: 1.0, rooms: ['Signature suite', 'Heritage suite'], facilities: ['Wi-Fi', 'Air conditioning', 'Breakfast', 'Swimming pool'] },
  { type: 'resort', tier: 'luxury', mult: 1.2, rooms: ['Premium villa', 'Pool villa'], facilities: ['Wi-Fi', 'Air conditioning', 'Breakfast', 'Swimming pool', 'Parking', 'Family friendly'] },
  { type: 'hotel', tier: 'luxury', mult: 1.1, rooms: ['Executive suite', 'Presidential suite'], facilities: ['Wi-Fi', 'Air conditioning', 'Breakfast', 'Swimming pool', 'Parking', 'Family friendly'] },
];

const round100 = (n: number) => Math.max(300, Math.round(n / 100) * 100);

/** Total cost of a night for the whole party for a given stay. */
export const nightlyCost = (stay: Pick<StayOption, 'type' | 'pricePerNight'>, prefs: Preferences): number => {
  if (stay.type === 'hostel') return stay.pricePerNight * travellerCount(prefs);
  return stay.pricePerNight * roomsNeeded(prefs);
};

export interface StayContext {
  prefs: Preferences;
  dest: Destination;
  areaId: string;
  areaName: string;
  avgSightKm: number;
}

/**
 * Builds up to four stay *archetypes* for an area. These are NOT real businesses:
 * they are clearly labelled samples with estimated prices and no ratings.
 * When Google Places is configured they are replaced with live, verified listings.
 */
export function buildDemoStays(ctx: StayContext): StayOption[] {
  const { prefs, dest, areaId, areaName, avgSightKm } = ctx;
  const pref = tierIndex(prefs.tier);
  const limited = isMobilityLimited(prefs);
  const kids = prefs.children > 0;

  const scored = ARCHETYPES.map((a, i) => {
    const price = round100(TIER_BASE[a.tier] * a.mult * dest.priceIndex * (areaId.includes('north') || areaId === 'mumbai' ? 1.08 : 1));
    const cost = nightlyCost({ type: a.type, pricePerNight: price }, prefs);
    const within = prefs.nightlyBudget <= 0 || cost <= prefs.nightlyBudget * 1.1;
    const missing = prefs.facilities.filter((f) => !a.facilities.includes(f));
    let score = -Math.abs(tierIndex(a.tier) - pref) * 2.2;
    if (prefs.stayType !== 'any') score += a.type === prefs.stayType ? 3 : -1;
    if (prefs.room === 'shared') score += a.type === 'hostel' ? 3 : -0.5;
    else if (a.type === 'hostel') score -= 1.5;
    score += (prefs.facilities.length - missing.length) * 0.6 - missing.length * 0.8;
    score += within ? 2 : -3;
    if (kids && a.facilities.includes('Family friendly')) score += 1.2;
    if (limited && (a.type === 'resort' || a.type === 'hotel')) score += 0.6;
    if (prefs.occasion && (a.type === 'boutique' || a.type === 'resort')) score += 0.5;
    return { a, i, price, cost, within, missing, score };
  })
    .sort((x, y) => y.score - x.score)
    .slice(0, 4);

  return scored.map(({ a, i, price, cost, within, missing }) => {
    const reasons: string[] = [];
    reasons.push(`Fits your ${prefs.tier} travel tier`);
    if (prefs.stayType !== 'any' && a.type === prefs.stayType) reasons.push(`it is the ${TYPE_LABEL[a.type]} style you asked for`);
    if (prefs.nightlyBudget > 0) {
      reasons.push(within ? 'estimated nightly cost is within your cap' : `estimated nightly cost is about ₹${Math.round(cost - prefs.nightlyBudget).toLocaleString('en-IN')} over your cap — shown for comparison`);
    }
    if (kids && a.facilities.includes('Family friendly')) reasons.push('typically suits families');
    if (missing.length) reasons.push(`may not offer: ${missing.join(', ')}`);
    return {
      id: optionId(dest.id, `stay-${areaId}-${i}`),
      areaId,
      areaName,
      name: `Sample ${TIER_WORD[a.tier]} ${TYPE_LABEL[a.type]} · ${areaName}`,
      type: a.type,
      tier: a.tier,
      rating: null,
      reviewCount: null,
      verified: false,
      source: 'demo',
      address: areaName,
      pricePerNight: price,
      priceRange: [Math.round(price * 0.8 / 100) * 100, Math.round(price * 1.25 / 100) * 100],
      priceEstimated: true,
      facilities: a.facilities,
      missingFacilities: missing,
      rooms: a.rooms,
      checkIn: '12:00 PM (typical)',
      checkOut: '11:00 AM (typical)',
      bookingUrl: mapsSearchUrl(`${TYPE_LABEL[a.type]} in ${areaName}`),
      mapsUrl: mapsSearchUrl(`${TYPE_LABEL[a.type]} in ${areaName}`),
      why: reasons.join('; ') + '.',
      distanceNote: `Planned sights are about ${Math.max(1, Math.round(avgSightKm))} km from a central base in ${areaName}.`,
      withinNightlyBudget: within,
    } satisfies StayOption;
  });
}

/** For the family/pet/etc. facility labels shown in the UI. */
export const FACILITY_OPTIONS = ['Wi-Fi', 'Swimming pool', 'Parking', 'Breakfast', 'Air conditioning', 'Pet friendly', 'Family friendly'];
export const headFees = headcountFees;

/** Rough nightly price for one room (INR) used when a live listing has no confirmed price. Always shown as “estimated”. */
export const estimateNightly = (tier: BudgetTier, priceIndex: number, type: Exclude<StayType, 'any'> = 'hotel'): number => {
  const mult = type === 'hostel' ? 0.4 : type === 'homestay' ? 0.95 : type === 'resort' ? 1.15 : type === 'boutique' ? 1.1 : 1;
  return round100(TIER_BASE[tier] * mult * priceIndex);
};
