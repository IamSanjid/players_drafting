import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorize';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json({ role: auth.session.role });
}
