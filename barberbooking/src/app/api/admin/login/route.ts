import { NextRequest, NextResponse } from 'next/server';

function cleanEnv(s: string | undefined): string {
  if (!s) return '';
  const noBom = s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
  return noBom.trim();
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = cleanEnv(process.env.ADMIN_PASSWORD);

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
