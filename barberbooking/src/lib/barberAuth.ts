import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

// No hardcoded fallback on purpose: this file is in a public repo, so a
// default secret baked into the source would let anyone forge a valid
// session cookie for any barber (ids are public via /api/barbers) or
// the manager. Failing loudly beats failing open.
function barberSecret(): string {
  const secret = process.env.BARBER_SESSION_SECRET;
  if (!secret) throw new Error('BARBER_SESSION_SECRET is not set');
  return secret;
}

function managerSecret(): string {
  const secret = process.env.MANAGER_SESSION_SECRET;
  if (!secret) throw new Error('MANAGER_SESSION_SECRET is not set');
  return secret;
}

export function barberSessionToken(barberId: string): string {
  return createHmac('sha256', barberSecret()).update(barberId).digest('hex');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getAuthenticatedBarberId(req: NextRequest): string | null {
  const cookie = req.cookies.get('barber_session')?.value;
  if (!cookie) return null;
  try {
    const { id, token } = JSON.parse(cookie);
    // Reject anything that isn't a real barber id before it ever reaches a
    // query — some routes interpolate this value into a Supabase `.or()`
    // filter string, so a malformed id could otherwise manipulate the query.
    if (!id || !token || typeof id !== 'string' || !UUID_RE.test(id)) return null;
    return token === barberSessionToken(id) ? id : null;
  } catch {
    return null;
  }
}

export function managerSessionToken(): string {
  return createHmac('sha256', managerSecret()).update('manager-dashboard').digest('hex');
}

export function isManagerRequest(req: NextRequest): boolean {
  const cookie = req.cookies.get('manager_session')?.value;
  if (!cookie) return false;
  try {
    return cookie === managerSessionToken();
  } catch {
    // Fail closed (deny access) rather than throwing an uncaught 500 if the
    // secret is ever missing.
    return false;
  }
}
