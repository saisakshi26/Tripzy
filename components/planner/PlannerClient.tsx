'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, BedDouble, Bookmark, CalendarDays, Check, Compass, Copy, Download, Info, Landmark, MessageCircle, Pencil, PiggyBank, RefreshCw, Share2, SlidersHorizontal,
  Sparkles, Trash2, UtensilsCrossed, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { useTrip } from '@/hooks/useTrip';
import { refreshItinerary } from '@/lib/planner';
import { validatePrefs } from '@/lib/defaults';
import { buildSummary } from '@/lib/summary';
import { inr, prettyDateLong } from '@/lib/utils';
import type { AssistantResult, Itinerary } from '@/types';
import { Badge } from '@/components/ui/Primitives';
import Loader from './Loader';
import Assistant, { type ChatMessage } from './Assistant';
import ItineraryTab from './ItineraryTab';
import StaysTab from './StaysTab';
import DiningTab from './DiningTab';
import AttractionsTab from './AttractionsTab';
import BudgetTab from './BudgetTab';

type TabKey = 'itinerary' | 'stays' | 'dining' | 'attractions' | 'budget';
const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'itinerary', label: 'Day by day', icon: CalendarDays },
  { key: 'stays', label: 'Stays', icon: BedDouble },
  { key: 'dining', label: 'Dining', icon: UtensilsCrossed },
  { key: 'attractions', label: 'Attractions', icon: Landmark },
  { key: 'budget', label: 'Budget', icon: Wallet },
];

const GREETING: ChatMessage = {
  id: 'hello',
  role: 'assistant',
  text: 'I know your whole trip. Ask me to swap a hotel, find cheaper or vegetarian restaurants, add an adventure, soften a day, or trim the budget — I will change the itinerary itself.',
};

let msgSeq = 0;
const mid = () => `m${++msgSeq}`;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function OverviewItem({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-cocoa-800/80 p-4 sm:p-5">
      <dt className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-1.5 text-[1.05rem] font-semibold leading-snug text-ivory">{value}</dd>
      {sub && <dd className="mt-0.5 text-[0.85rem] text-muted">{sub}</dd>}
    </div>
  );
}

