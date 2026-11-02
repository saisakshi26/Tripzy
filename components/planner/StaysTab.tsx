'use client';

import { useMemo, useState } from 'react';
import { BedDouble, Check, ExternalLink, Info, MapPin, MessageCircle, Star } from 'lucide-react';
import DestImage from '@/components/ui/DestImage';
import { Badge, Chip } from '@/components/ui/Primitives';
import type { Itinerary, Preferences, StayOption } from '@/types';
import { selectedStay } from '@/lib/budget';
import { stayTotalFor, nightsInArea } from '@/lib/planner';
import { inr } from '@/lib/utils';
import { destIdForArea } from './helpers';

interface Props {
  it: Itinerary;
  prefs: Preferences;
  onChoose: (areaId: string, stayId: string) => void;
  onAsk: (message: string, areaId: string) => void;
}

const RATINGS = [
  { v: 0, label: 'Any' },
  { v: 4, label: '4.0+' },
  { v: 4.2, label: '4.2+' },
  { v: 4.5, label: '4.5+' },
];

function StayCard({ stay, it, prefs, chosen, onChoose, onAsk }: { stay: StayOption; it: Itinerary; prefs: Preferences; chosen: boolean; onChoose: () => void; onAsk: () => void }) {
  const nights = Math.max(1, nightsInArea(it, stay.areaId));
  const total = stayTotalFor(it, prefs, stay);
  return (
    <article className={`lux-card flex flex-col overflow-hidden transition ${chosen ? '!border-gold shadow-glow' : ''}`}>
      <div className="relative">
        <DestImage id={destIdForArea(stay.areaId)} src={stay.photo} alt={stay.verified ? stay.name : `${stay.areaName} — illustrative artwork`} className="aspect-[16/9] w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-cocoa-950/80 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge tone="gold">{stay.type}</Badge>
          {stay.verified ? <Badge tone="good">Verified live listing</Badge> : <Badge tone="warn">Demo sample</Badge>}
        </div>
        {chosen && <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-gold text-cocoa-950"><Check className="h-5 w-5" strokeWidth={3.5} /></span>}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div>
          <h4 className="font-serif text-[1.45rem] font-semibold leading-tight">{stay.name}</h4>
          <p className="mt-1.5 flex items-start gap-1.5 text-[0.92rem] text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {stay.address || stay.areaName}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {stay.rating !== null ? (
            <p className="flex items-center gap-1.5 text-[1rem] font-bold text-ivory"><Star className="h-4 w-4 fill-gold text-gold" /> {stay.rating.toFixed(1)} <span className="font-normal text-muted">({(stay.reviewCount ?? 0).toLocaleString('en-IN')} reviews)</span></p>
          ) : (
            <p className="flex items-center gap-1.5 text-[0.92rem] text-muted"><Info className="h-4 w-4" /> No rating — sample listing</p>
          )}
          <Badge tone="neutral">{stay.tier}</Badge>
        </div>

        <div className="rounded-xl bg-cocoa-900/80 p-4">
          <p className="flex flex-wrap items-baseline gap-x-2"><span className="font-serif text-[1.7rem] font-semibold text-ivory">{inr(stay.pricePerNight)}</span><span className="text-[0.9rem] text-sand">per {stay.type === 'hostel' ? 'bed' : 'room'} / night</span>{stay.priceEstimated && <Badge tone="warn">Estimated</Badge>}</p>
          <p className="mt-1.5 text-[0.95rem] text-sand">≈ <strong className="text-ivory">{inr(total)}</strong> for {nights} {nights === 1 ? 'night' : 'nights'}{stay.priceEstimated ? ' (estimate, not a quote)' : ''}</p>
          {!stay.withinNightlyBudget && prefs.nightlyBudget > 0 && (
            <p className="mt-2 text-[0.9rem] font-semibold text-amber-200">Above your {inr(prefs.nightlyBudget)} nightly cap — shown so you can compare.</p>
          )}
        </div>

        <p className="text-[0.95rem] leading-snug text-sand">{stay.distanceNote}</p>

        <div>
          <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-muted">Facilities</p>
          <ul className="flex flex-wrap gap-1.5">
            {stay.facilities.map((f) => <li key={f} className="tag !text-ivory"><Check className="h-3 w-3 text-gold" strokeWidth={3.5} /> {f}</li>)}
            {stay.missingFacilities.map((f) => <li key={f} className="tag line-through opacity-60" title="Not listed for this property">{f}</li>)}
          </ul>
        </div>

        <p className="flex items-start gap-2 text-[0.92rem] text-sand"><BedDouble className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> <span><strong className="text-ivory">Rooms:</strong> {stay.rooms.join(' · ')}</span></p>
        <p className="text-[0.88rem] text-muted">Check-in {stay.checkIn} · Check-out {stay.checkOut}</p>

        <p className="rounded-xl border border-gold/20 bg-gold/[0.06] p-3.5 text-[0.95rem] leading-snug text-sand"><strong className="text-gold">Why Tripzy suggests it:</strong> {stay.why}</p>

        <div className="mt-auto flex flex-wrap gap-2.5 pt-1">
          <button type="button" onClick={onChoose} disabled={chosen} className={chosen ? 'btn-quiet' : 'btn-primary'}>{chosen ? <><Check className="h-4 w-4" strokeWidth={3} /> Your stay</> : 'Use this stay'}</button>
          {stay.bookingUrl && <a href={stay.bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost !min-h-[44px]">{stay.verified ? 'Website' : 'Find stays'} <ExternalLink className="h-4 w-4" /></a>}
          <a href={stay.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-quiet no-print"><MapPin className="h-4 w-4" /> Map</a>
          <button type="button" onClick={onAsk} className="btn-quiet no-print"><MessageCircle className="h-4 w-4" /> Replace</button>
        </div>
      </div>
    </article>
  );
}

export default function StaysTab({ it, prefs, onChoose, onAsk }: Props) {
  const [minRating, setMinRating] = useState<number>(prefs.minRating);
  const areas = useMemo(() => Array.from(new Set(it.stays.map((s) => s.areaId))), [it.stays]);
  const live = it.source.places === 'google-places';

  return (
    <div className="grid gap-10">
      <div className="lux-card flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
        <div>
          <p className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-gold">Minimum guest rating</p>
          <p className="mt-1 text-[0.95rem] text-sand">{live ? 'Applied to verified live listings.' : 'Demo mode: sample listings have no ratings, so none are hidden by this filter.'}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Minimum rating">
          {RATINGS.map((r) => <Chip key={r.v} active={minRating === r.v} onClick={() => setMinRating(r.v)}>{r.label}</Chip>)}
        </div>
      </div>

      {areas.map((areaId) => {
        const all = it.stays.filter((s) => s.areaId === areaId);
        const list = all.filter((s) => s.rating === null || s.rating >= minRating).sort((a, b) => a.pricePerNight - b.pricePerNight);
        const current = selectedStay(it, areaId);
        const areaName = all[0]?.areaName ?? areaId;
        const nights = nightsInArea(it, areaId);
        return (
          <section key={areaId} aria-label={`Stays in ${areaName}`}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow mb-1.5">{nights} {nights === 1 ? 'night' : 'nights'}</p>
                <h3 className="text-[clamp(1.7rem,3vw,2.3rem)] font-semibold">Stay in {areaName}</h3>
              </div>
              <p className="text-[0.95rem] text-muted">{list.length} option{list.length === 1 ? '' : 's'}{current ? ` · selected: ${current.name}` : ''}</p>
            </div>
            {list.length === 0 ? (
              <div className="lux-card-soft p-8 text-center text-sand">No stays meet {minRating.toFixed(1)}+ here. <button type="button" onClick={() => setMinRating(0)} className="font-bold text-gold underline underline-offset-4">Show all</button></div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                {list.map((s) => (
                  <StayCard key={s.id} stay={s} it={it} prefs={prefs} chosen={current?.id === s.id} onChoose={() => onChoose(areaId, s.id)} onAsk={() => onAsk(`Replace the hotel in ${areaName}`, areaId)} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
