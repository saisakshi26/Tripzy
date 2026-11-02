import { destinations } from '@/lib/data/destinations';
import { destinationOfArea } from '@/lib/lookup';

/** Destination id that owns an area — used to pick the artwork shown under a listing photo. */
export const destIdForArea = (areaId: string): string => destinationOfArea(areaId, destinations)?.id ?? destinations[0].id;

export const stars = (r: number | null): string => (r === null ? '' : r.toFixed(1));
