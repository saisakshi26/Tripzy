'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Accessibility, ArrowLeft, ArrowRight, Backpack, Bike, Building2, Bus, Car, Check, Compass, Gem, Heart, Home, KeyRound, Landmark, MapPin,
  Sparkles, Truck, User, Users, UtensilsCrossed, Wallet, Wine, type LucideIcon,
} from 'lucide-react';
import { useTrip } from '@/hooks/useTrip';
import { Chip, Counter, OptionCard, Question, Segmented } from '@/components/ui/Primitives';
import DestImage from '@/components/ui/DestImage';
import { destinations, getDestination } from '@/lib/data/destinations';
import { FACILITY_OPTIONS } from '@/lib/stays';
import { tripDays, totalBudgetOf, travellerCount, validatePrefs } from '@/lib/defaults';
import { diffDays, inr, toISODate } from '@/lib/utils';
import type { Alcohol, BudgetTier, Diet, FoodStyle, GroupType, Kind, Pace, Preferences, StayType, TransportMode } from '@/types';

type SetFn = (patch: Partial<Preferences>) => void;
interface StepProps { prefs: Preferences; set: SetFn; errors: string[]; today: string; goTo: (n: number) => void }

const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/* ───────────── A · basics ───────────── */
const GROUPS: { v: GroupType; label: string; desc: string; icon: LucideIcon; adults: number }[] = [
  { v: 'solo', label: 'Solo', desc: 'Just me, on my own schedule', icon: User, adults: 1 },
  { v: 'couple', label: 'Couple', desc: 'Two of us, romance welcome', icon: Heart, adults: 2 },
  { v: 'friends', label: 'Friends', desc: 'A group that travels well together', icon: Users, adults: 4 },
  { v: 'family', label: 'Family', desc: 'Multi-generation or with kids', icon: Home, adults: 2 },
];

function StepBasics({ prefs, set, errors, today }: StepProps) {
  const days = tripDays(prefs);
  const onStart = (v: string) => {
    const patch: Partial<Preferences> = { startDate: v };
    if (!prefs.endDate || (v && diffDays(v, prefs.endDate) < 0)) patch.endDate = v;
    set(patch);
  };
  return (
    <div className="grid gap-9">
      <Question title="Where would you like to go?" hint="Pick one place or combine up to four. Tripzy will route them sensibly.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {destinations.map((d) => {
            const on = prefs.destinationIds.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={on}
                onClick={() => set({ destinationIds: on ? prefs.destinationIds.filter((x) => x !== d.id) : [...prefs.destinationIds, d.id].slice(-4) })}
                className={`group relative overflow-hidden rounded-2xl border text-left transition ${on ? 'border-gold shadow-glow' : 'hover:border-gold/50'}`}
              >
                <DestImage id={d.id} query={d.imageQuery} alt="" className="aspect-[4/3] w-full" imgClassName="transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-cocoa-950 via-cocoa-950/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-3 text-[1rem] font-semibold leading-tight">{d.name}</span>
                {on && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-gold text-cocoa-950"><Check className="h-4 w-4" strokeWidth={3.5} /></span>}
              </button>
            );
          })}
        </div>
        {errors.some((e) => e.includes('destination')) && <p className="mt-2 text-[0.92rem] font-semibold text-amber-300">Choose at least one destination to continue.</p>}
      </Question>

      <Question title="Travelling from" hint="Used to size intercity travel. A city name is enough." optional>
        <div className="relative max-w-md">
          <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input className="field !pl-12" placeholder="e.g. Hyderabad" value={prefs.origin} maxLength={60} onChange={(e) => set({ origin: e.target.value })} />
        </div>
      </Question>

      <Question title="When are you travelling?">
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Start date</span>
            <input type="date" className="field" min={today || undefined} value={prefs.startDate} onChange={(e) => onStart(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">End date</span>
            <input type="date" className="field" min={prefs.startDate || today || undefined} value={prefs.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </label>
        </div>
        {days > 0 && <p className="mt-3 text-[1rem] font-semibold text-gold">{days} {days === 1 ? 'day' : 'days'} · {Math.max(0, days - 1)} {days === 2 ? 'night' : 'nights'}</p>}
        {errors.filter((e) => /date|Trips longer/i.test(e)).map((e) => <p key={e} className="mt-2 text-[0.92rem] font-semibold text-amber-300">{e}</p>)}
      </Question>

      <Question title="Who is coming along?">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((g) => (
            <OptionCard key={g.v} active={prefs.groupType === g.v} title={g.label} desc={g.desc} icon={<g.icon className="h-5 w-5" />} onClick={() => set({ groupType: g.v, adults: g.adults, children: g.v === 'family' ? Math.max(prefs.children, 1) : 0 })} />
          ))}
        </div>
      </Question>

      <Question title="How many travellers?">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
          <div>
            <span className="label">Adults</span>
            <Counter label="adults" value={prefs.adults} min={1} max={12} onChange={(n) => set({ adults: n })} />
          </div>
          <div>
            <span className="label">Children <span className="font-normal text-muted">(under 12)</span></span>
            <Counter label="children" value={prefs.children} min={0} max={8} onChange={(n) => set({ children: n })} />
          </div>
          <p className="text-[1rem] text-sand">Total: <strong className="text-ivory">{travellerCount(prefs)}</strong></p>
        </div>
      </Question>
    </div>
  );
}

