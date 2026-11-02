import Link from 'next/link';
import { Plane } from 'lucide-react';

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Tripzy home">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-b from-cocoa-700 to-cocoa-900 text-gold shadow-glow transition group-hover:rotate-[-6deg]">
        <Plane className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="leading-none">
        <span className="block font-serif text-[1.55rem] font-semibold tracking-[0.12em] text-ivory">TRIPZY</span>
        {!compact && <span className="mt-1 hidden text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-muted sm:block">Your trip. Your vibe.</span>}
      </span>
    </Link>
  );
}
