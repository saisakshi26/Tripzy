import type { Preferences } from '@/types';
import { clamp, diffDays } from './utils';

export const DEFAULT_PREFS: Preferences = {
  origin: '',
  destinationIds: [],
  startDate: '',
  endDate: '',
  groupType: 'couple',
  adults: 2,
  children: 0,
  budgetTotal: 80000,
  budgetScope: 'group',
  tier: 'standard',
  alcohol: 'yes',
  diet: 'none',
  allergies: '',
  foodInterests: ['local'],
  transport: 'cab',
  hasVehicle: false,
  longDrives: true,
  stayType: 'any',
  room: 'private',
  nightlyBudget: 0,
  minRating: 4,
  facilities: [],
  interests: ['nature', 'heritage', 'food'],
  pace: 'balanced',
  earlyStart: 'flexible',
  discovery: 'mix',
  walking: 'moderate',
  guided: 'independent',
  accessibility: '',
  seniors: false,
  medical: '',
  occasion: '',
  notes: '',
};

export const TIERS = ['budget', 'standard', 'premium', 'luxury'] as const;
export const tierIndex = (t: Preferences['tier']): number => TIERS.indexOf(t);

export const travellerCount = (p: Preferences): number => Math.max(1, p.adults + p.children);
/** adults count fully, children count at 60 % for food */
export const headcountFood = (p: Preferences): number => p.adults + p.children * 0.6;
/** adults full price, children half for entry fees */
export const headcountFees = (p: Preferences): number => p.adults + p.children * 0.5;

export const totalBudgetOf = (p: Preferences): number =>
  p.budgetScope === 'person' ? p.budgetTotal * travellerCount(p) : p.budgetTotal;

export const roomsNeeded = (p: Preferences): number => Math.max(1, Math.ceil(p.adults / 2));

export const tripDays = (p: Preferences): number => {
  if (!p.startDate || !p.endDate) return 0;
  const d = diffDays(p.startDate, p.endDate) + 1;
  return Number.isFinite(d) ? clamp(d, 0, 21) : 0;
};

export const validatePrefs = (p: Preferences): string[] => {
  const errors: string[] = [];
  if (!p.destinationIds.length) errors.push('Choose at least one destination.');
  if (!p.startDate || !p.endDate) errors.push('Choose your travel dates.');
  else if (diffDays(p.startDate, p.endDate) < 0) errors.push('Your end date is before your start date.');
  else if (diffDays(p.startDate, p.endDate) + 1 > 21) errors.push('Trips longer than 21 days are not supported yet.');
  if (p.adults < 1) errors.push('At least one adult is needed.');
  if (!(p.budgetTotal > 0)) errors.push('Enter a budget greater than zero.');
  return errors;
};

/** Stable key used to detect whether a generated itinerary still matches the answers. */
export const prefsKey = (p: Preferences): string => JSON.stringify(p);

export const isMobilityLimited = (p: Preferences): boolean =>
  p.seniors || p.walking === 'low' || /wheel|mobil|cane|walker|knee|disab|crutch/i.test(`${p.accessibility} ${p.medical}`);

export const usesWheelchair = (p: Preferences): boolean => /wheel/i.test(`${p.accessibility} ${p.medical}`);