export default function PlannerClient() {
  const { ready, prefs, itinerary, setItinerary, stale, valid, setStep, saveTrip, saved, loadTrip, deleteTrip } = useTrip();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('itinerary');
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [focusDay, setFocusDay] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const autoStarted = useRef(false);
  const noticeTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  /* ───────────── generate ───────────── */
  const generate = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/itinerary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefs }) });
      const data = (await res.json().catch(() => null)) as { itinerary?: Itinerary; error?: string } | null;
      if (!res.ok || !data?.itinerary) throw new Error(data?.error ?? 'We could not build your plan just now. Please try again.');
      setItinerary(data.itinerary, { fresh: true });
      setFocusDay(1);
      setMessages([GREETING]);
      setEditing(false);
      setStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not reach the planner. Check your connection and try again.');
      setStatus('error');
    }
  }, [prefs, setItinerary]);

  // arriving with valid answers and no plan: build it straight away
  useEffect(() => {
    if (!ready || autoStarted.current) return;
    if (valid && !itinerary) {
      autoStarted.current = true;
      void generate();
    }
  }, [ready, valid, itinerary, generate]);

  /* ───────────── edits (all go through refreshItinerary so times and budget stay in step) ───────────── */
  const edit = useCallback(
    (fn: (draft: Itinerary) => Itinerary) => {
      if (!itinerary) return;
      const copy = JSON.parse(JSON.stringify(itinerary)) as Itinerary;
      setItinerary(refreshItinerary(fn(copy), prefs));
    },
    [itinerary, prefs, setItinerary],
  );

  const chooseStay = (areaId: string, stayId: string) => {
    edit((d) => ({ ...d, stayChoice: { ...d.stayChoice, [areaId]: stayId } }));
    flash('Stay updated — budget recalculated.');
  };

  /* ───────────── assistant ───────────── */
  const send = useCallback(
    async (text: string, areaId?: string) => {
      if (!itinerary || busy) return;
      const day = itinerary.days.find((d) => d.day === focusDay) ?? itinerary.days[0];
      setMessages((m) => [...m, { id: mid(), role: 'user', text }]);
      setDraft('');
      setBusy(true);
      try {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, prefs, itinerary, context: { day: day?.day, areaId: areaId ?? day?.areaId } }),
        });
        const data = (await res.json().catch(() => null)) as (Partial<AssistantResult> & { error?: string }) | null;
        if (!res.ok || !data) throw new Error(data?.error ?? 'I could not apply that change. Please rephrase and try again.');
        if (data.itinerary && data.changed) setItinerary(data.itinerary);
        setMessages((m) => [...m, { id: mid(), role: 'assistant', text: data.reply ?? 'Done.', changed: !!data.changed }]);
      } catch (e) {
        setMessages((m) => [...m, { id: mid(), role: 'assistant', text: e instanceof Error ? e.message : 'Something went wrong. Please try again.' }]);
      } finally {
        setBusy(false);
      }
    },
    [itinerary, busy, focusDay, prefs, setItinerary],
  );

  const askAboutDay = (day: number) => {
    setFocusDay(day);
    setDraft(`Make Day ${day} more relaxed`);
    setChatOpen(true);
  };
  const askStay = (message: string, areaId: string) => {
    setChatOpen(true);
    void send(message, areaId);
  };

  /* ───────────── trip management ───────────── */
  const onSave = () => {
    const t = saveTrip();
    flash(t ? 'Trip saved on this device.' : 'Nothing to save yet.');
  };
  const onCopy = async () => {
    if (!itinerary) return;
    flash((await copyText(buildSummary(itinerary, prefs))) ? 'Trip summary copied.' : 'Copy was blocked by your browser.');
  };
  const onShare = async () => {
    if (!itinerary) return;
    const text = buildSummary(itinerary, prefs);
    const title = `Tripzy — ${itinerary.destinations.map((d) => d.name).join(' & ')}`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    flash((await copyText(text)) ? 'Sharing is not available here — summary copied instead.' : 'Sharing is not available in this browser.');
  };

  /* ───────────── states ───────────── */
  if (!ready) return <div className="container-x py-16"><div className="skeleton h-[480px] rounded-3xl" aria-busy="true" aria-label="Loading your trip" /></div>;
  if (status === 'loading') return <Loader />;

  if (!itinerary) {
    const problems = validatePrefs(prefs);
    return (
      <div className="container-x grid min-h-[60svh] place-items-center py-20">
        <div className="lux-card w-full max-w-2xl p-8 text-center sm:p-12">
          {status === 'error' ? (
            <>
              <AlertTriangle className="mx-auto h-9 w-9 text-amber-300" />
              <h1 className="mt-5 text-[2rem] font-semibold">We hit a snag</h1>
              <p className="mt-3 text-[1.05rem] text-sand" role="alert">{error}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => void generate()} className="btn-primary"><RefreshCw className="h-4 w-4" /> Try again</button>
                <Link href="/preferences" className="btn-ghost">Review my answers</Link>
              </div>
            </>
          ) : (
            <>
              <Compass className="mx-auto h-9 w-9 text-gold" strokeWidth={1.5} />
              <h1 className="mt-5 text-[clamp(1.9rem,3.5vw,2.6rem)] font-semibold">Let&apos;s get to know your trip first</h1>
              <p className="mt-3 text-[1.05rem] text-sand">Tripzy plans around your answers. A few essentials are still missing:</p>
              <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-[1rem] text-ivory">{problems.map((p) => <li key={p}>• {p}</li>)}</ul>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/preferences" className="btn-primary">Tell us your travel style <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/explore" className="btn-ghost">Explore India</Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const it = itinerary;
  const names = it.destinations.map((d) => d.name).join(' & ');
  const warnings = it.source.warnings ?? [];
  const demoPlaces = it.source.places !== 'google-places';

  const assistantProps = { messages, busy, draft, setDraft, onSend: (t: string) => void send(t), days: it.days, focusDay, setFocusDay };

  return (
    <div className="container-x py-8 sm:py-12">
      {/* header + actions */}
      <header>
        <p className="eyebrow mb-3">Your itinerary</p>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <h1 className="max-w-3xl text-[clamp(2.4rem,5.4vw,4.2rem)] font-semibold leading-[1.04]">{names}, <span className="text-gradient-gold">planned for you.</span></h1>
        </div>
        <p className="mt-4 max-w-3xl text-[1.1rem] text-sand">{it.overview.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge tone={it.source.itinerary === 'gemini' ? 'good' : 'neutral'}>{it.source.itinerary === 'gemini' ? 'Personalised with Gemini' : 'Built-in planner'}</Badge>
          <Badge tone={demoPlaces ? 'warn' : 'good'}>{demoPlaces ? 'Demo mode · sample stays & dining' : 'Verified live listings'}</Badge>
        </div>

        <div className="no-print mt-7 flex flex-wrap gap-2.5" role="toolbar" aria-label="Trip actions">
          <button type="button" onClick={onSave} className="btn-primary"><Bookmark className="h-4 w-4" /> Save trip</button>
          <button type="button" onClick={() => setEditing((v) => !v)} aria-pressed={editing} className={editing ? 'btn-primary' : 'btn-ghost'}>{editing ? <><Check className="h-4 w-4" /> Done editing</> : <><Pencil className="h-4 w-4" /> Edit itinerary</>}</button>
          <button type="button" onClick={() => void generate()} className="btn-ghost"><RefreshCw className="h-4 w-4" /> Regenerate</button>
          <button type="button" onClick={() => window.print()} className="btn-ghost"><Download className="h-4 w-4" /> Download PDF</button>
          <button type="button" onClick={() => void onShare()} className="btn-ghost"><Share2 className="h-4 w-4" /> Share</button>
          <button type="button" onClick={() => void onCopy()} className="btn-ghost"><Copy className="h-4 w-4" /> Copy summary</button>
          <Link href="/preferences" onClick={() => setStep(0)} className="btn-ghost"><SlidersHorizontal className="h-4 w-4" /> Revisit answers</Link>
        </div>
      </header>

      {/* notices */}
      <div className="no-print mt-6 grid gap-3">
        {stale && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4 sm:p-5" role="status">
            <p className="flex items-start gap-2.5 text-[1rem] text-ivory"><Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" /> You changed your answers after this plan was made.</p>
            <button type="button" onClick={() => void generate()} className="btn-primary !min-h-[44px]"><RefreshCw className="h-4 w-4" /> Regenerate with new answers</button>
          </div>
        )}
        {warnings.length > 0 && (
          <ul className="grid gap-1.5 rounded-2xl border bg-cocoa-900/70 p-4 text-[0.92rem] text-sand sm:p-5">
            {warnings.map((w) => <li key={w} className="flex items-start gap-2.5"><Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {w}</li>)}
          </ul>
        )}
      </div>

      {/* overview */}
      <section aria-label="Trip overview" className="mt-8">
        <dl className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <OverviewItem label="Destination" value={names} />
          <OverviewItem label="Travel dates" value={`${prettyDateLong(it.startDate)} → ${prettyDateLong(it.endDate)}`} />
          <OverviewItem label="Duration" value={`${it.days.length} days`} sub={`${it.nights} night${it.nights === 1 ? '' : 's'}`} />
          <OverviewItem label="Travellers" value={`${it.travellers}`} sub={prefs.children > 0 ? `${prefs.adults} adults · ${prefs.children} children` : `${prefs.groupType}`} />
          <OverviewItem label="Travel style" value={it.overview.style} />
          <OverviewItem label="Total estimated budget" value={inr(it.budget.total)} sub={`of ${inr(it.budget.budget)} · estimated`} />
          <OverviewItem label="Accommodation" value={it.overview.stayPref} />
          <OverviewItem label="Food" value={it.overview.foodPref} />
          <OverviewItem label="Transport" value={it.overview.transportPref} />
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-cocoa-700 to-cocoa-800 p-4 sm:p-5">
            <dt className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-gold">Per person / day</dt>
            <dd className="mt-1.5 flex items-center gap-2 font-serif text-[1.5rem] font-semibold"><PiggyBank className="h-5 w-5 text-gold" /> {inr(it.budget.perDay / Math.max(1, it.travellers))}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-10 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {/* tabs */}
          <div className="no-print sticky top-[7.9rem] z-30 -mx-5 mb-7 border-b bg-cocoa-950/90 px-5 backdrop-blur-xl sm:-mx-8 sm:px-8 xl:mx-0 xl:rounded-2xl xl:border xl:px-3">
            <div className="flex gap-1 overflow-x-auto py-2 scroll-thin" role="tablist" aria-label="Trip sections">
              {TABS.map((t) => (
                <button key={t.key} type="button" role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`panel-${t.key}`} onClick={() => setTab(t.key)} className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[0.95rem] font-semibold transition ${tab === t.key ? 'text-gold' : 'text-sand hover:text-ivory'}`}>
                  {tab === t.key && <motion.span layoutId="planner-tab" className="absolute inset-0 rounded-xl bg-gold/12" transition={{ duration: 0.25 }} />}
                  <t.icon className="relative h-4 w-4" /> <span className="relative">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* every panel stays in the DOM for printing; only the active one shows on screen */}
          <div id="panel-itinerary" role="tabpanel" aria-labelledby="tab-itinerary" className={tab === 'itinerary' ? '' : 'hidden print:block'}>
            <ItineraryTab it={it} prefs={prefs} editing={editing} onEdit={edit} onAsk={askAboutDay} />
          </div>
          <div id="panel-stays" role="tabpanel" aria-labelledby="tab-stays" className={tab === 'stays' ? '' : 'hidden print:block'}>
            <h2 className="mb-6 hidden font-serif text-[2rem] print:block">Stays</h2>
            <StaysTab it={it} prefs={prefs} onChoose={chooseStay} onAsk={askStay} />
          </div>
          <div id="panel-dining" role="tabpanel" aria-labelledby="tab-dining" className={tab === 'dining' ? '' : 'hidden print:block'}>
            <h2 className="mb-6 hidden font-serif text-[2rem] print:block">Dining</h2>
            <DiningTab it={it} prefs={prefs} />
          </div>
          <div id="panel-attractions" role="tabpanel" aria-labelledby="tab-attractions" className={tab === 'attractions' ? '' : 'hidden print:block'}>
            <h2 className="mb-6 hidden font-serif text-[2rem] print:block">Attractions</h2>
            <AttractionsTab it={it} prefs={prefs} />
          </div>
          <div id="panel-budget" role="tabpanel" aria-labelledby="tab-budget" className={tab === 'budget' ? '' : 'hidden print:block'}>
            <h2 className="mb-6 hidden font-serif text-[2rem] print:block">Budget</h2>
            <BudgetTab it={it} />
          </div>
        </div>

        {/* assistant — docked on large screens */}
        <aside className="no-print hidden xl:sticky xl:top-[7.9rem] xl:block">
          <Assistant {...assistantProps} idSuffix="dock" className="h-[calc(100svh-10.5rem)] max-h-[780px]" />
        </aside>
      </div>

      {/* saved trips */}
      {saved.length > 0 && (
        <section className="no-print mt-16" aria-label="Saved trips">
          <h2 className="font-serif text-[1.8rem] font-semibold">Saved on this device</h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {saved.map((t) => (
              <li key={t.id} className="lux-card flex items-center justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{t.title}</p>
                  <p className="text-[0.85rem] text-muted">Saved {new Date(t.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => { loadTrip(t.id); setTab('itinerary'); flash('Trip loaded.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn-quiet">Open</button>
                  <button type="button" onClick={() => deleteTrip(t.id)} aria-label={`Delete ${t.title}`} className="btn-quiet !px-3 hover:!bg-rose-500/20"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* assistant — drawer on smaller screens */}
      <button type="button" onClick={() => setChatOpen(true)} className="no-print btn-primary fixed bottom-5 right-5 z-40 !min-h-[56px] !rounded-full shadow-lux xl:hidden" aria-label="Open the Tripzy assistant"><MessageCircle className="h-5 w-5" /> Ask Tripzy</button>
      <AnimatePresence>
        {chatOpen && (
          <motion.div className="no-print fixed inset-0 z-[70] flex items-end justify-center xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close assistant" className="absolute inset-0 bg-cocoa-950/80 backdrop-blur-sm" onClick={() => setChatOpen(false)} />
            <motion.div className="relative w-full max-w-xl p-3" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <button type="button" onClick={() => setChatOpen(false)} aria-label="Close" className="absolute right-6 top-6 z-10 grid h-9 w-9 place-items-center rounded-full bg-cocoa-950/70 text-ivory"><X className="h-4 w-4" /></button>
              <Assistant {...assistantProps} idSuffix="sheet" className="h-[min(82svh,720px)]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toast */}
      <AnimatePresence>
        {notice && (
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="no-print fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl border border-gold/40 bg-cocoa-900 px-5 py-3 text-[0.95rem] font-semibold text-ivory shadow-lux" role="status">
            <Sparkles className="mr-2 inline h-4 w-4 text-gold" /> {notice}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
