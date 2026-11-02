import { NextResponse } from 'next/server';
import type { Itinerary } from '@/types';
import { applyIntent, HELP_REPLY, parseIntent, type AssistantContext } from '@/lib/assistant';
import { sanitizePrefs } from '@/lib/sanitize';
import { capabilities } from '@/lib/server/env';
import { classifyIntentWithGemini } from '@/lib/server/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const isItinerary = (x: unknown): x is Itinerary => {
  const it = x as Itinerary | null;
  return !!it && Array.isArray(it.days) && it.days.length > 0 && Array.isArray(it.stays) && Array.isArray(it.restaurants) && !!it.budget && !!it.stayChoice && !!it.adjustments;
};

export async function POST(req: Request) {
  let body: { message?: unknown; prefs?: unknown; itinerary?: unknown; context?: AssistantContext };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : '';
  if (!message) return NextResponse.json({ error: 'Type a request for the assistant.' }, { status: 400 });
  if (!isItinerary(body.itinerary)) return NextResponse.json({ error: 'Generate a trip first, then ask me to change it.' }, { status: 400 });

  const prefs = sanitizePrefs(body.prefs);
  const it = body.itinerary;
  const ctx: AssistantContext = {
    areaId: typeof body.context?.areaId === 'string' ? body.context.areaId : undefined,
    day: Number.isInteger(body.context?.day) ? body.context?.day : undefined,
    attractionId: typeof body.context?.attractionId === 'string' ? body.context.attractionId : undefined,
  };

  try {
    let intent = parseIntent(message, it, ctx);
    let usedAI = false;
    if (intent.type === 'unknown' && capabilities().gemini) {
      try {
        const ai = await classifyIntentWithGemini(message, it);
        if (ai) {
          intent = ai;
          usedAI = true;
        }
      } catch {
        /* fall through to the help reply */
      }
    }
    if (intent.type === 'unknown') {
      return NextResponse.json({ itinerary: it, reply: HELP_REPLY, intent, changed: false, usedAI });
    }
    const result = applyIntent(it, prefs, intent, message, ctx);
    return NextResponse.json({ ...result, usedAI });
  } catch (e) {
    console.error('[assistant]', e);
    return NextResponse.json({ error: 'I could not apply that change. Please rephrase and try again.' }, { status: 500 });
  }
}
