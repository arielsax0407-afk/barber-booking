import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuthenticatedBarberId } from '@/lib/barberAuth';
import { PRICE_MAP } from '@/lib/services';

export async function GET(req: NextRequest) {
  const barberId = getAuthenticatedBarberId(req);
  if (!barberId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const [{ data: appointments }, { data: blocked }, { data: allAppts }, { data: activeBarbers }] = await Promise.all([
    sb.from('appointments').select('*').eq('barber_id', barberId).order('date').order('time'),
    sb.from('blocked_slots')
      .select('id, blocked_date, blocked_time, reason, barber_id')
      .or(`barber_id.eq.${barberId},barber_id.is.null`)
      .order('blocked_date')
      .order('blocked_time'),
    sb.from('appointments').select('service, date, status'),
    sb.from('barbers').select('id').eq('is_active', true),
  ]);

  // Shop-wide averages (no other barber's identity/numbers exposed — aggregate only)
  const today = new Date().toISOString().split('T')[0];
  const monthPfx = today.slice(0, 7);
  const activeStatuses = ['approved', 'in_progress', 'completed'];
  const monthAll = (allAppts ?? []).filter(a => a.date.startsWith(monthPfx) && activeStatuses.includes(a.status));
  const shopMonthRevenue = monthAll.reduce((s, a) => s + (PRICE_MAP[a.service] ?? 0), 0);
  const activeBarberCount = activeBarbers?.length || 1;
  const shopAvgMonthRevenuePerBarber = Math.round(shopMonthRevenue / activeBarberCount);
  const shopAvgRevenuePerAppt = monthAll.length > 0 ? Math.round(shopMonthRevenue / monthAll.length) : 0;

  return NextResponse.json({
    appointments: appointments ?? [],
    blocked_slots: blocked ?? [],
    shopAvgMonthRevenuePerBarber,
    shopAvgRevenuePerAppt,
  });
}
