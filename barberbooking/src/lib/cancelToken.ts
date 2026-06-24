import { randomBytes } from 'crypto';

// 24 random bytes = 192 bits of entropy, hex-encoded — long enough to be
// unguessable, short enough to sit comfortably in a URL. This is the only
// thing that authorizes a self-cancel; knowing a customer's phone number
// must never be enough on its own.
export function generateCancelToken(): string {
  return randomBytes(24).toString('hex');
}
