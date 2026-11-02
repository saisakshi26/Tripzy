import { NextResponse } from 'next/server';
import { generateItinerary, PlanError } from '@/lib/planner';
import { sanitizePrefs } from '@/lib/sanitize';
import { validatePrefs } from '@/lib/defaults';
import { capabilities } from '@/lib/server/env';
import { enrichWithGemini } from '@/lib/server/gemini';
import { applyLivePlaces } from '@/lib/server/places';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { prefs?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Send a JSON body with your travel preferences.' }, { status: 400 });
  }
  // every answer from the questionnaire is validated here and drives generation below
  const prefs = sanitizePrefs(body.prefs);
  const problems = validatePrefs(prefs);
  if (problems.length) return NextResponse.json({ error: problems.join(' '), problems }, { status: 400 });

  try {
    const cap = capabilities();
    let itinerary = generateItinerary(prefs);
    const warnings: string[] = [];

    if (cap.places) {
      const live = await applyLivePlaces(itinerary, prefs);
      itinerary = live.itinerary;
      warnings.push(...live.warnings);
    } else {
      warnings.push('Demo mode: hotels and restaurants are clearly-labelled samples with estimated prices and no ratings. Add GOOGLE_PLACES_API_KEY for verified live listings.');
    }

    if (cap.gemini) {
      try {
        itinerary = await enrichWithGemini(itinerary, prefs);
      } catch (e) {
        warnings.push(`Gemini personalisation was unavailable (${e instanceof Error ? e.message : 'error'}); using Tripzy's built-in planner.`);
      }
    }

    itinerary.source.warnings = warnings;
    return NextResponse.json({ itinerary, capabilities: cap });
  } catch (e) {
    if (e instanceof PlanError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[itinerary]', e);
    return NextResponse.json({ error: 'Something went wrong while planning your trip. Please try again.' }, { status: 500 });
  }
}
