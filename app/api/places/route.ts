import { NextResponse } from 'next/server';
import { generateItinerary } from '@/lib/planner';
import { sanitizePrefs } from '@/lib/sanitize';
import { validatePrefs } from '@/lib/defaults';
import { capabilities } from '@/lib/server/env';
import { applyLivePlaces } from '@/lib/server/places';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Refreshes only the stay / restaurant recommendations for the given answers.
 * Returns { live: false } in demo mode so the UI can say so honestly.
 */
export async function POST(req: Request) {
  let body: { prefs?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const prefs = sanitizePrefs(body.prefs);
  const problems = validatePrefs(prefs);
  if (problems.length) return NextResponse.json({ error: problems.join(' ') }, { status: 400 });
  if (!capabilities().places) return NextResponse.json({ live: false, message: 'Google Places is not configured; showing sample options.' });
  try {
    const live = await applyLivePlaces(generateItinerary(prefs), prefs);
    return NextResponse.json({ live: live.used, stays: live.itinerary.stays, restaurants: live.itinerary.restaurants, warnings: live.warnings });
  } catch {
    return NextResponse.json({ error: 'Live listings are unavailable right now.' }, { status: 502 });
  }
}
