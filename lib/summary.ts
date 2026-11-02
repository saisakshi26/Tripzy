import type { Itinerary, Preferences } from '@/types';
import { selectedStay } from './budget';
import { inr, prettyDate, prettyDateLong } from './utils';

const DIET: Record<Preferences['diet'], string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  eggetarian: 'Eggetarian',
  'non-vegetarian': 'Non-vegetarian',
  none: 'No dietary restrictions',
};
const TRANSPORT: Record<Preferences['transport'], string> = {
  own: 'Own vehicle',
  rental: 'Rental car',
  public: 'Public transport',
  cab: 'Cab / taxi',
  bike: 'Bike rental',
  mix: 'Mix of transport',
};
const STAY: Record<Preferences['stayType'], string> = {
  hotel: 'Hotel',
  hostel: 'Hostel',
  resort: 'Resort',
  homestay: 'Homestay',
  boutique: 'Boutique stay',
  any: 'Any stay type',
};

export const dietLabel = (d: Preferences['diet']): string => DIET[d];
export const transportLabel = (t: Preferences['transport']): string => TRANSPORT[t];
export const stayLabelOf = (s: Preferences['stayType']): string => STAY[s];

/** Plain-text trip summary for “Copy trip summary” and “Share trip”. */
export function buildSummary(it: Itinerary, prefs: Preferences): string {
  const names = it.destinations.map((d) => d.name).join(' & ');
  const lines: string[] = [];
  lines.push(`TRIPZY — ${names}`);
  lines.push(`${prettyDateLong(it.startDate)} → ${prettyDateLong(it.endDate)} · ${it.days.length} days · ${it.travellers} traveller${it.travellers > 1 ? 's' : ''}`);
  lines.push(`Budget ${inr(it.budget.budget)} · Estimated cost ${inr(it.budget.total)} (${it.budget.remaining >= 0 ? `${inr(it.budget.remaining)} left` : `${inr(-it.budget.remaining)} over`})`);
  lines.push(`Food: ${DIET[prefs.diet]} · Transport: ${TRANSPORT[prefs.transport]} · Stay: ${STAY[prefs.stayType]}`);
  lines.push('');
  for (const d of it.days) {
    lines.push(`Day ${d.day} · ${prettyDate(d.date)} — ${d.title}`);
    for (const s of d.slots) lines.push(`  ${s.time ? `${s.time}  ` : ''}${s.title}`);
    lines.push('');
  }
  const stays = Array.from(new Set(it.days.map((d) => d.areaId)))
    .map((a) => selectedStay(it, a))
    .filter((s): s is NonNullable<typeof s> => !!s);
  if (stays.length) {
    lines.push('Stays:');
    for (const s of stays) lines.push(`  • ${s.areaName}: ${s.name}${s.verified ? '' : ' (sample suggestion)'} — ${inr(s.pricePerNight)}/night${s.priceEstimated ? ' (estimated)' : ''}`);
  }
  lines.push('');
  lines.push('Prices marked estimated are guides, not quotes. Planned with Tripzy.');
  return lines.join('\n');
}
