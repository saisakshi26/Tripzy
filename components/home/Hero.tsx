import { MapPin, Sparkles, Wallet } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import HeroBackdrop from './HeroBackdrop';
import FlightRoute from './FlightRoute';

const BENEFITS = [
  { icon: MapPin, label: 'Made for India' },
  { icon: Wallet, label: 'Budget-aware planning' },
  { icon: Sparkles, label: 'AI-assisted travel ideas' },
];

export default function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-var(--nav-h))] items-center overflow-hidden">
      <HeroBackdrop />
      <div className="container-x grid w-full items-center gap-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-4 lg:py-14">
        <div className="relative z-10">
          <p className="eyebrow mb-6 flex items-center gap-2.5">
            <Sparkles className="h-4 w-4" /> Thoughtful travel, beautifully planned
          </p>
          <h1 className="font-semibold leading-[0.98] tracking-tight text-[clamp(3.4rem,8.4vw,7.2rem)]">
            Your Trip.
            <span className="text-gradient-gold block">Your Vibe.</span>
          </h1>
          <p className="mt-7 max-w-[34rem] text-[clamp(1.1rem,1.5vw,1.3rem)] leading-relaxed text-sand">
            Tell us where you want to go. We&apos;ll help you make every moment count — from the first idea to the last sunset.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <ButtonLink href="/preferences" arrow className="!min-h-[56px] !px-8">Begin your journey</ButtonLink>
            <ButtonLink href="/explore" variant="ghost" className="!min-h-[56px] !px-8">Explore India</ButtonLink>
          </div>
          <ul className="mt-10 grid max-w-[34rem] grid-cols-3 gap-4">
            {BENEFITS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-2.5 text-[0.95rem] font-semibold leading-snug text-ivory/90">
                <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-gold" /> {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 lg:-mr-10">
          <FlightRoute />
        </div>
      </div>
    </section>
  );
}
