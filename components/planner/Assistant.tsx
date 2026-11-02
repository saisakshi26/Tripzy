'use client';

import { useEffect, useRef, type FormEvent } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import type { DayPlan } from '@/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  changed?: boolean;
}

interface Props {
  messages: ChatMessage[];
  busy: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onSend: (text: string) => void;
  days: DayPlan[];
  focusDay: number;
  setFocusDay: (n: number) => void;
  className?: string;
  idSuffix: string;
}

export default function Assistant({ messages, busy, draft, setDraft, onSend, days, focusDay, setFocusDay, className = '', idSuffix }: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, busy]);

  const chips = [
    'Can you replace this hotel?',
    'Suggest cheaper restaurants',
    'Add one more adventure activity',
    `Make Day ${focusDay} more relaxed`,
    'Find vegetarian restaurants nearby',
    'Reduce the total budget',
    'Suggest alternatives to this attraction',
  ];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t || busy) return;
    onSend(t);
  };

  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-gold/25 bg-cocoa-900 shadow-lux ${className}`} aria-label="Tripzy AI assistant">
      <header className="flex items-center gap-3 border-b bg-gradient-to-r from-cocoa-700/60 to-cocoa-800 p-4 sm:p-5">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold/15 text-gold"><Sparkles className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 className="font-serif text-[1.3rem] font-semibold leading-tight">Tripzy concierge</h2>
          <p className="text-[0.85rem] text-muted">Changes your plan — not just the chat.</p>
        </div>
      </header>

      <div className="border-b p-3.5">
        <label htmlFor={`focus-${idSuffix}`} className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.16em] text-muted">We are talking about</label>
        <select id={`focus-${idSuffix}`} value={focusDay} onChange={(e) => setFocusDay(Number(e.target.value))} className="field !py-2.5 text-[0.95rem]">
          {days.map((d) => <option key={d.day} value={d.day}>Day {d.day} · {d.areaName}</option>)}
        </select>
      </div>

      <div className="min-h-[220px] flex-1 space-y-3 overflow-y-auto p-4 scroll-thin" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] whitespace-pre-line rounded-2xl px-4 py-3 text-[0.97rem] leading-relaxed ${m.role === 'user' ? 'rounded-br-md bg-gradient-to-b from-gold to-caramel font-medium text-cocoa-950' : 'rounded-bl-md border bg-cocoa-800 text-ivory'}`}>
              {m.text}
              {m.changed && <span className="mt-2 block text-[0.72rem] font-bold uppercase tracking-[0.14em] text-gold">✓ Itinerary updated</span>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-cocoa-800 px-4 py-3 text-sand"><Loader2 className="h-4 w-4 animate-spin text-gold" /> Updating your trip…</div></div>
        )}
        <div ref={end} />
      </div>

      <div className="border-t p-3.5">
        <div className="mb-3 flex max-h-[104px] flex-wrap gap-2 overflow-y-auto scroll-thin">
          {chips.map((c) => (
            <button key={c} type="button" disabled={busy} onClick={() => onSend(c)} className="rounded-lg border bg-cocoa-800 px-3 py-1.5 text-left text-[0.82rem] font-semibold text-sand transition hover:border-gold/60 hover:text-gold disabled:opacity-50">{c}</button>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={300} placeholder="Ask Tripzy to change something…" aria-label="Message the assistant" className="field !py-3" />
          <button type="submit" disabled={busy || !draft.trim()} className="btn-primary !min-h-[50px] !px-4" aria-label="Send"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </section>
  );
}
