import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function Footer() {
  return (
    <footer className="no-print mt-24 border-t bg-cocoa-900/60">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-sm text-[0.98rem] text-sand">A luxury digital travel concierge for India. We plan around you — your budget, your appetite, your pace.</p>
        </div>
        <div>
          <p className="eyebrow mb-4">Journey</p>
          <ul className="space-y-2.5 text-sand">
            <li><Link className="hover:text-gold" href="/explore">Explore India</Link></li>
            <li><Link className="hover:text-gold" href="/preferences">Your Travel Style</Link></li>
            <li><Link className="hover:text-gold" href="/planner">Plan Your Trip</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Good to know</p>
          <p className="text-[0.92rem] leading-relaxed text-muted">Prices marked “estimated” are guides, not quotes. Ratings only appear on verified live listings. Always confirm opening hours, availability and entry rules before you travel.</p>
        </div>
      </div>
      <div className="border-t py-5 text-center text-[0.82rem] text-muted">© {new Date().getFullYear()} Tripzy · Your Trip. Your Vibe.</div>
    </footer>
  );
}