/* ───────────── B · budget ───────────── */
const TIERS: { v: BudgetTier; label: string; desc: string; icon: LucideIcon }[] = [
  { v: 'budget', label: 'Budget', desc: 'Hostels, homestays, local eateries', icon: Backpack },
  { v: 'standard', label: 'Standard', desc: 'Comfortable hotels, a mix of dining', icon: Building2 },
  { v: 'premium', label: 'Premium', desc: 'Upscale stays, curated experiences', icon: Sparkles },
  { v: 'luxury', label: 'Luxury', desc: 'Signature resorts, private transfers', icon: Gem },
];

function StepBudget({ prefs, set }: StepProps) {
  const total = totalBudgetOf(prefs);
  const days = Math.max(1, tripDays(prefs));
  const T = travellerCount(prefs);
  const perDay = total / (T * days);
  const dests = prefs.destinationIds.map((id) => getDestination(id)).filter((d): d is NonNullable<ReturnType<typeof getDestination>> => !!d);
  const lo = dests.length ? dests.reduce((s, d) => s + d.dailyBudget[0], 0) / dests.length : 0;
  const hi = dests.length ? dests.reduce((s, d) => s + d.dailyBudget[1], 0) / dests.length : 0;
  const verdict = !dests.length ? '' : perDay < lo ? 'That is below the usual range — Tripzy will lean on hostels, homestays and local food.' : perDay > hi ? 'That is above the usual range — plenty of room for premium stays and signature experiences.' : 'That sits comfortably inside the typical range for your destinations.';

  return (
    <div className="grid gap-9">
      <Question title="What is your total budget?" hint="Include stays, food, local travel and activities. Flights to and from India are not included.">
        <div className="grid max-w-2xl gap-5">
          <div className="relative max-w-sm">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-serif text-[1.3rem] text-gold">₹</span>
            <input type="number" inputMode="numeric" min={1000} step={1000} className="field !pl-10 !text-[1.3rem] font-semibold" value={prefs.budgetTotal || ''} onChange={(e) => set({ budgetTotal: Math.max(0, Math.min(10000000, Number(e.target.value) || 0)) })} aria-label="Total budget in rupees" />
          </div>
          <input type="range" min={5000} max={600000} step={5000} value={Math.min(600000, Math.max(5000, prefs.budgetTotal || 5000))} onChange={(e) => set({ budgetTotal: Number(e.target.value) })} className="w-full" aria-label="Budget slider" />
          <Segmented label="Budget applies to" value={prefs.budgetScope} onChange={(v) => set({ budgetScope: v })} options={[{ value: 'group', label: 'Entire group' }, { value: 'person', label: 'Per person' }]} />
        </div>
        <div className="mt-6 max-w-2xl rounded-2xl border border-gold/25 bg-cocoa-800/70 p-5">
          <p className="text-[1.05rem] text-sand">Group budget <strong className="text-ivory">{inr(total)}</strong> · about <strong className="text-gold">{inr(perDay)}</strong> per person per day over {days} {days === 1 ? 'day' : 'days'}.</p>
          {verdict && <p className="mt-2 text-[0.95rem] text-muted">{verdict}{lo > 0 && <> Typical here: {inr(lo)} – {inr(hi)} pp/day.</>}</p>}
        </div>
      </Question>

      <Question title="Which feels most like you?" hint="This shapes the style of stays, dining and transfers.">
        <div className="grid gap-3 sm:grid-cols-2">
          {TIERS.map((t) => (
            <OptionCard key={t.v} active={prefs.tier === t.v} title={t.label} desc={t.desc} icon={<t.icon className="h-5 w-5" />} onClick={() => set({ tier: t.v })} />
          ))}
        </div>
      </Question>
    </div>
  );
}

