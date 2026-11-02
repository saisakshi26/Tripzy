'use client';

import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Check, Clock, Compass, Lightbulb, MapPin, Plus, Sparkles, UtensilsCrossed, Wallet, X } from 'lucide-react';
import DestImage from '@/components/ui/DestImage';
import type { Destination } from '@/types';
import { inr } from '@/lib/utils';

interface Props {
  dest: Destination;
  selected: boolean;
  onToggle: () => void;
  onCustomise: () => void;
  onClose: () => void;
}

function Block({ icon: Icon, title, children }: { icon: typeof MapPin; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-cocoa-800/70 p-6 sm:p-7">
      <h3 className="flex items-center gap-3 font-serif text-[1.5rem] font-semibold">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/12 text-gold">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Slide-in detail view: overview, attractions, experiences, local food, duration, tips and expenses. */
export default function DestinationDetail({ dest, selected, onToggle, onCustomise, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const attractions = [...dest.attractions].sort((a, b) => Number(b.famous) - Number(a.famous)).slice(0, 8);

  return (
    <motion.div className="fixed inset-0 z-[60] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <button type="button" aria-label="Close destination details" onClick={onClose} className="absolute inset-0 bg-cocoa-950/80 backdrop-blur-sm" />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`${dest.name} details`}
        className="relative flex h-full w-full max-w-[860px] flex-col overflow-y-auto border-l bg-cocoa-950 shadow-lux scroll-thin"
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 80, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative shrink-0">
          <DestImage id={dest.id} query={dest.imageQuery} alt={`${dest.name}, India`} className="h-[300px] w-full sm:h-[380px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-cocoa-950 via-cocoa-950/40 to-cocoa-950/20" />
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-cocoa-950/70 text-ivory backdrop-blur transition hover:border-gold hover:text-gold">
            <X className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
            <p className="eyebrow mb-2">{dest.short}</p>
            <h2 className="text-[clamp(2.6rem,6vw,4.2rem)] font-semibold leading-none">{dest.name}</h2>
            <p className="mt-3 max-w-xl text-[1.1rem] text-sand">{dest.tagline}</p>
          </div>
        </div>

        <div className="grid gap-5 p-5 pb-36 sm:p-9 sm:pb-36">
          <Block icon={Compass} title="Overview">
            <p className="text-[1.05rem] leading-relaxed text-sand">{dest.overview}</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-cocoa-900/80 p-4">
                <dt className="flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-muted"><CalendarDays className="h-4 w-4 text-gold" /> Best season</dt>
                <dd className="mt-1.5 text-[1rem] font-semibold text-ivory">{dest.bestSeason}</dd>
                <dd className="mt-1 text-[0.9rem] text-muted">{dest.offSeasonNote}</dd>
              </div>
              <div className="rounded-xl bg-cocoa-900/80 p-4">
                <dt className="flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-muted"><Clock className="h-4 w-4 text-gold" /> Suggested trip duration</dt>
                <dd className="mt-1.5 font-serif text-[1.7rem] font-semibold text-ivory">{dest.suggestedDays}</dd>
                <dd className="mt-1 text-[0.9rem] text-muted">Approx. {inr(dest.dailyBudget[0])} – {inr(dest.dailyBudget[1])} per person per day</dd>
              </div>
            </dl>
          </Block>

          <Block icon={MapPin} title="Attractions">
            <ul className="grid gap-3">
              {attractions.map((a) => (
                <li key={a.id} className="rounded-xl bg-cocoa-900/80 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h4 className="font-serif text-[1.2rem] font-semibold">{a.name}</h4>
                    <span className="text-[0.82rem] font-bold uppercase tracking-[0.1em] text-gold">{a.fee === 0 ? 'Free entry' : `≈ ${inr(a.fee)} pp`} · {a.hours}h</span>
                  </div>
                  <p className="mt-1.5 text-[0.98rem] leading-snug text-sand">{a.desc}</p>
                </li>
              ))}
            </ul>
          </Block>

          <div className="grid gap-5 md:grid-cols-2">
            <Block icon={Sparkles} title="Experiences">
              <ul className="grid gap-2.5">
                {dest.experiences.map((e) => (
                  <li key={e} className="flex items-start gap-2.5 text-[1rem] text-sand"><Check className="mt-1 h-4 w-4 shrink-0 text-gold" strokeWidth={3} /> {e}</li>
                ))}
              </ul>
            </Block>
            <Block icon={UtensilsCrossed} title="Local food">
              <ul className="flex flex-wrap gap-2">
                {dest.food.map((f) => (
                  <li key={f} className="rounded-lg border bg-cocoa-900/80 px-3 py-1.5 text-[0.95rem] font-semibold text-sand">{f}</li>
                ))}
              </ul>
            </Block>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Block icon={Lightbulb} title="Travel tips">
              <ul className="grid gap-3">
                {dest.tips.map((t) => (
                  <li key={t} className="text-[0.98rem] leading-snug text-sand">• {t}</li>
                ))}
              </ul>
            </Block>
            <Block icon={Wallet} title="Approximate expenses">
              <ul className="divide-y divide-white/10">
                {dest.expenses.map((x) => (
                  <li key={x.label} className="flex items-baseline justify-between gap-4 py-2.5 text-[0.98rem]">
                    <span className="text-sand">{x.label}</span>
                    <span className="shrink-0 font-semibold text-ivory">{x.value}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.85rem] text-muted">Figures are typical ranges, not live quotes.</p>
            </Block>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 mt-auto border-t bg-cocoa-950/95 p-4 backdrop-blur-xl sm:px-9">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onCustomise} className="btn-primary flex-1">Customise this destination</button>
            <button type="button" onClick={onToggle} className="btn-ghost sm:w-auto">
              {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : <Plus className="h-4 w-4" />}
              {selected ? 'In your trip' : 'Add to trip'}
            </button>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}
