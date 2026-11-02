import type { Preferences } from '@/types';
import { DEFAULT_PREFS } from './defaults';
import { destinations } from './data/destinations';
import { clamp } from './utils';

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const str = (v: unknown, max = 400): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, fallback: number, lo: number, hi: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? clamp(n, lo, hi) : fallback;
};
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const date = (v: unknown): string => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

export const KINDS = ['adventure', 'trekking', 'beaches', 'nature', 'photography', 'shopping', 'heritage', 'temples', 'nightlife', 'relaxation', 'water', 'wildlife', 'food', 'culture'] as const;
const FOOD_STYLES = ['local', 'street', 'fine', 'cafes', 'traditional'] as const;
const FACILITIES = ['Wi-Fi', 'Swimming pool', 'Parking', 'Breakfast', 'Air conditioning', 'Pet friendly', 'Family friendly'];

/** Coerces untrusted JSON into a valid Preferences object (never throws). */
export function sanitizePrefs(input: unknown): Preferences {
  const p = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_PREFS;
  const validIds = new Set(destinations.map((x) => x.id));
  const ids = Array.isArray(p.destinationIds) ? p.destinationIds.filter((x): x is string => typeof x === 'string' && validIds.has(x)) : [];
  const interests = Array.isArray(p.interests) ? p.interests.filter((x): x is Preferences['interests'][number] => (KINDS as readonly string[]).includes(x as string)) : d.interests;
  const foodInterests = Array.isArray(p.foodInterests) ? p.foodInterests.filter((x): x is Preferences['foodInterests'][number] => (FOOD_STYLES as readonly string[]).includes(x as string)) : d.foodInterests;
  const facilities = Array.isArray(p.facilities) ? p.facilities.filter((x): x is string => typeof x === 'string' && FACILITIES.includes(x)) : [];
  const rating = Number(p.minRating);
  return {
    origin: str(p.origin, 80),
    destinationIds: [...new Set(ids)].slice(0, 4),
    startDate: date(p.startDate),
    endDate: date(p.endDate),
    groupType: pick(p.groupType, ['solo', 'couple', 'friends', 'family'], d.groupType),
    adults: Math.round(num(p.adults, d.adults, 1, 20)),
    children: Math.round(num(p.children, 0, 0, 12)),
    budgetTotal: num(p.budgetTotal, d.budgetTotal, 1, 50_000_000),
    budgetScope: pick(p.budgetScope, ['group', 'person'], d.budgetScope),
    tier: pick(p.tier, ['budget', 'standard', 'premium', 'luxury'], d.tier),
    alcohol: pick(p.alcohol, ['yes', 'no', 'avoid'], d.alcohol),
    diet: pick(p.diet, ['vegetarian', 'vegan', 'eggetarian', 'non-vegetarian', 'none'], d.diet),
    allergies: str(p.allergies, 200),
    foodInterests,
    transport: pick(p.transport, ['own', 'rental', 'public', 'cab', 'bike', 'mix'], d.transport),
    hasVehicle: bool(p.hasVehicle, d.hasVehicle),
    longDrives: bool(p.longDrives, d.longDrives),
    stayType: pick(p.stayType, ['hotel', 'hostel', 'resort', 'homestay', 'boutique', 'any'], d.stayType),
    room: pick(p.room, ['private', 'shared'], d.room),
    nightlyBudget: num(p.nightlyBudget, 0, 0, 1_000_000),
    minRating: (rating === 4.2 || rating === 4.5 ? rating : 4) as Preferences['minRating'],
    facilities,
    interests,
    pace: pick(p.pace, ['relaxed', 'balanced', 'packed'], d.pace),
    earlyStart: pick(p.earlyStart, ['early', 'late', 'flexible'], d.earlyStart),
    discovery: pick(p.discovery, ['hidden', 'famous', 'mix'], d.discovery),
    walking: pick(p.walking, ['low', 'moderate', 'high'], d.walking),
    guided: pick(p.guided, ['guided', 'independent', 'mix'], d.guided),
    accessibility: str(p.accessibility, 300),
    seniors: bool(p.seniors, false),
    medical: str(p.medical, 300),
    occasion: str(p.occasion, 120),
    notes: str(p.notes, 600),
  };
}
