'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

/** Cinematic dark-chocolate sky: warm light, drifting clouds and layered Western-Ghats-style ridgelines with subtle parallax. */
export default function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const far = useTransform(scrollY, [0, 700], [0, 60]);
  const near = useTransform(scrollY, [0, 700], [0, 120]);
  const sky = useTransform(scrollY, [0, 700], [0, 30]);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-cocoa-950" aria-hidden="true">
      <motion.div style={{ y: sky }} className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_78%_10%,rgba(214,174,120,0.30),transparent_55%),radial-gradient(90%_70%_at_8%_100%,rgba(193,138,87,0.20),transparent_60%),linear-gradient(180deg,#2c1812_0%,#24130F_55%,#1b0e0a_100%)]" />
        {/* warm sun glow */}
        <div className="absolute right-[8%] top-[12%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(246,205,150,0.38)_0%,rgba(214,174,120,0.12)_40%,transparent_70%)] blur-2xl" />
      </motion.div>

      {/* clouds */}
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-[-10%] top-[16%] h-24 w-[42rem] rounded-full bg-ivory/[0.07] blur-2xl [animation:drift_60s_linear_infinite]" />
        <div className="absolute right-[-12%] top-[34%] h-20 w-[36rem] rounded-full bg-gold/[0.09] blur-2xl [animation:drift_80s_linear_infinite_reverse]" />
        <div className="absolute left-[18%] top-[56%] h-16 w-[30rem] rounded-full bg-ivory/[0.05] blur-2xl [animation:drift_70s_linear_infinite]" />
      </div>

      <motion.svg style={{ y: far }} viewBox="0 0 1440 400" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[8%] h-[38%] w-full">
        <defs>
          <linearGradient id="ridge-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5a382a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#2a1610" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path d="M0 260 L90 210 L170 250 L280 150 L380 235 L470 190 L580 270 L690 170 L800 245 L900 200 L1010 140 L1120 230 L1230 180 L1340 240 L1440 200 V400 H0Z" fill="url(#ridge-far)" />
      </motion.svg>
      <motion.svg style={{ y: near }} viewBox="0 0 1440 300" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[30%] w-full">
        <defs>
          <linearGradient id="ridge-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b2218" />
            <stop offset="1" stopColor="#1b0e0a" />
          </linearGradient>
        </defs>
        <path d="M0 180 C120 120 200 210 330 150 S560 90 700 160 S940 100 1080 150 S1320 120 1440 170 V300 H0Z" fill="url(#ridge-near)" />
      </motion.svg>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-cocoa-950 to-transparent" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
