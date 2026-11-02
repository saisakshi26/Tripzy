'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, Filter, Plus, Sparkles, Wallet, X } from 'lucide-react';
import DestImage from '@/components/ui/DestImage';
import DestinationDetail from './DestinationDetail';
import { Chip } from '@/components/ui/Primitives';
import { useTrip } from '@/hooks/useTrip';
import { destinations, FILTER_TAGS, getDestination } from '@/lib/data/destinations';
import type { Destination, FilterTag } from '@/types';
import { inr } from '@/lib/utils';

/** Subtle 3-D tilt that follows a mouse pointer (touch and keyboard users get a plain card). */
function Tilt({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(1100px) rotateY(${(x * 6).toFixed(2)}deg) rotateX(${(-y * 6).toFixed(2)}deg)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={`transition-transform duration-200 ease-out will-change-transform ${className}`}>
      {children}
    </div>
  );
}

function DestinationCard({ dest, selected, matched, filtering, onOpen, onToggle }: { dest: Destination; selected: boolean; matched: number; filtering: boolean; onOpen: () => void; onToggle: () => void }) {
  return (
    <Tilt>
      <article id={dest.id} className="group scroll-mt-40 overflow-hidden rounded-[22px] border bg-cocoa-800 shadow-lux transition-colors duration-300 hover:border-gold/45">
        <div className="relative">
          <DestImage id={dest.id} query={dest.imageQuery} alt={`${dest.name}, India`} className="aspect-[4/3.1] w-full" imgClassName="transition duration-[900ms] ease-out group-hover:scale-[1.07]" />
          <div className="absolute inset-0 bg-gradient-to-t from-cocoa-950 via-cocoa-950/25 to-transparent" />
          {filtering && matched > 0 && (
            <span className="absolute left-4 top-4 rounded-lg bg-gold px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-cocoa-950">Matches {matched}</span>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            aria-label={selected ? `Remove ${dest.name} from your trip` : `Add ${dest.name} to your trip`}
            className={`absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border backdrop-blur transition ${selected ? 'border-gold bg-gold text-cocoa-950' : 'border-white/25 bg-cocoa-950/60 text-ivory hover:border-gold hover:text-gold'}`}
          >
            {selected ? <Check className="h-5 w-5" strokeWidth={3} /> : <Plus className="h-5 w-5" />}
          </button>
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <h3 className="font-serif text-[2.1rem] font-semibold leading-none">{dest.name}</h3>
            <p className="mt-2 text-[1rem] font-medium text-gold">{dest.short}</p>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <p className="text-[1rem] leading-relaxed text-sand">{dest.tagline}</p>

          <div>
            <p className="mb-2 text-[0.74rem] font-bold uppercase tracking-[0.16em] text-muted">Best experiences</p>
            <ul className="flex flex-wrap gap-2">
              {dest.experiences.slice(0, 3).map((e) => (
                <li key={e} className="tag">{e}</li>
              ))}
            </ul>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-cocoa-900/80 p-3.5">
              <dt className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted"><CalendarDays className="h-3.5 w-3.5 text-gold" /> Best season</dt>
              <dd className="mt-1 text-[0.92rem] font-semibold leading-snug text-ivory">{dest.bestSeason.split(';')[0]}</dd>
            </div>
            <div className="rounded-xl bg-cocoa-900/80 p-3.5">
              <dt className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted"><Wallet className="h-3.5 w-3.5 text-gold" /> Per person / day</dt>
              <dd className="mt-1 text-[0.92rem] font-semibold leading-snug text-ivory">{inr(dest.dailyBudget[0])} – {inr(dest.dailyBudget[1])}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-1.5 text-[0.74rem] font-bold uppercase tracking-[0.16em] text-muted">Popular attractions</p>
            <p className="text-[0.98rem] leading-snug text-sand">{dest.popular.slice(0, 4).join(' · ')}</p>
          </div>

          <button type="button" onClick={onOpen} className="btn-primary w-full">
            Explore destination <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </article>
    </Tilt>
  );
}

export default function ExploreClient() {
  const router = useRouter();
  const { prefs, toggleDestination, customiseDestination } = useTrip();
  const [active, setActive] = useState<FilterTag[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  // /explore#kerala (from the home page) opens that destination straight away
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace('#', '');
      if (id && getDestination(id)) setOpenId(id);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const list = useMemo(() => {
    if (!active.length) return destinations.map((d) => ({ d, n: 0 }));
    return destinations
      .map((d) => ({ d, n: active.filter((t) => d.tags.includes(t)).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
  }, [active]);

  const toggleFilter = (t: FilterTag) => setActive((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]));

  const close = useCallback(() => {
    setOpenId(null);
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const open = openId ? getDestination(openId) : undefined;
  const selectedDests = prefs.destinationIds.map((id) => getDestination(id)).filter((d): d is Destination => !!d);

  return (
    <div className="relative">
      <header className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_85%_0%,rgba(214,174,120,0.18),transparent_60%),linear-gradient(180deg,#2c1812,#24130F)]" />
        <div className="container-x relative py-16 sm:py-24">
          <p className="eyebrow mb-4 flex items-center gap-2.5"><Sparkles className="h-4 w-4" /> Explore India</p>
          <h1 className="max-w-3xl text-[clamp(2.8rem,6.4vw,5.2rem)] font-semibold leading-[1.02]">
            Explore India, <span className="text-gradient-gold">Your Way.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[clamp(1.1rem,1.6vw,1.3rem)] text-sand">Find places that match your personality, budget and travel dreams.</p>
        </div>
      </header>

      <div className="container-x pb-40 pt-10">
        <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filter destinations">
          <span className="mr-1 flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-[0.16em] text-muted"><Filter className="h-4 w-4" /> Filter</span>
          {FILTER_TAGS.map((t) => (
            <Chip key={t} active={active.includes(t)} onClick={() => toggleFilter(t)}>{t}</Chip>
          ))}
          {active.length > 0 && (
            <button type="button" onClick={() => setActive([])} className="ml-1 flex items-center gap-1.5 text-[0.9rem] font-semibold text-gold hover:text-ivory">
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
        <p className="mt-4 text-[0.95rem] text-muted" aria-live="polite">
          {active.length ? `${list.length} of ${destinations.length} destinations match at least one filter — best matches first.` : `${destinations.length} destinations. Tap + on a card to add it to your trip; you can combine several.`}
        </p>

        {list.length === 0 ? (
          <div className="lux-card mt-10 p-10 text-center">
            <p className="font-serif text-[1.6rem]">Nothing matches those filters.</p>
            <button type="button" onClick={() => setActive([])} className="btn-ghost mt-5">Clear filters</button>
          </div>
        ) : (
          <motion.div layout className="mt-10 grid gap-6 sm:grid-cols-2 sm:[&>*:nth-child(even)]:mt-10 xl:grid-cols-3 xl:[&>*:nth-child(even)]:mt-0 xl:[&>*:nth-child(3n+2)]:mt-14">
            <AnimatePresence mode="popLayout">
              {list.map(({ d, n }, i) => (
                <motion.div key={d.id} layout initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.5, delay: Math.min(i, 5) * 0.05, ease: [0.22, 1, 0.36, 1] }}>
                  <DestinationCard dest={d} selected={prefs.destinationIds.includes(d.id)} matched={n} filtering={active.length > 0} onOpen={() => setOpenId(d.id)} onToggle={() => toggleDestination(d.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* trip tray */}
      <AnimatePresence>
        {selectedDests.length > 0 && !open && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.3 }} className="no-print fixed inset-x-0 bottom-4 z-40 px-4">
            <div className="mx-auto flex max-w-[960px] flex-wrap items-center gap-3 rounded-2xl border border-gold/35 bg-cocoa-900/95 p-3 pl-5 shadow-lux backdrop-blur-xl sm:flex-nowrap">
              <p className="shrink-0 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-gold">Your trip</p>
              <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
                {selectedDests.map((d) => (
                  <li key={d.id} className="flex items-center gap-1.5 rounded-lg bg-cocoa-700/80 py-1 pl-3 pr-1 text-[0.92rem] font-semibold">
                    {d.name}
                    <button type="button" onClick={() => toggleDestination(d.id)} aria-label={`Remove ${d.name}`} className="grid h-7 w-7 place-items-center rounded-md text-sand hover:bg-white/10 hover:text-ivory"><X className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
              <Link href="/preferences" className="btn-primary w-full sm:w-auto">Tell us your style <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <DestinationDetail
            key={open.id}
            dest={open}
            selected={prefs.destinationIds.includes(open.id)}
            onToggle={() => toggleDestination(open.id)}
            onClose={close}
            onCustomise={() => {
              customiseDestination(open.id);
              router.push('/preferences');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
