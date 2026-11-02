'use client';

import { useMemo, useState } from 'react';
import { Clock, MapPin, Navigation, Ticket } from 'lucide-react';
import { Badge, Chip } from '@/components/ui/Primitives';
import type { Attraction, Itinerary, Kind, Preferences } from '@/types';
import { getDestination } from '@/lib/data/destinations';
import { durationLabel, inr, mapsSearchUrl } from '@/lib/utils';

const has = (a: Attraction, kinds: Kind[]) => a.kinds.some((k) => kinds.includes(k));

const CATEGORIES: { key: string; label: string; test: (a: Attraction) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'popular', label: 'Popular attractions', test: (a) => a.famous },
  { key: 'hidden', label: 'Hidden gems', test: (a) => !a.famous },
  { key: 'nature', label: 'Nature spots', test: (a) => has(a, ['nature', 'wildlife', 'beaches']) },
  { key: 'adventure', label: 'Adventure', test: (a) => has(a, ['adventure', 'trekking', 'water']) },
  { key: 'culture', label: 'Culture & local experiences', test: (a) => has(a, ['culture', 'heritage', 'temples', 'food']) },
  { key: 'shopping', label: 'Shopping', test: (a) => has(a, ['shopping']) },
];

export default function AttractionsTab({ it, prefs }: { it: Itinerary; prefs: Preferences }) {
  const [cat, setCat] = useState('all');
  const test = CATEGORIES.find((c) => c.key === cat)?.test ?? (() => true);

  const planned = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of it.days) for (const s of d.slots) if (s.attractionId && !m.has(`${d.destinationId}:${s.attractionId}`)) m.set(`${d.destinationId}:${s.attractionId}`, d.day);
    return m;
  }, [it.days]);

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Attraction categories">
        {CATEGORIES.map((c) => <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>{c.label}</Chip>)}
      </div>
      {it.destinations.map(({ id }) => {
        const dest = getDestination(id);
        if (!dest) return null;
        const list = dest.attractions.filter((a) => (prefs.alcohol === 'yes' || !a.alcohol) && test(a));
        return (
          <section key={id} aria-label={`Attractions in ${dest.name}`}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-[clamp(1.7rem,3vw,2.3rem)] font-semibold">{dest.name}</h3>
              <p className="text-[0.95rem] text-muted">{list.length} to explore · best time: {dest.bestSeason.split(';')[0]}</p>
            </div>
            {list.length === 0 ? <div className="lux-card-soft p-8 text-center text-sand">Nothing in this category for {dest.name}.</div> : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((a) => {
                  const day = planned.get(`${id}:${a.id}`);
                  const area = dest.areas.find((x) => x.id === a.areaId);
                  return (
                    <article key={a.id} className="lux-card flex flex-col gap-3 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h4 className="font-serif text-[1.3rem] font-semibold leading-tight">{a.name}</h4>
                        {day ? <Badge tone="gold">On Day {day}</Badge> : <Badge tone="neutral">Not in plan</Badge>}
                      </div>
                      <p className="text-[0.95rem] leading-snug text-sand">{a.desc}</p>
                      <ul className="flex flex-wrap gap-1.5 text-[0.8rem] font-semibold text-sand">
                        <li className="tag"><Ticket className="h-3.5 w-3.5 text-gold" /> {a.fee === 0 ? 'Free' : `≈ ${inr(a.fee)} pp`}</li>
                        <li className="tag"><Clock className="h-3.5 w-3.5 text-gold" /> {durationLabel(a.hours)}</li>
                        <li className="tag"><Navigation className="h-3.5 w-3.5 text-gold" /> ~{a.km} km from {area?.name ?? 'centre'}</li>
                        <li className="tag">{a.famous ? 'Popular' : 'Hidden gem'}</li>
                      </ul>
                      <p className="text-[0.88rem] text-muted">Best time: {a.bestTime}</p>
                      <a href={mapsSearchUrl(`${a.name} ${dest.name}`)} target="_blank" rel="noopener noreferrer" className="no-print mt-auto inline-flex items-center gap-1.5 text-[0.85rem] font-bold uppercase tracking-[0.1em] text-gold hover:text-ivory"><MapPin className="h-4 w-4" /> View on map</a>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      <p className="text-[0.9rem] text-muted">Entry fees are approximate per adult and can change — confirm before you go.</p>
    </div>
  );
}
