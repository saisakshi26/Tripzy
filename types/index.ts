// ───────────────────────── Shared domain types ─────────────────────────

export type Kind =
  | 'adventure'
  | 'trekking'
  | 'beaches'
  | 'nature'
  | 'photography'
  | 'shopping'
  | 'heritage'
  | 'temples'
  | 'nightlife'
  | 'relaxation'
  | 'water'
  | 'wildlife'
  | 'food'
  | 'culture';

export type BudgetTier = 'budget' | 'standard' | 'premium' | 'luxury';
export type Diet = 'vegetarian' | 'vegan' | 'eggetarian' | 'non-vegetarian' | 'none';
export type Alcohol = 'yes' | 'no' | 'avoid';
export type TransportMode = 'own' | 'rental' | 'public' | 'cab' | 'bike' | 'mix';
export type StayType = 'hotel' | 'hostel' | 'resort' | 'homestay' | 'boutique' | 'any';
export type GroupType = 'solo' | 'couple' | 'friends' | 'family';
export type Pace = 'relaxed' | 'balanced' | 'packed';
export type FoodStyle = 'local' | 'street' | 'fine' | 'cafes' | 'traditional';
export type FilterTag =
  | 'Budget'
  | 'Nature'
  | 'Adventure'
  | 'Beaches'
  | 'Heritage'
  | 'Food'
  | 'Romantic'
  | 'Nightlife';

export interface Preferences {
  // A. basics
  origin: string;
  destinationIds: string[];
  startDate: string;
  endDate: string;
  groupType: GroupType;
  adults: number;
  children: number;
  // B. budget
  budgetTotal: number;
  budgetScope: 'group' | 'person';
  tier: BudgetTier;
  // C. food
  alcohol: Alcohol;
  diet: Diet;
  allergies: string;
  foodInterests: FoodStyle[];
  // D. transport
  transport: TransportMode;
  hasVehicle: boolean;
  longDrives: boolean;
  // E. stay
  stayType: StayType;
  room: 'private' | 'shared';
  nightlyBudget: number; // 0 = no cap
  minRating: 4 | 4.2 | 4.5;
  facilities: string[];
  // F. interests
  interests: Kind[];
  // G. personality
  pace: Pace;
  earlyStart: 'early' | 'late' | 'flexible';
  discovery: 'hidden' | 'famous' | 'mix';
  walking: 'low' | 'moderate' | 'high';
  guided: 'guided' | 'independent' | 'mix';
  // H. accessibility
  accessibility: string;
  seniors: boolean;
  medical: string;
  occasion: string;
  notes: string;
}

// ───────────────────────── Curated content ─────────────────────────

export interface Area {
  id: string;
  name: string;
  lat: number;
  lng: number;
  blurb: string;
  /** zero-cost things to do when curated attractions run out (keeps days varied) */
  leisure: string[];
}

export interface Attraction {
  id: string;
  name: string;
  areaId: string;
  kinds: Kind[];
  hours: number;
  /** approximate entry/activity cost per adult in INR (0 = free) */
  fee: number;
  /** approximate distance (km) from the area centre */
  km: number;
  walk: 1 | 2 | 3;
  famous: boolean;
  bestTime: string;
  desc: string;
  alcohol?: boolean;
  evening?: boolean;
}

export interface RestaurantData {
  id: string;
  name: string;
  areaId: string;
  cuisine: string;
  diet: 'veg' | 'both' | 'nonveg';
  /** approximate cost per person in INR */
  avgPP: number;
  dishes: string[];
  styles: FoodStyle[];
  alcoholCentred?: boolean;
  /** true = a type of place (not one specific named venue) */
  generic?: boolean;
  hours?: string;
}

export interface Destination {
  id: string;
  name: string;
  short: string;
  tagline: string;
  image: string;
  imageQuery: string;
  tags: FilterTag[];
  /** per person per day in INR, [low, high] */
  dailyBudget: [number, number];
  bestSeason: string;
  bestMonths: number[];
  offSeasonNote: string;
  experiences: string[];
  popular: string[];
  overview: string;
  food: string[];
  suggestedDays: string;
  tips: string[];
  expenses: { label: string; value: string }[];
  /** relative price level (1 = India average) */
  priceIndex: number;
  areas: Area[];
  attractions: Attraction[];
  restaurants: RestaurantData[];
}

