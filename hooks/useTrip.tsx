'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Itinerary, Preferences, SavedTrip } from '@/types';
import { DEFAULT_PREFS, prefsKey, validatePrefs } from '@/lib/defaults';
import { uid } from '@/lib/utils';
import { getDestination } from '@/lib/data/destinations';

const STORAGE_KEY = 'tripzy:v1';

interface Persisted {
  prefs: Preferences;
  itinerary: Itinerary | null;
  genKey: string;
  step: number;
  saved: SavedTrip[];
}

interface TripContextValue {
  ready: boolean;
  prefs: Preferences;
  setPrefs: (patch: Partial<Preferences>) => void;
  resetPrefs: () => void;
  itinerary: Itinerary | null;
  /** Replaces the current itinerary (e.g. after an edit). Pass keepKey to leave staleness tracking alone. */
  setItinerary: (it: Itinerary | null, opts?: { fresh?: boolean }) => void;
  /** true when the answers changed after the itinerary was generated */
  stale: boolean;
  valid: boolean;
  step: number;
  setStep: (n: number) => void;
  saved: SavedTrip[];
  saveTrip: () => SavedTrip | null;
  loadTrip: (id: string) => void;
  deleteTrip: (id: string) => void;
  toggleDestination: (id: string) => void;
  customiseDestination: (id: string) => void;
}

const Ctx = createContext<TripContextValue | null>(null);

const read = (): Partial<Persisted> | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : null;
  } catch {
    return null;
  }
};

export function TripProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULT_PREFS);
  const [itinerary, setItineraryState] = useState<Itinerary | null>(null);
  const [genKey, setGenKey] = useState('');
  const [step, setStepState] = useState(0);
  const [saved, setSaved] = useState<SavedTrip[]>([]);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // hydrate from localStorage after mount (keeps server and client markup identical)
  useEffect(() => {
    const s = read();
    if (s) {
      if (s.prefs) setPrefsState({ ...DEFAULT_PREFS, ...s.prefs });
      if (s.itinerary) setItineraryState(s.itinerary);
      if (typeof s.genKey === 'string') setGenKey(s.genKey);
      if (typeof s.step === 'number') setStepState(s.step);
      if (Array.isArray(s.saved)) setSaved(s.saved);
    }
    setReady(true);
  }, []);

  // persist (debounced) — never throws if storage is blocked
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      try {
        const data: Persisted = { prefs, itinerary, genKey, step, saved };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* storage full or unavailable — the app keeps working in memory */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [ready, prefs, itinerary, genKey, step, saved]);

  const setPrefs = useCallback((patch: Partial<Preferences>) => setPrefsState((p) => ({ ...p, ...patch })), []);
  const resetPrefs = useCallback(() => {
    setPrefsState(DEFAULT_PREFS);
    setStepState(0);
  }, []);

  const setItinerary = useCallback((it: Itinerary | null, opts?: { fresh?: boolean }) => {
    setItineraryState(it);
    if (opts?.fresh) setGenKey(prefsKey(prefsRef.current));
    if (!it) setGenKey('');
  }, []);

  const setStep = useCallback((n: number) => setStepState(Math.max(0, n)), []);

  const saveTrip = useCallback((): SavedTrip | null => {
    if (!itinerary) return null;
    const names = itinerary.destinations.map((d) => d.name).join(' & ');
    const trip: SavedTrip = {
      id: uid('saved'),
      savedAt: new Date().toISOString(),
      title: `${names} · ${itinerary.days.length} days`,
      prefs,
      itinerary,
    };
    setSaved((list) => [trip, ...list].slice(0, 12));
    return trip;
  }, [itinerary, prefs]);

  const loadTrip = useCallback((id: string) => {
    setSaved((list) => {
      const t = list.find((x) => x.id === id);
      if (t) {
        setPrefsState({ ...DEFAULT_PREFS, ...t.prefs });
        setItineraryState(t.itinerary);
        setGenKey(prefsKey({ ...DEFAULT_PREFS, ...t.prefs }));
      }
      return list;
    });
  }, []);

  const deleteTrip = useCallback((id: string) => setSaved((l) => l.filter((t) => t.id !== id)), []);

  const toggleDestination = useCallback((id: string) => {
    setPrefsState((p) => {
      const has = p.destinationIds.includes(id);
      const ids = has ? p.destinationIds.filter((x) => x !== id) : [...p.destinationIds, id].slice(-4);
      return { ...p, destinationIds: ids };
    });
  }, []);

  const customiseDestination = useCallback((id: string) => {
    if (!getDestination(id)) return;
    setPrefsState((p) => ({ ...p, destinationIds: p.destinationIds.includes(id) ? p.destinationIds : [...p.destinationIds, id].slice(-4) }));
    setStepState(0);
  }, []);

  const stale = !!itinerary && genKey !== '' && genKey !== prefsKey(prefs);
  const valid = validatePrefs(prefs).length === 0;

  const value = useMemo<TripContextValue>(
    () => ({ ready, prefs, setPrefs, resetPrefs, itinerary, setItinerary, stale, valid, step, setStep, saved, saveTrip, loadTrip, deleteTrip, toggleDestination, customiseDestination }),
    [ready, prefs, setPrefs, resetPrefs, itinerary, setItinerary, stale, valid, step, setStep, saved, saveTrip, loadTrip, deleteTrip, toggleDestination, customiseDestination],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTrip(): TripContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTrip must be used inside <TripProvider>');
  return v;
}
