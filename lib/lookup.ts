import type { Area, Attraction, Destination, RestaurantData } from '@/types';
import { getDestination } from './data/destinations';

export const getAttraction = (destId: string, id: string): Attraction | undefined =>
  getDestination(destId)?.attractions.find((a) => a.id === id);

export const getArea = (destId: string, areaId: string): Area | undefined =>
  getDestination(destId)?.areas.find((a) => a.id === areaId);

export const getRestaurantData = (destId: string, id: string): RestaurantData | undefined =>
  getDestination(destId)?.restaurants.find((r) => r.id === id);

/** Option ids are namespaced so they stay unique across destinations. */
export const optionId = (destId: string, id: string): string => `${destId}:${id}`;
export const splitOptionId = (oid: string): { destId: string; id: string } => {
  const i = oid.indexOf(':');
  return { destId: oid.slice(0, i), id: oid.slice(i + 1) };
};

export const destinationOfArea = (areaId: string, dests: Destination[]): Destination | undefined =>
  dests.find((d) => d.areas.some((a) => a.id === areaId));
