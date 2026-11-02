'use client';

import { AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import type { Itinerary } from '@/types';
import { inr } from '@/lib/utils';

const COLORS = ['#D6AE78', '#C18A57', '#8FB8A0', '#7DA3C7', '#B58AC9', '#E0856B', '#E8C86A', '#9C8573'];

function Tile({ label, value, note, tone = 'text-ivory' }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="lux-card p-5">
      <p className="text-[0.74rem] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-2 font-serif text-[1.9rem] font-semibold leading-none ${tone}`}>{value}</p>
      {note && <p className="mt-2 text-[0.85rem] text-muted">{note}</p>}
    </div>
  );
}

export default function BudgetTab({ it }: { it: Itinerary }) {
  const b = it.budget;
  const total = Math.max(1, b.lines.reduce((s, l) => s + l.amount, 0));
  const R = 78;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const used = Math.min(100, (b.total / Math.max(1, b.budget)) * 100);

  return (
    <div className="grid gap-7">
      <div className={`flex items-start gap-3.5 rounded-2xl border p-5 ${b.over ? 'border-amber-400/40 bg-amber-400/10' : 'border-emerald-400/30 bg-emerald-400/10'}`} role="status">
        {b.over ? <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" /> : <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />}
        <p className="text-[1.05rem] text-ivory">
          {b.over ? <>This plan is estimated at <strong>{inr(b.total)}</strong>, which is <strong>{inr(-b.remaining)} over</strong> your {inr(b.budget)} budget.</> : <>Estimated <strong>{inr(b.total)}</strong> — about <strong>{inr(b.remaining)}</strong> within your {inr(b.budget)} budget.</>}
          <span className="block text-[0.9rem] text-sand">All figures are estimates built from typical Indian prices, not confirmed quotes.</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Tile label="Total budget" value={inr(b.budget)} />
        <Tile label="Estimated cost" value={inr(b.total)} tone={b.over ? 'text-amber-300' : 'text-gold'} />
        <Tile label={b.over ? 'Over budget' : 'Remaining'} value={inr(Math.abs(b.remaining))} tone={b.over ? 'text-amber-300' : 'text-emerald-300'} />
        <Tile label="Cost per person" value={inr(b.perPerson)} note={`${it.travellers} traveller${it.travellers > 1 ? 's' : ''}`} />
        <Tile label="Cost per day" value={inr(b.perDay)} note={`${it.days.length} days`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="lux-card grid place-items-center p-8">
          <svg viewBox="0 0 200 200" className="h-[250px] w-[250px]" role="img" aria-label="Budget split by category">
            <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="26" />
            {b.lines.map((l, i) => {
              const len = (l.amount / total) * C;
              const el = <circle key={l.key} cx="100" cy="100" r={R} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="26" strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`} strokeDashoffset={-offset} transform="rotate(-90 100 100)" />;
              offset += len;
              return el;
            })}
            <text x="100" y="94" textAnchor="middle" fill="#9C8573" fontSize="9" fontWeight="700" letterSpacing="1.5">ESTIMATED</text>
            <text x="100" y="116" textAnchor="middle" fill="#F5E8D5" fontSize="19" fontWeight="600" fontFamily="serif">{inr(b.total)}</text>
          </svg>
          <div className="mt-6 w-full">
            <div className="mb-1.5 flex justify-between text-[0.8rem] font-bold uppercase tracking-[0.12em] text-muted"><span>Budget used</span><span>{Math.round((b.total / Math.max(1, b.budget)) * 100)}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${b.over ? 'bg-amber-400' : 'bg-gradient-to-r from-caramel to-gold'}`} style={{ width: `${used}%` }} /></div>
          </div>
        </div>

        <div className="lux-card p-6 sm:p-7">
          <h3 className="font-serif text-[1.6rem] font-semibold">Where the money goes</h3>
          <ul className="mt-5 divide-y divide-white/10">
            {b.lines.map((l, i) => (
              <li key={l.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3.5 gap-y-1 py-3.5">
                <span className="h-3.5 w-3.5 rounded" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-[1.02rem] text-ivory">{l.label}</span>
                <span className="text-right font-semibold tabular-nums">{inr(l.amount)} <span className="ml-1 text-[0.82rem] font-normal text-muted">{Math.round((l.amount / total) * 100)}%</span></span>
              </li>
            ))}
            <li className="flex justify-between pt-4 text-[1.1rem] font-bold"><span>Total</span><span className="tabular-nums text-gold">{inr(b.total)}</span></li>
          </ul>
        </div>
      </div>

      {b.suggestions.length > 0 && (
        <div className="lux-card p-6 sm:p-7">
          <h3 className="flex items-center gap-2.5 font-serif text-[1.5rem] font-semibold"><Lightbulb className="h-5 w-5 text-gold" /> {b.over ? 'Ways to bring it back in line' : 'A thought'}</h3>
          <ul className="mt-4 grid gap-3 text-[1rem] leading-snug text-sand">{b.suggestions.map((s) => <li key={s}>• {s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
