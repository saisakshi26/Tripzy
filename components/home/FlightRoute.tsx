'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import DestImage from '@/components/ui/DestImage';
import { getDestination } from '@/lib/data/destinations';

/* ───────────────────────── route geometry ─────────────────────────
   The route is a chain of cubic Béziers. Everything — the dotted line, the destination pins,
   the cards and the aeroplane — is derived from ONE lookup table, so the plane can only ever
   be on the route and always points along the direction of travel. */

interface Pt { x: number; y: number }
type Seg = [Pt, Pt, Pt, Pt];

interface Geometry {
  w: number;
  h: number;
  segs: Seg[];
  /** where along the route (0–1, by arc length) each destination pin sits */
  stops: number[];
}

const P = (x: number, y: number): Pt => ({ x, y });

const DESKTOP: Geometry = {
  w: 1000,
  h: 820,
  segs: [
    [P(30, 770), P(210, 785), P(250, 640), P(380, 600)],
    [P(380, 600), P(510, 560), P(560, 440), P(700, 400)],
    [P(700, 400), P(840, 360), P(820, 170), P(970, 105)],
  ],
  stops: [0.2, 0.54, 0.88],
};

const MOBILE: Geometry = {
  w: 400,
  h: 190,
  segs: [
    [P(14, 150), P(80, 168), P(110, 70), P(200, 82)],
    [P(200, 82), P(290, 94), P(310, 20), P(386, 34)],
  ],
  stops: [0.14, 0.5, 0.9],
};

interface LUT { pts: Pt[]; cum: number[]; len: number }

function buildLUT(segs: Seg[], steps = 140): LUT {
  const pts: Pt[] = [];
  const cum: number[] = [];
  let len = 0;
  segs.forEach((s, si) => {
    for (let i = si === 0 ? 0 : 1; i <= steps; i++) {
      const t = i / steps;
      const m = 1 - t;
      const x = m ** 3 * s[0].x + 3 * m * m * t * s[1].x + 3 * m * t * t * s[2].x + t ** 3 * s[3].x;
      const y = m ** 3 * s[0].y + 3 * m * m * t * s[1].y + 3 * m * t * t * s[2].y + t ** 3 * s[3].y;
      if (pts.length) len += Math.hypot(x - pts[pts.length - 1].x, y - pts[pts.length - 1].y);
      pts.push({ x, y });
      cum.push(len);
    }
  });
  return { pts, cum, len };
}

