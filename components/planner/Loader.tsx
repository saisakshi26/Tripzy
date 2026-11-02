'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';

const MESSAGES = [
  'Reading your travel personality…',
  'Mapping sensible routes between areas…',
  'Matching stays to your budget and facilities…',
  'Choosing restaurants that fit your table…',
  'Balancing every day so none feels rushed…',
  'Adding up the numbers…',
];

/** A plane that travels the full length of a dotted line while the plan is built — straight path, so nose and direction always agree. */
export default function Loader() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 1800);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="container-x grid min-h-[60svh] place-items-center py-20" role="status" aria-live="polite">
      <div className="w-full max-w-xl text-center">
        <p className="eyebrow mb-4">Tripzy is planning</p>
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-semibold">Crafting your journey</h1>
        <div className="relative mx-auto mt-14 h-14 w-full max-w-md">
          <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dotted border-gold/50" />
          <motion.div className="absolute top-1/2 -mt-5" initial={{ left: '0%' }} animate={{ left: ['0%', '94%'] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}>
            <Plane className="h-10 w-10 rotate-45 text-gold drop-shadow-[0_0_10px_rgba(214,174,120,0.6)]" strokeWidth={1.5} />
          </motion.div>
        </div>
        <p className="mt-6 min-h-[1.75rem] text-[1.1rem] text-sand">{MESSAGES[i]}</p>
      </div>
    </div>
  );
}
