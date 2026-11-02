import type { AssistantIntent, Itinerary, Kind, Preferences } from '@/types';
import { geminiKey, geminiModel } from './env';
import { KINDS } from '../sanitize';

async function geminiJSON(system: string, prompt: string, timeoutMs = 30000): Promise<unknown> {
  const key = geminiKey();
  if (!key) throw new Error('Gemini is not configured.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel())}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6, maxOutputTokens: 8192 },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Gemini responded with ${res.status}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } finally {
    clearTimeout(timer);
  }
}

const clip = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

/**
 * Asks Gemini to write personalised narrative for each day and a trip summary.
 * Gemini only writes prose about the slots we give it — it never supplies hotels, ratings or prices.
 */
export async function enrichWithGemini(it: Itinerary, prefs: Preferences): Promise<Itinerary> {
  const system =
    'You are Tripzy, a luxury travel concierge for India. Write warm, specific, concise prose. ' +
    'You may ONLY mention places, restaurants and activities that appear in the provided plan. ' +
    'Never invent businesses, ratings, review counts, opening hours or prices. ' +
    'Respect the traveller profile strictly (diet, alcohol, pace, mobility, children). Return JSON only.';
  const profile = {
    group: prefs.groupType,
    adults: prefs.adults,
    children: prefs.children,
    tier: prefs.tier,
    diet: prefs.diet,
    allergies: prefs.allergies || undefined,
    alcohol: prefs.alcohol,
    pace: prefs.pace,
    earlyStart: prefs.earlyStart,
    discovery: prefs.discovery,
    walking: prefs.walking,
    guidance: prefs.guided,
    interests: prefs.interests,
    transport: prefs.transport,
    occasion: prefs.occasion || undefined,
    accessibility: prefs.accessibility || undefined,
    seniors: prefs.seniors,
    notes: prefs.notes || undefined,
  };
  const days = it.days.map((d) => ({
    day: d.day,
    area: d.areaName,
    title: d.title,
    slots: d.slots.map((s) => ({ period: s.period, kind: s.kind, title: s.title, time: s.time })),
  }));
  const prompt =
    `Traveller profile: ${JSON.stringify(profile)}\nPlan: ${JSON.stringify(days)}\n\n` +
    'Return JSON: {"summary": string (max 40 words), "days": [{"day": number, "morning": string, "afternoon": string, "evening": string}]}. ' +
    'Each day field is 1–2 sentences (max 45 words) that explains why this part of the day suits THIS traveller and adds a practical, non-generic detail. ' +
    'Do not repeat phrasing across days. If a period has nothing planned, leave it as an empty string.';
  const raw = (await geminiJSON(system, prompt)) as { summary?: unknown; days?: { day?: unknown; morning?: unknown; afternoon?: unknown; evening?: unknown }[] };
  const next: Itinerary = JSON.parse(JSON.stringify(it));
  const summary = clip(raw.summary, 360);
  if (summary) next.overview.summary = summary;
  let applied = 0;
  for (const row of raw.days ?? []) {
    const day = next.days.find((d) => d.day === row.day);
    if (!day) continue;
    day.narrative = { morning: clip(row.morning, 320), afternoon: clip(row.afternoon, 320), evening: clip(row.evening, 320) };
    applied++;
  }
  if (!applied) throw new Error('Gemini returned no usable day narratives.');
  next.source.itinerary = 'gemini';
  return next;
}

const INTENTS = ['replace_hotel', 'cheaper_restaurants', 'add_activity', 'relax_day', 'veg_restaurants', 'reduce_budget', 'alternative_attraction'];

/** Lets Gemini understand free-form requests the keyword parser did not recognise. */
export async function classifyIntentWithGemini(message: string, it: Itinerary): Promise<AssistantIntent | null> {
  const system = 'You map a traveller\'s request to ONE trip-editing action. Return JSON only.';
  const prompt =
    `Trip has ${it.days.length} days in areas: ${[...new Set(it.days.map((d) => d.areaName))].join(', ')}.\n` +
    `Request: "${message.slice(0, 400)}"\n` +
    `Return {"type": one of ${JSON.stringify([...INTENTS, 'unknown'])}, "day"?: number, "kind"?: one of ${JSON.stringify(KINDS)}, "percent"?: number, "query"?: string (attraction name), "area"?: string}.`;
  const raw = (await geminiJSON(system, prompt, 15000)) as { type?: string; day?: number; kind?: string; percent?: number; query?: string; area?: string };
  const area = raw.area ? it.days.find((d) => d.areaName.toLowerCase() === String(raw.area).toLowerCase())?.areaId : undefined;
  switch (raw.type) {
    case 'replace_hotel':
      return { type: 'replace_hotel', areaId: area };
    case 'cheaper_restaurants':
      return { type: 'cheaper_restaurants' };
    case 'veg_restaurants':
      return { type: 'veg_restaurants' };
    case 'add_activity':
      return { type: 'add_activity', kind: ((KINDS as readonly string[]).includes(raw.kind ?? '') ? raw.kind : 'adventure') as Kind };
    case 'relax_day':
      return Number.isInteger(raw.day) ? { type: 'relax_day', day: raw.day as number } : null;
    case 'reduce_budget':
      return { type: 'reduce_budget', percent: Math.min(40, Math.max(5, Number(raw.percent) || 15)) };
    case 'alternative_attraction':
      return { type: 'alternative_attraction', query: String(raw.query ?? message).slice(0, 200) };
    default:
      return null;
  }
}
