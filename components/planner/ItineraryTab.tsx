'use client';

import { ArrowDown, ArrowUp, Clock, Lightbulb, MapPin, MessageCircle, Moon, Navigation, Route, Sun, Sunrise, Trash2, Utensils, type LucideIcon } from 'lucide-react';
import type { DayPlan, Itinerary, Period, Preferences, Slot } from '@/types';
import { headcountFees, headcountFood } from '@/lib/defaults';
import { durationLabel, inr, mapsSearchUrl, prettyDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Primitives';

const PERIODS: { key: Period; label: string; icon: LucideIcon }[] = [
  { key: 'morning', label: 'Morning', icon: Sunrise },
  { key: 'afternoon', label: 'Afternoon', icon: Sun },
  { key: 'evening', label: 'Evening', icon: Moon },
];

interface Props {
  it: Itinerary;
  prefs: Preferences;
  editing: boolean;
  onEdit: (fn: (draft: Itinerary) => Itinerary) => void;
  onAsk: (day: number) => void;
}

/** Estimated activity + meal spend for one day (stays and transport are in the budget tab). */
function dayCost(day: DayPlan, it: Itinerary, prefs: Preferences): number {
  let sum = 0;
  for (const s of day.slots) {
    if (s.kind === 'sight') sum += s.feePP * headcountFees(prefs);
    if (s.kind === 'meal') {
      const r = it.restaurants.find((x) => x.id === s.restaurantId);
      if (r) sum += r.avgPP * headcountFood(prefs);
    }
  }
  return sum;
}

function SlotRow({ slot, it, editing, first, last, onRemove, onMove, onRename }: { slot: Slot; it: Itinerary; editing: boolean; first: boolean; last: boolean; onRemove: () => void; onMove: (d: -1 | 1) => void; onRename: (t: string) => void }) {
  const restaurant = slot.kind === 'meal' ? it.restaurants.find((r) => r.id === slot.restaurantId) : undefined;
  const Icon = slot.kind === 'meal' ? Utensils : slot.kind === 'transfer' ? Route : slot.kind === 'rest' ? Clock : MapPin;
  return (
    <li className="print-break relative grid grid-cols-[4.6rem_1fr] gap-x-4 sm:grid-cols-[5.5rem_1fr]">
      <span className="pt-1 text-right text-[0.88rem] font-bold tabular-nums text-gold">{slot.time}</span>
      <div className="relative rounded-xl border bg-cocoa-900/70 p-4">
        {editing ? (
          <input value={slot.title} maxLength={120} onChange={(e) => onRename(e.target.value)} aria-label="Edit activity title" className="field !py-2 font-serif !text-[1.1rem] font-semibold" />
        ) : (
          <h5 className="flex items-start gap-2.5 font-serif text-[1.2rem] font-semibold leading-snug"><Icon className="mt-1.5 h-4 w-4 shrink-0 text-gold" /> {slot.title}</h5>
        )}
        <p className="mt-1.5 text-[0.98rem] leading-snug text-sand">{slot.desc}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.82rem] font-semibold text-sand">
          {slot.durationH > 0 && <span className="tag"><Clock className="h-3.5 w-3.5 text-gold" /> {durationLabel(slot.durationH)}</span>}
          {slot.kind === 'sight' && slot.travelKm > 0 && (
            <span className="tag"><Navigation className="h-3.5 w-3.5 text-gold" /> {slot.travelKm} km · ~{slot.travelMin} min · {slot.mode}</span>
          )}
          {slot.kind === 'transfer' && slot.travelKm > 0 && <span className="tag"><Route className="h-3.5 w-3.5 text-gold" /> {slot.travelKm} km · {slot.mode}</span>}
          {slot.kind === 'sight' && <span className="tag">{slot.feePP === 0 ? 'Free entry' : `Entry/activity ≈ ${inr(slot.feePP)} pp`}</span>}
          {restaurant && (
            <>
              <span className="tag">≈ {inr(restaurant.avgPP)} pp</span>
              <a href={restaurant.mapsUrl} target="_blank" rel="noopener noreferrer" className="tag hover:border-gold hover:text-gold"><MapPin className="h-3.5 w-3.5 text-gold" /> Map</a>
              {!restaurant.verified && <Badge tone="warn">{restaurant.generic ? 'Type of place' : 'Demo sample'}</Badge>}
            </>
          )}
          {slot.kind === 'sight' && (
            <a href={mapsSearchUrl(slot.title)} target="_blank" rel="noopener noreferrer" className="tag no-print hover:border-gold hover:text-gold"><MapPin className="h-3.5 w-3.5 text-gold" /> Directions</a>
          )}
        </div>
        {editing && (
          <div className="no-print mt-3 flex items-center gap-2 border-t pt-3">
            <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label="Move earlier" className="btn-quiet !min-h-[38px] !px-3"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" onClick={() => onMove(1)} disabled={last} aria-label="Move later" className="btn-quiet !min-h-[38px] !px-3"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" onClick={onRemove} className="btn-quiet !min-h-[38px] !text-rose-200 hover:!bg-rose-500/20"><Trash2 className="h-4 w-4" /> Remove</button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function ItineraryTab({ it, prefs, editing, onEdit, onAsk }: Props) {
  const patchDay = (dayNo: number, fn: (d: DayPlan) => DayPlan) => onEdit((draft) => ({ ...draft, days: draft.days.map((d) => (d.day === dayNo ? fn(d) : d)) }));

  return (
    <div className="grid gap-7">
      {it.days.map((day) => {
        const cost = dayCost(day, it, prefs);
        return (
          <article key={day.day} id={`day-${day.day}`} className="lux-card scroll-mt-44 overflow-hidden">
            <header className="border-b bg-gradient-to-r from-cocoa-700/60 to-cocoa-800 p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.8rem] font-bold uppercase tracking-[0.18em] text-gold">Day {day.day} · {prettyDate(day.date)} · {day.areaName}</p>
                  <h3 className="mt-2 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold">{day.title}</h3>
                  <p className="mt-2 max-w-2xl text-[1rem] text-sand">{day.theme}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-right text-[0.78rem] font-bold uppercase tracking-[0.12em] text-muted">Meals + entries<br /><span className="font-serif text-[1.5rem] normal-case tracking-normal text-ivory">≈ {inr(cost)}</span></p>
                  <button type="button" onClick={() => onAsk(day.day)} className="no-print btn-quiet"><MessageCircle className="h-4 w-4" /> Ask Tripzy</button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {day.relaxed && <Badge tone="gold">Relaxed day</Badge>}
                {day.transferKm > 0 && <Badge tone="neutral"><Route className="h-3 w-3" /> Travel day · ~{day.transferKm} km between areas</Badge>}
              </div>
            </header>

            <div className="grid gap-8 p-6 sm:p-8">
              {PERIODS.map((p) => {
                const slots = day.slots.filter((s) => s.period === p.key);
                if (!slots.length && !day.narrative?.[p.key]) return null;
                return (
                  <section key={p.key} aria-label={`${p.label} on day ${day.day}`}>
                    <h4 className="mb-4 flex items-center gap-2.5 text-[0.85rem] font-bold uppercase tracking-[0.18em] text-gold"><p.icon className="h-4 w-4" /> {p.label}</h4>
                    {day.narrative?.[p.key] && <p className="mb-4 border-l-2 border-gold/40 pl-4 font-serif text-[1.08rem] italic leading-relaxed text-sand">{day.narrative[p.key]}</p>}
                    <ol className="grid gap-3">
                      {slots.map((s) => {
                        const idx = day.slots.findIndex((x) => x.id === s.id);
                        return (
                          <SlotRow
                            key={s.id}
                            slot={s}
                            it={it}
                            editing={editing}
                            first={idx === 0}
                            last={idx === day.slots.length - 1}
                            onRemove={() => patchDay(day.day, (d) => ({ ...d, slots: d.slots.filter((x) => x.id !== s.id) }))}
                            onRename={(t) => patchDay(day.day, (d) => ({ ...d, slots: d.slots.map((x) => (x.id === s.id ? { ...x, title: t } : x)) }))}
                            onMove={(dir) =>
                              patchDay(day.day, (d) => {
                                const i = d.slots.findIndex((x) => x.id === s.id);
                                const j = i + dir;
                                if (i < 0 || j < 0 || j >= d.slots.length) return d;
                                const arr = d.slots.map((x) => ({ ...x }));
                                const pi = arr[i].period;
                                arr[i].period = arr[j].period;
                                arr[j].period = pi;
                                [arr[i], arr[j]] = [arr[j], arr[i]];
                                return { ...d, slots: arr };
                              })
                            }
                          />
                        );
                      })}
                    </ol>
                  </section>
                );
              })}

              {day.tips.length > 0 && (
                <aside className="rounded-xl border border-gold/20 bg-gold/[0.06] p-5">
                  <h4 className="mb-2.5 flex items-center gap-2 text-[0.85rem] font-bold uppercase tracking-[0.16em] text-gold"><Lightbulb className="h-4 w-4" /> Notes &amp; tips</h4>
                  <ul className="grid gap-1.5 text-[0.98rem] text-sand">
                    {day.tips.map((t) => <li key={t}>• {t}</li>)}
                  </ul>
                </aside>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
