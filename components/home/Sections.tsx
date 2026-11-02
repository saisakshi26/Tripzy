import Link from 'next/link';
import { ArrowRight, Compass, Gem, MessageCircle, ShieldCheck, Wallet, Sparkles } from 'lucide-react';
import DestImage from '@/components/ui/DestImage';
import Reveal from '@/components/ui/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { getDestination } from '@/lib/data/destinations';

const FEATURED = ['kerala', 'rajasthan', 'meghalaya', 'goa'];

export function FeaturedDestinations() {
  return (
    <section className="container-x pt-24">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">Featured destinations</p>
          <h2 className="max-w-2xl text-[clamp(2.2rem,4.4vw,3.6rem)] font-semibold">Four places worth a journey.</h2>
        </div>
        <Link href="/explore" className="flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-gold hover:text-ivory">
          See all 8 <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED.map((id, i) => {
          const d = getDestination(id);
          if (!d) return null;
          return (
            <Reveal key={id} delay={i * 0.08}>
              <Link href={`/explore#${id}`} className="group relative block overflow-hidden rounded-2xl border shadow-lux">
                <DestImage id={id} query={d.imageQuery} alt={d.name} className="aspect-[3/4] w-full" imgClassName="transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-cocoa-950 via-cocoa-950/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-serif text-[1.8rem] font-semibold">{d.name}</h3>
                  <p className="mt-1 text-[0.98rem] text-sand">{d.short}</p>
                  <p className="mt-3 text-[0.82rem] font-bold uppercase tracking-[0.14em] text-gold">{d.suggestedDays} · from ₹{d.dailyBudget[0].toLocaleString('en-IN')}/day</p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

const WHY = [
  { icon: Compass, title: 'Planned around you', text: 'Diet, alcohol, pace, mobility, transport — every answer changes the plan, not just the wording.' },
  { icon: ShieldCheck, title: 'Honest about data', text: 'Verified listings are labelled. Estimates are labelled. We never present a guess as a guest rating.' },
  { icon: Wallet, title: 'Budget that adds up', text: 'A line-by-line cost breakdown, per-person and per-day, with smarter alternatives when you run over.' },
  { icon: MessageCircle, title: 'A concierge on call', text: 'Ask to swap a hotel, soften Day 2 or add an adventure — the plan updates, not just the chat.' },
];

export function WhyTripzy() {
  return (
    <section className="container-x pt-28">
      <Reveal className="max-w-2xl">
        <p className="eyebrow mb-3">Why Tripzy</p>
        <h2 className="text-[clamp(2.2rem,4.4vw,3.6rem)] font-semibold">A concierge, not a booking engine.</h2>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map((w, i) => (
          <Reveal key={w.title} delay={i * 0.07}>
            <div className="lux-card h-full p-7 transition hover:-translate-y-1 hover:border-gold/40">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold/12 text-gold"><w.icon className="h-6 w-6" strokeWidth={1.7} /></span>
              <h3 className="mt-6 text-[1.4rem] font-semibold">{w.title}</h3>
              <p className="mt-3 text-[1rem] text-sand">{w.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', title: 'Discover', text: 'Browse eight regions and add the ones that call to you.', href: '/explore' },
  { n: '02', title: 'Share your style', text: 'A short, elegant consultation — skip anything optional.', href: '/preferences' },
  { n: '03', title: 'Get your plan', text: 'Day-by-day routes, stays, dining and budget in one dashboard.', href: '/planner' },
  { n: '04', title: 'Refine it', text: 'Chat with Tripzy to swap, soften or trim — then save or print.', href: '/planner' },
];

export function HowItWorks() {
  return (
    <section className="container-x pt-28">
      <Reveal className="max-w-2xl">
        <p className="eyebrow mb-3">How it works</p>
        <h2 className="text-[clamp(2.2rem,4.4vw,3.6rem)] font-semibold">From first idea to last sunset.</h2>
      </Reveal>
      <ol className="relative mt-12 grid gap-6 md:grid-cols-4">
        <span className="pointer-events-none absolute left-0 right-0 top-[1.55rem] hidden h-px border-t border-dashed border-gold/35 md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.08}>
            <li className="relative">
              <Link href={s.href} className="group block">
                <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-gold/60 bg-cocoa-950 font-serif text-[1.05rem] font-semibold text-gold transition group-hover:bg-gold group-hover:text-cocoa-950">{s.n}</span>
                <h3 className="mt-5 text-[1.45rem] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[1rem] text-sand">{s.text}</p>
              </Link>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="container-x pt-28">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[28px] border border-gold/25 bg-gradient-to-br from-cocoa-800 via-cocoa-900 to-cocoa-950 px-7 py-14 text-center shadow-lux sm:px-16 sm:py-20">
          <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-gold/15 blur-3xl" />
          <Gem className="mx-auto h-8 w-8 text-gold" strokeWidth={1.5} />
          <h2 className="mx-auto mt-5 max-w-3xl text-[clamp(2.2rem,4.6vw,3.8rem)] font-semibold">Let&apos;s make a trip <span className="text-gradient-gold">worth remembering.</span></h2>
          <p className="mx-auto mt-5 max-w-xl text-[1.1rem] text-sand">Five minutes of questions. A plan that feels like it was made by someone who knows you.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/preferences" arrow className="!min-h-[56px] !px-8">Begin your journey</ButtonLink>
            <ButtonLink href="/explore" variant="ghost" className="!min-h-[56px] !px-8"><Sparkles className="h-4 w-4" /> Explore India</ButtonLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
