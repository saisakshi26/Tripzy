import { NextResponse } from 'next/server';
import { unsplashKey } from '@/lib/server/env';

export const runtime = 'nodejs';

const cache = new Map<string, { url: string; credit: string; link: string }>();

/** Looks up a licensed Unsplash photo for a destination. Returns 404 when no key is configured. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 120);
  const key = unsplashKey();
  if (!q || !key) return NextResponse.json({ error: 'No photo source configured.' }, { status: 404 });
  const hit = cache.get(q);
  if (hit) return NextResponse.json(hit, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=landscape&per_page=1&content_filter=high`, {
      headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return NextResponse.json({ error: 'Photo lookup failed.' }, { status: 502 });
    const data = (await res.json()) as { results?: { urls?: { regular?: string }; user?: { name?: string }; links?: { html?: string } }[] };
    const r = data.results?.[0];
    if (!r?.urls?.regular) return NextResponse.json({ error: 'No photo found.' }, { status: 404 });
    const out = { url: r.urls.regular, credit: r.user?.name ?? 'Unsplash', link: `${r.links?.html ?? 'https://unsplash.com'}?utm_source=tripzy&utm_medium=referral` };
    cache.set(q, out);
    return NextResponse.json(out, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  } catch {
    return NextResponse.json({ error: 'Photo lookup failed.' }, { status: 502 });
  }
}
