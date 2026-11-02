'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** A template (not a layout) re-mounts on every navigation, which gives each route a soft fade-and-slide entrance. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.main initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.main>
  );
}
