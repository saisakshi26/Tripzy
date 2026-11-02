'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Leaf, MapPin, Star, Utensils } from 'lucide-react';
import DestImage from '@/components/ui/DestImage';
import { Badge, Chip } from '@/components/ui/Primitives';
import type { Itinerary, Preferences, RestaurantOption } from '@/types';
import { inr } from '@/lib/utils';
import { dietLabel } from '@/lib/summary';
import { destIdForArea } from './helpers';

const DIET_BADGE: Record<RestaurantOption['diet'], string> = { veg: 'Pure vegetarian', both: 'Veg & non-veg', nonveg: 'Non-vegetarian' };

function Card({ r }: { r: RestaurantOption }) {
  return (
    <article className="lux-card flex flex-col overflow-hidden">
      <div className="relative">
        <DestImage id={destIdForArea(r.areaId)} src={r.photo} alt={r.verified ? r.name : `${r.areaName} — illustrative artwork`} className="aspect-[16/8] w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-cocoa-950/80 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {r.verified ? <Badge tone="good">Verified live listing</Badge> : <Badge tone="warn">{r.generic ? 'Type of place · AI suggestion' : 'Demo sample'}</Badge>}
          <Badge tone={r.diet === 'veg' ? 'good' : 'neutral'}>{DIET_BADGE[r.diet]}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 p-5 sm:p-6">
        <div>
          <h4 className="font-serif text-[1.35rem] font-semibold leading-tight">{r.name}</h4>
          <p className="mt-1 text-[0.95rem] font-semibold text-gold">{r.cuisine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.95rem]">
          {r.rating !== null ? (
            <span className="flex items-center gap-1.5 font-bold"><Star className="h-4 w-4 fill-gold text-gold" /> {r.rating.toFixed(1)} <span className="font-normal text-muted">({(r.reviewCount ?? 0).toLocaleString('en-IN')})</span></span>
          ) : (
            <span className="text-muted">No rating — not a verified listing</span>
          )}
          <span className="text-sand">≈ <strong className="text-ivory">{inr(r.avgPP)}</strong> pp · <strong className="text-ivory">{inr(r.avgPP * 2)}</strong> for two{r.priceEstimated ? ' (est.)' : ''}</span>
        </div>
        <p className="flex items-start gap-1.5 text-[0.92rem] text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {r.address || r.areaName} · {r.distanceNote}</p>
        <div>
          <p className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-muted">Try</p>
          <ul className="flex flex-wrap gap-1.5">{r.dishes.map((d) => <li key={d} className="tag !text-ivory">{d}</li>)}</ul>
        </div>
        <p className="text-[0.9rem] text-muted">Hours: {r.hours}</p>
        <p className="flex items-start gap-2 rounded-xl bg-cocoa-900/80 p-3 text-[0.92rem] leading-snug text-sand"><Leaf className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {r.vegNote}</p>
        <p className="text-[0.95rem] leading-snug text-sand"><strong className="text-gold">Why it fits you:</strong> {r.why}</p>
        <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost no-print mt-auto !min-h-[44px] self-start">Open in Maps <ExternalLink className="h-4 w-4" /></a>
      </div>
    </article>
  );
}

export default function DiningTab({ it, prefs }: { it: Itinerary; prefs: Preferences }) {
  const [vegOnly, setVegOnly] = useState(prefs.diet === 'vegetarian' || prefs.diet === 'vegan');
  const areas = useMemo(() => Array.from(new Set(it.restaurants.map((r) => r.areaId))), [it.restaurants]);
  const planned = useMemo(() => new Set(it.days.flatMap((d) => d.slots.map((s) => s.restaurantId).filter((x): x is string => !!x))), [it.days]);

  return (
    <div className="grid gap-10">
      <div className="lux-card flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-[0.16em] text-gold"><Utensils className="h-4 w-4" /> Your table</p>
          <p className="mt-1 text-[0.98rem] text-sand">{dietLabel(prefs.diet)}{prefs.allergies ? ` · avoiding ${prefs.allergies}` : ''}{prefs.alcohol !== 'yes' ? ' · no alcohol-centred venues' : ''}</p>
        </div>
        <Chip active={vegOnly} onClick={() => setVegOnly((v) => !v)}><Leaf className="h-4 w-4" /> Vegetarian-friendly only</Chip>
      </div>
      {areas.map((areaId) => {
        const all = it.restaurants.filter((r) => r.areaId === areaId);
        const list = all.filter((r) => !vegOnly || r.diet !== 'nonveg').sort((a, b) => Number(planned.has(b.id)) - Number(planned.has(a.id)));
        const areaName = all[0]?.areaName ?? areaId;
        return (
          <section key={areaId} aria-label={`Dining in ${areaName}`}>
            <h3 className="mb-5 text-[clamp(1.7rem,3vw,2.3rem)] font-semibold">Eat in {areaName}</h3>
            {list.length === 0 ? <div className="lux-card-soft p-8 text-center text-sand">No vegetarian-friendly options listed here.</div> : (
              <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">{list.map((r) => <Card key={r.id} r={r} />)}</div>
            )}
          </section>
        );
      })}
      {it.source.places !== 'google-places' && <p className="text-[0.9rem] text-muted">Demo mode: entries are labelled samples or types of place with estimated prices. Add a Google Places key for verified ratings, reviews and photos.</p>}
    </div>
  );
}