function pointAt(lut: LUT, f: number): Pt {
  const d = Math.min(1, Math.max(0, f)) * lut.len;
  let lo = 0;
  let hi = lut.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lut.cum[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const span = lut.cum[i] - lut.cum[i - 1] || 1;
  const k = (d - lut.cum[i - 1]) / span;
  return { x: lut.pts[i - 1].x + (lut.pts[i].x - lut.pts[i - 1].x) * k, y: lut.pts[i - 1].y + (lut.pts[i].y - lut.pts[i - 1].y) * k };
}

/** heading in degrees, measured over a short window so the nose never jitters */
function headingAt(lut: LUT, f: number): number {
  const a = pointAt(lut, f - 0.012);
  const b = pointAt(lut, f + 0.012);
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

const pathD = (g: Geometry) =>
  `M${g.segs[0][0].x} ${g.segs[0][0].y} ` + g.segs.map((s) => `C${s[1].x} ${s[1].y} ${s[2].x} ${s[2].y} ${s[3].x} ${s[3].y}`).join(' ');

const LUTS = { desktop: buildLUT(DESKTOP.segs), mobile: buildLUT(MOBILE.segs) };

// cards: the three destinations the plane visits, in route order (south-west → north → north-east)
const STOPS = [
  { id: 'kerala', blurb: 'Backwaters, tea hills & slow mornings', card: { x: 40, y: 330, w: 262 } },
  { id: 'rajasthan', blurb: 'Palaces, forts & desert sunsets', card: { x: 585, y: 530, w: 262 } },
  { id: 'meghalaya', blurb: 'Waterfalls, caves & living-root bridges', card: { x: 505, y: 40, w: 262 } },
] as const;

const PLANE = 'M22 0C22-2 18-3 12-3L-2-3L-14-16L-19-16L-12-3L-20-3L-24-9L-27-9L-24 0L-27 9L-24 9L-20 3L-12 3L-19 16L-14 16L-2 3L12 3C18 3 22 2 22 0Z';

const DURATION = 17000;
const HOLD = 1400;
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t); // slow at the pins, steady between

interface RigProps {
  geo: Geometry;
  lut: LUT;
  planeScale: number;
  children?: never;
}

/** The SVG layer: dotted route, travelled glow, pins and the plane (animated through refs, no re-renders). */
function Route({ geo, lut, planeScale }: RigProps) {
  const svg = useRef<SVGSVGElement>(null);
  const plane = useRef<SVGGElement>(null);
  const trail = useRef<SVGPathElement>(null);
  const rings = useRef<(SVGCircleElement | null)[]>([]);
  const d = pathD(geo);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let t0 = performance.now();

    const draw = (p: number, opacity: number) => {
      const pt = pointAt(lut, p);
      const ang = headingAt(lut, p);
      plane.current?.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${planeScale})`);
      plane.current?.setAttribute('opacity', String(opacity));
      trail.current?.setAttribute('stroke-dasharray', `${(p * lut.len).toFixed(1)} ${lut.len.toFixed(1)}`);
      geo.stops.forEach((f, i) => {
        const pulse = Math.max(0, 1 - Math.abs(p - f) / 0.07);
        const r = rings.current[i];
        if (r) {
          r.setAttribute('r', String(14 + pulse * 16));
          r.setAttribute('opacity', String(0.18 + pulse * 0.5));
        }
      });
    };

    if (reduce) {
      draw(0.5, 1);
      return;
    }
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!svg.current || svg.current.getBoundingClientRect().width === 0) return; // the hidden variant does no work
      const el = (now - t0) % (DURATION + HOLD);
      if (el >= DURATION) {
        const k = (el - DURATION) / HOLD;
        draw(1, Math.max(0, 1 - k * 2.2));
        return;
      }
      const p = ease(el / DURATION);
      draw(p, Math.min(1, el / 500));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geo, lut, planeScale]);

  return (
    <svg ref={svg} viewBox={`0 0 ${geo.w} ${geo.h}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <filter id={`glow-${geo.w}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* the dotted flight path */}
      <path d={d} fill="none" stroke="#F5E8D5" strokeOpacity="0.55" strokeWidth={geo.w > 500 ? 3 : 2.5} strokeLinecap="round" strokeDasharray="1 13" />
      {/* the part already flown glows gold */}
      <path ref={trail} d={d} fill="none" stroke="#D6AE78" strokeOpacity="0.95" strokeWidth={geo.w > 500 ? 3.5 : 3} strokeLinecap="round" strokeDasharray={`0 ${lut.len}`} filter={`url(#glow-${geo.w})`} />
      {geo.stops.map((f, i) => {
        const pt = pointAt(lut, f);
        return (
          <g key={i} transform={`translate(${pt.x} ${pt.y})`}>
            <circle ref={(el) => { rings.current[i] = el; }} r="14" fill="#D6AE78" opacity="0.2" />
            <circle r="7.5" fill="#24130F" stroke="#D6AE78" strokeWidth="3" />
            <circle r="2.6" fill="#D6AE78" />
          </g>
        );
      })}
      <g ref={plane} filter={`url(#glow-${geo.w})`}>
        <path d={PLANE} fill="#F5E8D5" stroke="#D6AE78" strokeWidth="1.2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export default function FlightRoute() {
  return (
    <>
      {/* ─── desktop & tablet: full route with photo cards ─── */}
      <div className="relative mx-auto hidden w-full max-w-[820px] md:block [container-type:inline-size]" style={{ aspectRatio: `${DESKTOP.w} / ${DESKTOP.h}` }}>
        <Route geo={DESKTOP} lut={LUTS.desktop} planeScale={1.15} />
        {STOPS.map((s, i) => {
          const dest = getDestination(s.id);
          if (!dest) return null;
          const pin = pointAt(LUTS.desktop, DESKTOP.stops[i]);
          // a hairline leader ties each card to its pin
          const cx = s.card.x + s.card.w / 2;
          const cardMidY = s.card.y + 150;
          const toLeft = pin.x < cx;
          return (
            <div key={s.id}>
              <svg viewBox={`0 0 ${DESKTOP.w} ${DESKTOP.h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                <path d={`M${pin.x} ${pin.y} L${toLeft ? s.card.x + 30 : cx + 40} ${pin.y < cardMidY ? s.card.y : s.card.y + 300}`} stroke="#D6AE78" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="3 6" fill="none" />
              </svg>
              <article
                className="absolute animate-floaty overflow-hidden rounded-2xl border border-gold/25 bg-cocoa-900/85 shadow-lux backdrop-blur-md transition hover:-translate-y-1 hover:border-gold/60"
                style={{ left: `${(s.card.x / DESKTOP.w) * 100}%`, top: `${(s.card.y / DESKTOP.h) * 100}%`, width: `${(s.card.w / DESKTOP.w) * 100}%`, animationDelay: `${i * 1.3}s`, fontSize: 'clamp(0.68rem, 2.05cqw, 1.02rem)' }}
              >
                <DestImage id={dest.id} query={dest.imageQuery} alt={`${dest.name}, India`} className="aspect-[16/10] w-full" />
                <div className="p-[0.9em]">
                  <h3 className="font-serif text-[1.45em] font-semibold leading-tight">{dest.name}</h3>
                  <p className="mt-[0.3em] text-[0.88em] leading-snug text-sand">{s.blurb}</p>
                  <div className="mt-[0.7em] flex items-center justify-between gap-2">
                    <span className="text-[0.74em] font-semibold uppercase tracking-[0.12em] text-muted">Best {dest.bestSeason.split(';')[0].split(' for ')[0]}</span>
                    <Link href={`/explore#${dest.id}`} className="inline-flex items-center gap-1 text-[0.82em] font-bold uppercase tracking-[0.1em] text-gold hover:text-ivory" aria-label={`Explore ${dest.name}`}>
                      Explore <ArrowRight className="h-[1em] w-[1em]" />
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      {/* ─── mobile: simplified route with compact pins ─── */}
      <div className="relative mx-auto mt-2 w-full max-w-[460px] md:hidden" style={{ aspectRatio: `${MOBILE.w} / ${MOBILE.h}` }}>
        <Route geo={MOBILE} lut={LUTS.mobile} planeScale={0.62} />
        {STOPS.map((s, i) => {
          const dest = getDestination(s.id);
          if (!dest) return null;
          const pin = pointAt(LUTS.mobile, MOBILE.stops[i]);
          const above = i !== 1;
          return (
            <Link
              key={s.id}
              href={`/explore#${dest.id}`}
              className="absolute flex w-[4.9rem] -translate-x-1/2 flex-col items-center"
              style={{ left: `${(pin.x / MOBILE.w) * 100}%`, top: `${(pin.y / MOBILE.h) * 100}%`, transform: `translate(-50%, ${above ? '-112%' : '28%'})` }}
              aria-label={`Explore ${dest.name}`}
            >
              <DestImage id={dest.id} query={dest.imageQuery} alt="" className="h-12 w-[4.4rem] rounded-xl border border-gold/40 shadow-lux" />
              <span className="mt-1 rounded-md bg-cocoa-950/80 px-1.5 text-[0.7rem] font-bold tracking-wide text-ivory">{dest.name}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