/* ───────────── C · food ───────────── */
const DIETS: { v: Diet; label: string }[] = [
  { v: 'vegetarian', label: 'Vegetarian' },
  { v: 'vegan', label: 'Vegan' },
  { v: 'eggetarian', label: 'Eggetarian' },
  { v: 'non-vegetarian', label: 'Non-vegetarian' },
  { v: 'none', label: 'No restrictions' },
];
const FOOD_STYLES: { v: FoodStyle; label: string }[] = [
  { v: 'local', label: 'Local cuisine' },
  { v: 'street', label: 'Street food' },
  { v: 'fine', label: 'Fine dining' },
  { v: 'cafes', label: 'Cafes' },
  { v: 'traditional', label: 'Traditional restaurants' },
];

function StepFood({ prefs, set }: StepProps) {
  return (
    <div className="grid gap-9">
      <Question title="Are you comfortable with alcohol?" hint="If not, bars, pubs and alcohol-centred experiences are left out of your plan.">
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ['yes', 'Yes', 'Include bars, breweries and sundowners'],
            ['no', 'No', 'Keep everything alcohol-free'],
            ['avoid', 'Prefer not to include', 'Skip alcohol-centred activities, no fuss'],
          ] as [Alcohol, string, string][]).map(([v, t, d]) => (
            <OptionCard key={v} active={prefs.alcohol === v} title={t} desc={d} icon={<Wine className="h-5 w-5" />} onClick={() => set({ alcohol: v })} />
          ))}
        </div>
      </Question>
      <Question title="What do you eat?">
        <div className="flex flex-wrap gap-2.5">
          {DIETS.map((d) => <Chip key={d.v} active={prefs.diet === d.v} onClick={() => set({ diet: d.v })}>{d.label}</Chip>)}
        </div>
      </Question>
      <Question title="Allergies or dietary restrictions" hint="For example: peanuts, shellfish, gluten, Jain food." optional>
        <input className="field max-w-xl" value={prefs.allergies} maxLength={200} placeholder="Tell us anything we should keep off your plate" onChange={(e) => set({ allergies: e.target.value })} />
      </Question>
      <Question title="What do you love to eat out?" hint="Pick all that apply.">
        <div className="flex flex-wrap gap-2.5">
          {FOOD_STYLES.map((f) => <Chip key={f.v} active={prefs.foodInterests.includes(f.v)} onClick={() => set({ foodInterests: toggle(prefs.foodInterests, f.v) })}>{f.label}</Chip>)}
        </div>
      </Question>
    </div>
  );
}

/* ───────────── D · transport ───────────── */
const TRANSPORT: { v: TransportMode; label: string; desc: string; icon: LucideIcon }[] = [
  { v: 'own', label: 'Own vehicle', desc: 'You are driving yourselves', icon: Car },
  { v: 'rental', label: 'Rental car', desc: 'Self-drive or with driver', icon: KeyRound },
  { v: 'public', label: 'Public transport', desc: 'Trains, buses, metro, walking', icon: Bus },
  { v: 'cab', label: 'Cab / taxi', desc: 'Door-to-door, no hassle', icon: Truck },
  { v: 'bike', label: 'Bike rental', desc: 'Scooters and motorbikes', icon: Bike },
  { v: 'mix', label: 'Mix of options', desc: 'Whatever suits each leg', icon: Compass },
];

