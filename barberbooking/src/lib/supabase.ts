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
};
