import { NextResponse } from 'next/server';
import { capabilities } from '@/lib/server/env';

export const dynamic = 'force-dynamic';

/** Tells the UI which integrations are configured. Never returns key values. */
export async function GET() {
  const c = capabilities();
  return NextResponse.json({ ...c, demo: !c.gemini && !c.places });
}
