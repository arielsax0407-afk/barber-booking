import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

function barberSecret(): string {
  return process.env.BARBER_SESSION_SECRET || 'barber-premium-session-2024';
}

function managerSecret(): string {
  return process.env.MANAGER_SESSION_SECRET || 'manager-premium-session-2024';
}

export function barberSessionToken(barberId: string): string {
  return createHmac('sha256', barberSecret()).update(barberId).digest('hex');
}

export function getAuthenticatedBarberId(req: NextRequest): string | null {
  const cookie = req.cookies.get('barber_session')?.value;
  if (!cookie) return null;
  try {
    const { id, token } = JSON.parse(cookie);
    if (!id || !token) return null;
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
  return !!cookie && cookie === managerSessionToken();
}