function StepTransport({ prefs, set }: StepProps) {
  return (
    <div className="grid gap-9">
      <Question title="How do you prefer getting around?">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRANSPORT.map((t) => <OptionCard key={t.v} active={prefs.transport === t.v} title={t.label} desc={t.desc} icon={<t.icon className="h-5 w-5" />} onClick={() => set({ transport: t.v })} />)}
        </div>
      </Question>
      <div className="grid gap-9 sm:grid-cols-2">
        <Question title="Do you have your own vehicle?">
          <Segmented label="Own vehicle" value={prefs.hasVehicle} onChange={(v) => set({ hasVehicle: v })} options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} />
        </Question>
        <Question title="Comfortable driving long distances?">
          <Segmented label="Long drives" value={prefs.longDrives} onChange={(v) => set({ longDrives: v })} options={[{ value: true, label: 'Yes' }, { value: false, label: 'Prefer not' }]} />
        </Question>
      </div>
    </div>
  );
}

/* ───────────── E · stay ───────────── */
const STAYS: { v: StayType; label: string }[] = [
  { v: 'hotel', label: 'Hotel' },
  { v: 'hostel', label: 'Hostel' },
  { v: 'resort', label: 'Resort' },
  { v: 'homestay', label: 'Homestay' },
  { v: 'boutique', label: 'Boutique stay' },
  { v: 'any', label: 'No preference' },
];

function StepStay({ prefs, set }: StepProps) {
  const capped = prefs.nightlyBudget > 0;
  return (
    <div className="grid gap-9">
      <Question title="Where would you like to stay?">
        <div className="flex flex-wrap gap-2.5">{STAYS.map((s) => <Chip key={s.v} active={prefs.stayType === s.v} onClick={() => set({ stayType: s.v })}>{s.label}</Chip>)}</div>
      </Question>
      <div className="grid gap-9 sm:grid-cols-2">
        <Question title="Room type">
          <Segmented label="Room type" value={prefs.room} onChange={(v) => set({ room: v })} options={[{ value: 'private', label: 'Private room' }, { value: 'shared', label: 'Shared room' }]} />
        </Question>
        <Question title="Minimum guest rating" hint="Applied to live listings. Sample listings carry no rating.">
          <Segmented label="Minimum rating" value={prefs.minRating} onChange={(v) => set({ minRating: v })} options={[{ value: 4, label: '4.0+' }, { value: 4.2, label: '4.2+' }, { value: 4.5, label: '4.5+' }]} />
        </Question>
      </div>
      <Question title="Preferred price per night" hint="Per room (per bed for hostels). Leave uncapped to let your budget category decide." optional>
        <div className="flex flex-wrap items-center gap-4">
          <Segmented label="Nightly cap" value={capped} onChange={(v) => set({ nightlyBudget: v ? 4000 : 0 })} options={[{ value: false, label: 'No cap' }, { value: true, label: 'Set a cap' }]} />
          {capped && (
            <div className="relative w-44">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gold">₹</span>
              <input type="number" inputMode="numeric" min={300} step={500} className="field !pl-9" value={prefs.nightlyBudget || ''} onChange={(e) => set({ nightlyBudget: Math.max(0, Number(e.target.value) || 0) })} aria-label="Maximum price per night" />
            </div>
          )}
        </div>
      </Question>
      <Question title="Facilities you need" hint="Pick any that matter.">
        <div className="flex flex-wrap gap-2.5">{FACILITY_OPTIONS.map((f) => <Chip key={f} active={prefs.facilities.includes(f)} onClick={() => set({ facilities: toggle(prefs.facilities, f) })}>{f}</Chip>)}</div>
      </Question>
    </div>
  );
}

