import { createClient } from '@supabase/supabase-js';

function stripBOM(s: string | undefined): string {
  if (!s) return '';
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function supabaseAdmin() {
  const url = stripBOM(process.env.NEXT_PUBLIC_SUPABASE_URL).trim();
  const key = (stripBOM(process.env.SUPABASE_SERVICE_ROLE_KEY) || stripBOM(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)).trim();
  return createClient(url, key);
}
