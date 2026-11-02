'use client';

import { createContext, useContext, type ReactNode } from 'react';

interface PhotoConfig {
  /** destination id → photo found in /public/images/destinations */
  local: Record<string, string>;
  /** true when UNSPLASH_ACCESS_KEY is configured on the server */
  unsplash: boolean;
}

const Ctx = createContext<PhotoConfig>({ local: {}, unsplash: false });

export function PhotoProvider({ value, children }: { value: PhotoConfig; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePhotoConfig = () => useContext(Ctx);