/* ───────────── F · interests ───────────── */
const INTERESTS: { v: Kind; label: string }[] = [
  { v: 'adventure', label: 'Adventure' }, { v: 'trekking', label: 'Trekking' }, { v: 'beaches', label: 'Beaches' }, { v: 'nature', label: 'Nature' },
  { v: 'photography', label: 'Photography' }, { v: 'shopping', label: 'Shopping' }, { v: 'heritage', label: 'Heritage' }, { v: 'temples', label: 'Temples' },
  { v: 'nightlife', label: 'Nightlife' }, { v: 'relaxation', label: 'Relaxation' }, { v: 'water', label: 'Water sports' }, { v: 'wildlife', label: 'Wildlife' },
  { v: 'food', label: 'Food exploration' }, { v: 'culture', label: 'Cultural experiences' },
];

function StepInterests({ prefs, set }: StepProps) {
  return (
    <Question title="What makes a trip great for you?" hint="Choose as many as you like — the more you pick, the more varied your days.">
      <div className="flex flex-wrap gap-3">
        {INTERESTS.map((i) => <Chip key={i.v} active={prefs.interests.includes(i.v)} onClick={() => set({ interests: toggle(prefs.interests, i.v) })}>{i.label}</Chip>)}
      </div>
      {prefs.alcohol !== 'yes' && prefs.interests.includes('nightlife') && <p className="mt-4 text-[0.95rem] text-muted">Nightlife will focus on live music, night markets and cultural evenings — no bars or pubs.</p>}
    </Question>
  );
}

/* ───────────── G · personality ───────────── */
function StepPersonality({ prefs, set }: StepProps) {
  const row = <T extends string>(title: string, key: keyof Preferences, value: T, options: { value: T; label: string; desc: string }[]) => (
    <Question title={title}>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((o) => <OptionCard key={o.value} active={value === o.value} title={o.label} desc={o.desc} onClick={() => set({ [key]: o.value } as Partial<Preferences>)} />)}
      </div>
    </Question>
  );
  return (
    <div className="grid gap-9">
      {row<Pace>('Relaxed or packed?', 'pace', prefs.pace, [
        { value: 'relaxed', label: 'Relaxed', desc: '1–2 highlights a day, long lunches' },
        { value: 'balanced', label: 'Balanced', desc: 'A good mix of sights and slack' },
        { value: 'packed', label: 'Packed', desc: 'See as much as possible' },
      ])}
      {row('Early mornings or late starts?', 'earlyStart', prefs.earlyStart, [
        { value: 'early' as const, label: 'Early riser', desc: 'Out by 7 AM for golden light' },
        { value: 'flexible' as const, label: 'Flexible', desc: 'Around 8:30 AM' },
        { value: 'late' as const, label: 'Late starter', desc: 'Slow mornings, 10 AM start' },
      ])}
      {row('Hidden gems or famous sights?', 'discovery', prefs.discovery, [
        { value: 'hidden' as const, label: 'Hidden gems', desc: 'Off the beaten path' },
        { value: 'mix' as const, label: 'A bit of both', desc: 'Icons plus local secrets' },
        { value: 'famous' as const, label: 'Famous sights', desc: 'The must-sees first' },
      ])}
      {row('How much walking is comfortable?', 'walking', prefs.walking, [
        { value: 'low' as const, label: 'Light', desc: 'Short, easy strolls only' },
        { value: 'moderate' as const, label: 'Moderate', desc: 'A few hours on foot' },
        { value: 'high' as const, label: 'Lots', desc: 'Happy to hike and wander' },
      ])}
      {row('Guided tours or independent exploring?', 'guided', prefs.guided, [
        { value: 'guided' as const, label: 'Guided', desc: 'Local guides where it counts' },
        { value: 'mix' as const, label: 'A mix', desc: 'Guides for big sites only' },
        { value: 'independent' as const, label: 'Independent', desc: 'Our own pace and route' },
      ])}
    </div>
  );
}

