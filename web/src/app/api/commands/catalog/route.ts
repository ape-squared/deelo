import { NextResponse } from 'next/server';
import catalog from '@/data/commands-catalog.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(catalog, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