// ───────────────────────── Generated trip ─────────────────────────

export type SlotKind = 'sight' | 'meal' | 'transfer' | 'rest';
export type Period = 'morning' | 'afternoon' | 'evening';

export interface Slot {
  id: string;
  period: Period;
  kind: SlotKind;
  time: string;
  title: string;
  desc: string;
  attractionId?: string;
  restaurantId?: string;
  durationH: number;
  /** per adult, INR */
  feePP: number;
  /** extra paid-activity premium per adult (guides, jeeps, boats) — already part of feePP for attractions */
  travelKm: number;
  travelMin: number;
  mode: string;
  kinds?: Kind[];
}

export interface DayPlan {
  day: number;
  date: string;
  destinationId: string;
  areaId: string;
  areaName: string;
  title: string;
  theme: string;
  relaxed: boolean;
  slots: Slot[];
  tips: string[];
  /** km travelled between areas at the start of the day (0 = none) */
  transferKm: number;
  narrative?: { morning?: string; afternoon?: string; evening?: string };
}

export interface StayOption {
  id: string;
  areaId: string;
  areaName: string;
  name: string;
  type: Exclude<StayType, 'any'>;
  tier: BudgetTier;
  rating: number | null;
  reviewCount: number | null;
  verified: boolean;
  source: 'google-places' | 'demo';
  address: string;
  photo?: string;
  pricePerNight: number;
  priceRange: [number, number];
  priceEstimated: boolean;
  facilities: string[];
  missingFacilities: string[];
  rooms: string[];
  checkIn: string;
  checkOut: string;
  bookingUrl: string;
  mapsUrl: string;
  why: string;
  distanceNote: string;
  withinNightlyBudget: boolean;
}

export interface RestaurantOption {
  id: string;
  areaId: string;
  areaName: string;
  name: string;
  cuisine: string;
  diet: 'veg' | 'both' | 'nonveg';
  rating: number | null;
  reviewCount: number | null;
  verified: boolean;
  source: 'google-places' | 'demo';
  generic: boolean;
  address: string;
  photo?: string;
  avgPP: number;
  priceEstimated: boolean;
  dishes: string[];
  hours: string;
  mapsUrl: string;
  why: string;
  distanceNote: string;
  vegNote: string;
  alcoholCentred: boolean;
}

export interface BudgetLine {
  key: string;
  label: string;
  amount: number;
}

export interface BudgetBreakdown {
  lines: BudgetLine[];
  total: number;
  budget: number;
  remaining: number;
  perPerson: number;
  perDay: number;
  over: boolean;
  suggestions: string[];
}

export interface Itinerary {
  id: string;
  createdAt: string;
  destinations: { id: string; name: string }[];
  startDate: string;
  endDate: string;
  nights: number;
  travellers: number;
  days: DayPlan[];
  stays: StayOption[];
  /** chosen stay per area id */
  stayChoice: Record<string, string>;
  restaurants: RestaurantOption[];
  budget: BudgetBreakdown;
  overview: {
    style: string;
    stayPref: string;
    foodPref: string;
    transportPref: string;
    summary: string;
  };
  adjustments: { foodFactor: number; activityFactor: number };
  source: {
    itinerary: 'demo' | 'gemini';
    places: 'demo' | 'google-places';
    warnings: string[];
  };
}

export interface SavedTrip {
  id: string;
  savedAt: string;
  title: string;
  prefs: Preferences;
  itinerary: Itinerary;
}

// ───────────────────────── Assistant ─────────────────────────

export type AssistantIntent =
  | { type: 'replace_hotel'; areaId?: string }
  | { type: 'cheaper_restaurants' }
  | { type: 'add_activity'; kind: Kind }
  | { type: 'relax_day'; day: number }
  | { type: 'veg_restaurants' }
  | { type: 'reduce_budget'; percent: number }
  | { type: 'alternative_attraction'; query: string }
  | { type: 'unknown' };

export interface AssistantResult {
  itinerary: Itinerary;
  reply: string;
  intent: AssistantIntent;
  changed: boolean;
  usedAI: boolean;
}