/* ───────────── H · accessibility & extras ───────────── */
function StepExtras({ prefs, set, goTo }: StepProps) {
  return (
    <div className="grid gap-9">
      <Question title="Any accessibility requirements?" hint="For example: wheelchair access, step-free rooms, limited stairs." optional>
        <input className="field max-w-xl" maxLength={300} value={prefs.accessibility} placeholder="Tell us what would make the trip easier" onChange={(e) => set({ accessibility: e.target.value })} />
      </Question>
      <div className="grid gap-9 sm:grid-cols-2">
        <Question title="Are senior citizens travelling?">
          <Segmented label="Seniors" value={prefs.seniors} onChange={(v) => set({ seniors: v })} options={[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]} />
        </Question>
        <Question title="Children travelling?">
          <p className="text-[1rem] text-sand">{prefs.children > 0 ? `Yes — ${prefs.children} ${prefs.children === 1 ? 'child' : 'children'}.` : 'No children in this trip.'}{' '}
            <button type="button" onClick={() => goTo(0)} className="font-semibold text-gold underline-offset-4 hover:underline">Change</button>
          </p>
        </Question>
      </div>
      <Question title="Medical or mobility considerations" hint="Share only what you are comfortable with — it is used purely to adjust your plan." optional>
        <input className="field max-w-xl" maxLength={300} value={prefs.medical} placeholder="e.g. knee pain, avoids high altitude" onChange={(e) => set({ medical: e.target.value })} />
      </Question>
      <Question title="Special occasion?" optional>
        <input className="field max-w-xl" maxLength={120} value={prefs.occasion} placeholder="Honeymoon, anniversary, birthday…" onChange={(e) => set({ occasion: e.target.value })} />
      </Question>
      <Question title="Anything else we should know?" optional>
        <textarea className="field min-h-[120px] max-w-2xl resize-y" maxLength={600} value={prefs.notes} placeholder="Must-sees, things to avoid, surprises you have planned…" onChange={(e) => set({ notes: e.target.value })} />
      </Question>
    </div>
  );
}

/* ───────────── wizard shell ───────────── */
interface StepDef { key: string; label: string; title: string; sub: string; icon: LucideIcon; optional: boolean; Comp: (p: StepProps) => ReactNode }
const STEPS: StepDef[] = [
  { key: 'basics', label: 'The trip', title: 'Let’s start with the essentials', sub: 'Where, when and who — the foundation of your plan.', icon: Compass, optional: false, Comp: StepBasics },
  { key: 'budget', label: 'Budget', title: 'What are we working with?', sub: 'An honest budget lets us plan something you can actually enjoy.', icon: Wallet, optional: true, Comp: StepBudget },
  { key: 'food', label: 'Food', title: 'Your table, your rules', sub: 'Diet, alcohol and the kind of meals you remember.', icon: UtensilsCrossed, optional: true, Comp: StepFood },
  { key: 'transport', label: 'Getting around', title: 'How shall we move?', sub: 'Routes are planned around the way you like to travel.', icon: Car, optional: true, Comp: StepTransport },
  { key: 'stay', label: 'Stay', title: 'Where do you rest?', sub: 'Style, price and the facilities that matter to you.', icon: Building2, optional: true, Comp: StepStay },
  { key: 'interests', label: 'Interests', title: 'What lights you up?', sub: 'These choose the experiences that fill your days.', icon: Heart, optional: true, Comp: StepInterests },
  { key: 'personality', label: 'Travel personality', title: 'How do you like to travel?', sub: 'Pace, rhythm and independence.', icon: Landmark, optional: true, Comp: StepPersonality },
  { key: 'extras', label: 'Final touches', title: 'A few last details', sub: 'Accessibility, occasions and special requests — all optional.', icon: Accessibility, optional: true, Comp: StepExtras },
];

