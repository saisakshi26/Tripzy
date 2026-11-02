'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Menu, X } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useTrip } from '@/hooks/useTrip';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore India' },
  { href: '/preferences', label: 'Your Travel Style' },
  { href: '/planner', label: 'Plan Your Trip' },
];

const STEPS = [
  { href: '/explore', label: 'Discover' },
  { href: '/preferences', label: 'Travel style' },
  { href: '/planner', label: 'Your plan' },
];

export default function Navbar() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { prefs, valid, itinerary } = useTrip();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const done = [prefs.destinationIds.length > 0, valid, !!itinerary];
  const activeStep = STEPS.findIndex((s) => isActive(s.href));

  return (
    <header className={`no-print sticky top-0 z-50 border-b transition-colors duration-300 ${scrolled || open ? 'bg-cocoa-950/90 backdrop-blur-xl' : 'bg-cocoa-950/70 backdrop-blur-md'}`}>
      <div className="container-x flex h-[var(--nav-h)] items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`relative rounded-lg px-4 py-2 text-[0.95rem] font-semibold transition-colors ${isActive(l.href) ? 'text-gold' : 'text-sand hover:text-ivory'}`}>
              {l.label}
              {isActive(l.href) && <motion.span layoutId="nav-underline" className="absolute inset-x-4 -bottom-0.5 h-[2px] rounded bg-gold" />}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/preferences" className="btn-primary hidden sm:inline-flex">
            Plan my trip <ArrowRight className="h-4 w-4" />
          </Link>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border text-ivory lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {pathname !== '/' && (
        <div className="border-t bg-cocoa-900/60">
          <ol className="container-x flex h-12 items-center gap-2 overflow-x-auto text-[0.82rem] font-semibold scroll-thin" aria-label="Journey progress">
            {STEPS.map((s, i) => {
              const current = i === activeStep;
              return (
                <li key={s.href} className="flex shrink-0 items-center gap-2">
                  {i > 0 && <span className={`h-px w-6 sm:w-10 ${done[i - 1] ? 'bg-gold' : 'bg-white/15'}`} />}
                  <Link href={s.href} aria-current={current ? 'step' : undefined} className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition ${current ? 'bg-gold/15 text-gold' : 'text-sand hover:text-ivory'}`}>
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-[0.72rem] ${done[i] ? 'bg-gold text-cocoa-950' : current ? 'border border-gold text-gold' : 'border border-white/25 text-muted'}`}>
                      {done[i] ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    {s.label}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden border-t bg-cocoa-950 lg:hidden" aria-label="Mobile">
            <div className="container-x flex flex-col gap-1 py-4">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={`rounded-xl px-4 py-3.5 text-[1.05rem] font-semibold ${isActive(l.href) ? 'bg-gold/10 text-gold' : 'text-ivory'}`}>
                  {l.label}
                </Link>
              ))}
              <Link href="/preferences" className="btn-primary mt-3">
                Plan my trip <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
