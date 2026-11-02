import type { Area, Attraction, FoodStyle, Kind, RestaurantData } from '@/types';

export type Content = { areas: Area[]; attractions: Attraction[]; restaurants: RestaurantData[] };

export const ar = (id: string, name: string, lat: number, lng: number, blurb: string, leisure: string[]): Area => ({
  id,
  name,
  lat,
  lng,
  blurb,
  leisure,
});

export const at = (
  id: string,
  name: string,
  areaId: string,
  kinds: Kind[],
  hours: number,
  fee: number,
  km: number,
  walk: 1 | 2 | 3,
  famous: boolean,
  bestTime: string,
  desc: string,
  extra: Partial<Attraction> = {},
): Attraction => ({ id, name, areaId, kinds, hours, fee, km, walk, famous, bestTime, desc, ...extra });

export const rs = (
  id: string,
  name: string,
  areaId: string,
  cuisine: string,
  diet: 'veg' | 'both' | 'nonveg',
  avgPP: number,
  dishes: string[],
  styles: FoodStyle[],
  extra: Partial<RestaurantData> = {},
): RestaurantData => ({ id, name, areaId, cuisine, diet, avgPP, dishes, styles, ...extra });

/** A type of eatery rather than one named venue — replaced by live listings when Google Places is configured. */
export const gen = (
  id: string,
  name: string,
  areaId: string,
  cuisine: string,
  diet: 'veg' | 'both' | 'nonveg',
  avgPP: number,
  dishes: string[],
  styles: FoodStyle[],
  extra: Partial<RestaurantData> = {},
): RestaurantData => rs(id, name, areaId, cuisine, diet, avgPP, dishes, styles, { generic: true, ...extra });
