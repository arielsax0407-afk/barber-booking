import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

export function adminSessionToken(adminPassword: string): string {
  return createHmac('sha256', adminPassword).update('barber-admin-session').digest('hex');
}

export function isAdminRequest(req: NextRequest, adminPassword: string): boolean {
  if (!adminPassword) return false;
  const cookie = req.cookies.get('admin_session')?.value;
  return cookie === adminSessionToken(adminPassword);
}