export default function Wizard() {
  const router = useRouter();
  const { ready, prefs, setPrefs, step, setStep, itinerary, setItinerary, stale } = useTrip();
  const [dir, setDir] = useState(1);
  const [today, setToday] = useState('');
  const [tried, setTried] = useState(false);
  useEffect(() => setToday(toISODate(new Date())), []);

  const idx = Math.min(Math.max(step, 0), STEPS.length - 1);
  const def = STEPS[idx];
  const errors = useMemo(() => validatePrefs(prefs), [prefs]);
  const basicsOk = errors.length === 0;
  const last = idx === STEPS.length - 1;

  const goTo = (n: number) => {
    setDir(n >= idx ? 1 : -1);
    setStep(Math.min(Math.max(n, 0), STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const next = () => {
    if (idx === 0 && !basicsOk) {
      setTried(true);
      return;
    }
    if (last) {
      if (!basicsOk) {
        setTried(true);
        goTo(0);
        return;
      }
      if (stale) setItinerary(null); // answers changed: the planner builds a fresh plan on arrival
      router.push('/planner');
      return;
    }
    goTo(idx + 1);
  };

  if (!ready) {
    return (
      <div className="container-x py-24"><div className="skeleton h-[520px] rounded-3xl" aria-busy="true" aria-label="Loading your answers" /></div>
    );
  }

  const Comp = def.Comp;
  const progress = ((idx + 1) / STEPS.length) * 100;

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-14">
        {/* rail (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-40">
            <p className="eyebrow mb-3">Your travel style</p>
            <h1 className="font-serif text-[2rem] font-semibold leading-tight">A personal consultation</h1>
            <ol className="mt-8 space-y-1">
              {STEPS.map((s, i) => {
                const current = i === idx;
                const done = i < idx || (i === 0 && basicsOk);
                return (
                  <li key={s.key}>
                    <button type="button" onClick={() => goTo(i)} aria-current={current ? 'step' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.98rem] font-semibold transition ${current ? 'bg-gold/12 text-gold' : 'text-sand hover:bg-white/5 hover:text-ivory'}`}>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.8rem] ${done && !current ? 'bg-gold text-cocoa-950' : current ? 'border border-gold' : 'border border-white/20 text-muted'}`}>
                        {done && !current ? <Check className="h-4 w-4" strokeWidth={3.5} /> : i + 1}
                      </span>
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 text-[0.88rem] leading-relaxed text-muted">Your answers are saved as you go. Jump back to any step at any time.</p>
          </div>
        </aside>

        <div className="min-w-0">
          {/* progress (mobile + desktop) */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-[0.85rem] font-bold uppercase tracking-[0.14em] text-gold">
              <span>Step {idx + 1} of {STEPS.length} · {def.label}</span>
              <span className="text-muted">{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <motion.div className="h-full rounded-full bg-gradient-to-r from-caramel to-gold" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>

          {itinerary && !stale && (
            <p className="mb-6 rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-[0.95rem] text-sand">You already have a plan. Change any answer and Tripzy will offer to regenerate it.</p>
          )}

          <AnimatePresence mode="wait" custom={dir}>
            <motion.section key={def.key} custom={dir} initial={{ opacity: 0, x: dir * 48 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -48 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="rounded-[26px] border bg-cocoa-900/70 p-6 shadow-lux sm:p-10">
              <div className="mb-9 flex items-start gap-4">
                <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold/12 text-gold sm:grid"><def.icon className="h-7 w-7" strokeWidth={1.6} /></span>
                <div>
                  <h2 className="text-[clamp(1.9rem,3.6vw,2.7rem)] font-semibold">{def.title}</h2>
                  <p className="mt-2 text-[1.05rem] text-sand">{def.sub}</p>
                </div>
              </div>
              <Comp prefs={prefs} set={setPrefs} errors={tried ? errors : errors.filter((e) => /Trips longer|before your start/.test(e))} today={today} goTo={goTo} />
            </motion.section>
          </AnimatePresence>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
            <button type="button" onClick={() => goTo(idx - 1)} disabled={idx === 0} className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</button>
            <div className="flex flex-wrap items-center gap-3">
              {def.optional && !last && (
                <button type="button" onClick={() => goTo(idx + 1)} className="px-3 py-2 text-[0.85rem] font-bold uppercase tracking-[0.12em] text-muted transition hover:text-gold">Skip this step</button>
              )}
              <button type="button" onClick={next} className="btn-primary">
                {last ? <>Create my itinerary <Sparkles className="h-4 w-4" /></> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
          {tried && !basicsOk && (
            <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-[0.95rem] text-amber-100" role="alert">
              {errors[0]} <button type="button" onClick={() => goTo(0)} className="font-bold underline underline-offset-4">Go to step 1</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
