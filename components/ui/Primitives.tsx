'use client';

import { Check, Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

/** Small toggle chip — used for multi-select answers (interests, facilities, filters). */
export function Chip({ active, onClick, children, disabled = false, title }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2 text-[0.95rem] font-semibold transition duration-200 disabled:opacity-40 ${
        active ? 'border-gold bg-gold/15 text-gold shadow-[0_0_0_1px_rgba(214,174,120,0.35)]' : 'bg-cocoa-900/70 text-sand hover:border-gold/50 hover:text-ivory'
      }`}
    >
      {active && <Check className="h-4 w-4" strokeWidth={3} />}
      {children}
    </button>
  );
}

/** A larger single-select card with a title and an explanation. */
export function OptionCard({ active, onClick, title, desc, icon }: { active: boolean; onClick: () => void; title: string; desc?: string; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition duration-200 sm:p-5 ${
        active ? 'border-gold bg-gradient-to-br from-cocoa-700 to-cocoa-800 shadow-glow' : 'bg-cocoa-800/70 hover:-translate-y-0.5 hover:border-gold/50 hover:bg-cocoa-800'
      }`}
    >
      {icon && <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-gold text-cocoa-950' : 'bg-cocoa-900 text-gold'}`}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[1.05rem] font-semibold text-ivory">{title}</span>
        {desc && <span className="mt-1 block text-[0.92rem] leading-snug text-sand">{desc}</span>}
      </span>
      <span className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${active ? 'border-gold bg-gold text-cocoa-950' : 'border-white/20 text-transparent'}`}>
        <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
      </span>
    </button>
  );
}

/** Segmented control for short exclusive choices (yes/no, private/shared...). */
export function Segmented<T extends string | number | boolean>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1.5 rounded-2xl border bg-cocoa-900/80 p-1.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`min-h-[44px] rounded-xl px-5 text-[0.95rem] font-semibold transition ${on ? 'bg-gradient-to-b from-gold to-caramel text-cocoa-950 shadow-glow' : 'text-sand hover:text-ivory'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** − 2 + stepper. */
export function Counter({ value, onChange, min = 0, max = 20, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border bg-cocoa-900/80 p-1.5" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="grid h-11 w-11 place-items-center rounded-xl text-gold transition hover:bg-gold/10 disabled:opacity-30">
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-10 text-center font-serif text-[1.4rem] font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="grid h-11 w-11 place-items-center rounded-xl text-gold transition hover:bg-gold/10 disabled:opacity-30">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** A labelled block used for each question on a questionnaire screen. */
export function Question({ title, hint, optional = false, children }: { title: string; hint?: string; optional?: boolean; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 flex flex-wrap items-center gap-2.5 text-[1.12rem] font-semibold text-ivory">
        {title}
        {optional && <span className="rounded-md bg-cocoa-700/70 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-sand">Optional</span>}
      </legend>
      {hint && <p className="mb-3.5 text-[0.95rem] text-muted">{hint}</p>}
      {!hint && <div className="h-3" />}
      {children}
    </fieldset>
  );
}

/** Compact status pill, e.g. “Verified” / “Estimated” / “Demo sample”. */
export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'warn' | 'gold'; children: ReactNode }) {
  const tones = {
    neutral: 'border-white/15 bg-white/5 text-sand',
    good: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    warn: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
    gold: 'border-gold/50 bg-gold/10 text-gold',
  } as const;
  return <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.72rem] font-bold uppercase tracking-[0.1em] ${tones[tone]}`}>{children}</span>;
}
