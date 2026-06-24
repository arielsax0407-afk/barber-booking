import { createClient } from '@supabase/supabase-js';

function stripBOM(s: string | undefined): string {
  if (!s) return '';
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function envClean(key: string): string {
  return stripBOM(process.env[key]);
}

const supabaseUrl = stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = stripBOM(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Appointment = {
  id: string;
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  barber_id?: string | null;
  barbers?: { name: string; specialty: string | null } | null;
  cancel_token?: string | null;
};

export type Barber = {
  id: string;
  name: string;
  specialty: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  email?: string | null;
};

export type BlockedSlot = {
  id: string;
  barber_id: string | null;
  blocked_date: string;
  blocked_time: string;
  reason: string | null;
};
