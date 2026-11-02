import { placesKey } from '@/lib/server/env';

export const runtime = 'nodejs';

/** Proxies a Google Places photo so the API key never reaches the browser. */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get('name') ?? '';
  const key = placesKey();
  // strict allow-list: only `places/<id>/photos/<ref>` resource names
  if (!key || !/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) return new Response('Not found', { status: 404 });
  try {
    const res = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=900&key=${encodeURIComponent(key)}`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok || !res.body) return new Response('Not found', { status: 404 });
    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return new Response('Photo unavailable', { status: 502 });
  }
}
