import type { Area, BudgetTier, Destination, Itinerary, Preferences, RestaurantOption, Slot, StayOption, StayType } from '@/types';
import { getDestination } from '../data/destinations';
import { computeBudget } from '../budget';
import { nightlyCost, estimateNightly } from '../stays';
import { optionId } from '../lookup';
import { haversineKm, inr } from '../utils';
import { placesKey } from './env';
import { refreshItinerary } from '../planner';

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  priceRange?: { startPrice?: { units?: string }; endPrice?: { units?: string } };
  googleMapsUri?: string;
  websiteUri?: string;
  photos?: { name?: string }[];
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryTypeDisplayName?: { text?: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  servesVegetarianFood?: boolean;
  goodForChildren?: boolean;
  allowsDogs?: boolean;
  businessStatus?: string;
}

const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.rating', 'places.userRatingCount',
  'places.priceLevel', 'places.priceRange', 'places.googleMapsUri', 'places.websiteUri', 'places.photos',
  'places.location', 'places.types', 'places.primaryTypeDisplayName', 'places.regularOpeningHours',
  'places.servesVegetarianFood', 'places.goodForChildren', 'places.allowsDogs', 'places.businessStatus',
].join(',');

async function searchText(textQuery: string, includedType: string, area: Area, minRating: number): Promise<RawPlace[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': placesKey(), 'X-Goog-FieldMask': FIELDS },
    body: JSON.stringify({
      textQuery,
      includedType,
      strictTypeFiltering: false,
      minRating,
      pageSize: 10,
      languageCode: 'en',
      regionCode: 'IN',
      locationBias: { circle: { center: { latitude: area.lat, longitude: area.lng }, radius: 12000 } },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Places API ${res.status}${body ? `: ${body.slice(0, 160)}` : ''}`);
  }
  const data = (await res.json()) as { places?: RawPlace[] };
  return (data.places ?? []).filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY' && typeof p.rating === 'number');
}

const photoUrl = (p: RawPlace): string | undefined => {
  const name = p.photos?.[0]?.name;
  return name ? `/api/place-photo?name=${encodeURIComponent(name)}` : undefined;
};

const PRICE_TIER: Record<string, BudgetTier> = {
  PRICE_LEVEL_INEXPENSIVE: 'budget',
  PRICE_LEVEL_MODERATE: 'standard',
  PRICE_LEVEL_EXPENSIVE: 'premium',
  PRICE_LEVEL_VERY_EXPENSIVE: 'luxury',
};
const PRICE_MEAL: Record<string, number> = {
  PRICE_LEVEL_FREE: 100,
  PRICE_LEVEL_INEXPENSIVE: 250,
  PRICE_LEVEL_MODERATE: 550,
  PRICE_LEVEL_EXPENSIVE: 1200,
  PRICE_LEVEL_VERY_EXPENSIVE: 2400,
};
const MEAL_BY_TIER: Record<BudgetTier, number> = { budget: 250, standard: 500, premium: 1000, luxury: 1800 };

const stayTypeOf = (p: RawPlace): Exclude<StayType, 'any'> => {
  const t = (p.types ?? []).join(' ') + ' ' + (p.primaryTypeDisplayName?.text ?? '') + ' ' + (p.displayName?.text ?? '');
  if (/hostel|backpacker|dorm/i.test(t)) return 'hostel';
  if (/resort/i.test(t)) return 'resort';
  if (/homestay|home stay|guest_house|bed_and_breakfast|guest house/i.test(t)) return 'homestay';
  if (/boutique|heritage|haveli/i.test(t)) return 'boutique';
  return 'hotel';
};

function toStay(p: RawPlace, dest: Destination, area: Area, prefs: Preferences, avgSightKm: number): StayOption {
  const type = stayTypeOf(p);
  const tier = PRICE_TIER[p.priceLevel ?? ''] ?? prefs.tier;
  const price = estimateNightly(tier, dest.priceIndex, type);
  const cost = nightlyCost({ type, pricePerNight: price }, prefs);
  const within = prefs.nightlyBudget <= 0 || cost <= prefs.nightlyBudget * 1.1;
  const facilities: string[] = [];
  if (p.goodForChildren) facilities.push('Family friendly');
  if (p.allowsDogs) facilities.push('Pet friendly');
  const km = p.location ? Math.round(haversineKm({ lat: p.location.latitude, lng: p.location.longitude }, area) * 10) / 10 : null;
  const why = [
    `Google rating ${p.rating?.toFixed(1)} from ${(p.userRatingCount ?? 0).toLocaleString('en-IN')} reviews`,
    km !== null ? `${km} km from the centre of ${area.name}` : `in ${area.name}`,
    within ? 'estimated price fits your nightly cap' : `estimated price is above your ${inr(prefs.nightlyBudget)} nightly cap — shown for comparison`,
  ];
  return {
    id: optionId(dest.id, `live-${p.id}`),
    areaId: area.id,
    areaName: area.name,
    name: p.displayName?.text ?? 'Unnamed property',
    type,
    tier,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    verified: true,
    source: 'google-places',
    address: p.formattedAddress ?? area.name,
    photo: photoUrl(p),
    pricePerNight: price,
    priceRange: [Math.round((price * 0.8) / 100) * 100, Math.round((price * 1.25) / 100) * 100],
    priceEstimated: true,
    facilities,
    missingFacilities: [],
    rooms: [],
    checkIn: 'See booking page',
    checkOut: 'See booking page',
    bookingUrl: p.websiteUri ?? p.googleMapsUri ?? '',
    mapsUrl: p.googleMapsUri ?? '',
    why: why.join('; ') + '.',
    distanceNote: km !== null ? `${km} km from ${area.name} centre; planned sights average about ${Math.max(1, Math.round(avgSightKm))} km from it.` : `Located in ${area.name}.`,
    withinNightlyBudget: within,
  };
}

function toRestaurant(p: RawPlace, dest: Destination, area: Area, prefs: Preferences): RestaurantOption {
  const types = p.types ?? [];
  const vegOnly = types.includes('vegetarian_restaurant') || types.includes('vegan_restaurant');
  const diet: RestaurantOption['diet'] = vegOnly ? 'veg' : p.servesVegetarianFood === false ? 'nonveg' : 'both';
  const startUnits = Number(p.priceRange?.startPrice?.units);
  const endUnits = Number(p.priceRange?.endPrice?.units);
  const hasRange = Number.isFinite(startUnits) && Number.isFinite(endUnits) && endUnits > 0;
  const avgPP = hasRange ? Math.round((startUnits + endUnits) / 2) : PRICE_MEAL[p.priceLevel ?? ''] ?? MEAL_BY_TIER[prefs.tier];
  const km = p.location ? Math.round(haversineKm({ lat: p.location.latitude, lng: p.location.longitude }, area) * 10) / 10 : null;
  const alcoholCentred = types.some((t) => ['bar', 'night_club', 'pub', 'wine_bar', 'cocktail_bar'].includes(t));
  return {
    id: optionId(dest.id, `live-${p.id}`),
    areaId: area.id,
    areaName: area.name,
    name: p.displayName?.text ?? 'Unnamed restaurant',
    cuisine: p.primaryTypeDisplayName?.text ?? 'Restaurant',
    diet,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    verified: true,
    source: 'google-places',
    generic: false,
    address: p.formattedAddress ?? area.name,
    photo: photoUrl(p),
    avgPP,
    priceEstimated: !hasRange,
    dishes: [],
    hours: p.regularOpeningHours?.weekdayDescriptions?.[0] ?? 'Check opening hours on Google Maps',
    mapsUrl: p.googleMapsUri ?? '',
    why: `Google rating ${p.rating?.toFixed(1)} from ${(p.userRatingCount ?? 0).toLocaleString('en-IN')} reviews${vegOnly ? '; vegetarian kitchen' : ''}${prefs.alcohol !== 'yes' && !alcoholCentred ? '; not built around alcohol' : ''}.`,
    distanceNote: km !== null ? `${km} km from the centre of ${area.name}` : `In ${area.name}`,
    vegNote: vegOnly ? 'Vegetarian kitchen' : p.servesVegetarianFood === true ? 'Serves vegetarian dishes' : p.servesVegetarianFood === false ? 'Vegetarian options not offered' : 'Vegetarian options not confirmed — check the menu',
    alcoholCentred,
  };
}

const unique = <T extends { id: string }>(rows: T[]): T[] => [...new Map(rows.map((r) => [r.id, r])).values()];

export interface LiveResult {
  itinerary: Itinerary;
  warnings: string[];
  used: boolean;
}

/** Replaces the sample stays and restaurants with live Google Places listings (when available per area). */
export async function applyLivePlaces(it: Itinerary, prefs: Preferences): Promise<LiveResult> {
  const warnings: string[] = [];
  const next: Itinerary = JSON.parse(JSON.stringify(it));
  const areaIds = [...new Set(next.days.map((d) => d.areaId))];
  let usedAny = false;
  const vegDiet = prefs.diet === 'vegetarian' || prefs.diet === 'vegan' || prefs.diet === 'eggetarian';
  const typeWord: Record<StayType, string> = { hotel: 'hotels', hostel: 'hostels', resort: 'resorts', homestay: 'homestays', boutique: 'boutique hotels', any: 'hotels' };

  for (const areaId of areaIds) {
    const day = next.days.find((d) => d.areaId === areaId)!;
    const dest = getDestination(day.destinationId);
    const area = dest?.areas.find((a) => a.id === areaId);
    if (!dest || !area) continue;
    const sightKms = next.days.filter((d) => d.areaId === areaId).flatMap((d) => d.slots).filter((s) => s.kind === 'sight' && s.attractionId).map((s) => dest.attractions.find((a) => a.id === s.attractionId)?.km ?? 0);
    const avgKm = sightKms.length ? sightKms.reduce((a, b) => a + b, 0) / sightKms.length : 3;
    try {
      const stayQueries = [
        searchText(`${typeWord[prefs.stayType]} in ${area.name}, ${dest.name}`, 'lodging', area, 4),
        prefs.stayType === 'any' ? searchText(`${prefs.tier === 'budget' ? 'budget hostels and homestays' : prefs.tier === 'luxury' ? 'luxury resorts' : 'boutique hotels'} in ${area.name}, ${dest.name}`, 'lodging', area, 4) : Promise.resolve([] as RawPlace[]),
      ];
      const foodQueries = [
        searchText(`${vegDiet ? 'vegetarian restaurants' : 'best local restaurants'} in ${area.name}, ${dest.name}`, 'restaurant', area, 4),
        searchText(`${prefs.foodInterests.includes('cafes') ? 'cafes' : prefs.foodInterests.includes('street') ? 'street food' : 'popular restaurants'} in ${area.name}, ${dest.name}`, prefs.foodInterests.includes('cafes') ? 'cafe' : 'restaurant', area, 4),
      ];
      const [stayRaw, foodRaw] = await Promise.all([Promise.all(stayQueries), Promise.all(foodQueries)]);
      const stays = unique(stayRaw.flat().map((p) => toStay(p, dest, area, prefs, avgKm)))
        .filter((s) => (prefs.room === 'shared' ? true : s.type !== 'hostel' || prefs.stayType === 'hostel'))
        .sort((a, b) => Number(b.withinNightlyBudget) - Number(a.withinNightlyBudget) || (b.rating ?? 0) * Math.log10((b.reviewCount ?? 1) + 10) - (a.rating ?? 0) * Math.log10((a.reviewCount ?? 1) + 10))
        .slice(0, 6);
      const restaurants = unique(foodRaw.flat().map((p) => toRestaurant(p, dest, area, prefs)))
        .filter((r) => !(prefs.alcohol !== 'yes' && r.alcoholCentred) && !(vegDiet && r.diet === 'nonveg'))
        .sort((a, b) => (b.rating ?? 0) * Math.log10((b.reviewCount ?? 1) + 10) - (a.rating ?? 0) * Math.log10((a.reviewCount ?? 1) + 10))
        .slice(0, 8);

      if (stays.length) {
        next.stays = [...next.stays.filter((s) => s.areaId !== areaId), ...stays];
        next.stayChoice[areaId] = (stays.find((s) => s.withinNightlyBudget) ?? stays[0]).id;
        usedAny = true;
      } else warnings.push(`No live stays found for ${area.name}; showing clearly-labelled sample options.`);

      if (restaurants.length) {
        next.restaurants = [...next.restaurants.filter((r) => r.areaId !== areaId), ...restaurants];
        let rot = 0;
        next.days = next.days.map((d) =>
          d.areaId !== areaId
            ? d
            : {
                ...d,
                slots: d.slots.map((s): Slot => {
                  if (s.kind !== 'meal') return s;
                  const r = restaurants[rot++ % restaurants.length];
                  return { ...s, restaurantId: r.id, title: `${s.period === 'evening' ? 'Dinner' : 'Lunch'} — ${r.name}`, desc: `${r.cuisine}. ${r.vegNote}. Rated ${r.rating?.toFixed(1)} by ${r.reviewCount?.toLocaleString('en-IN')} Google reviewers.` };
                }),
              },
        );
        usedAny = true;
      } else warnings.push(`No live restaurants found for ${area.name}; showing clearly-labelled sample options.`);
    } catch (e) {
      warnings.push(`Live listings for ${area.name} are unavailable (${e instanceof Error ? e.message : 'unknown error'}). Showing sample options.`);
    }
  }

  if (usedAny) {
    next.source.places = 'google-places';
    const refreshed = refreshItinerary(next, prefs);
    return { itinerary: { ...refreshed, budget: computeBudget(refreshed, prefs) }, warnings, used: true };
  }
  return { itinerary: it, warnings, used: false };
}
