import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isManagerRequest } from '@/lib/barberAuth';

export async function POST(req: NextRequest) {
  if (!isManagerRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { barber_id, name, price, duration } = await req.json();

  if (!barber_id || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!Number.isInteger(price) || price <= 0) {
    return NextResponse.json({ error: 'מחיר לא תקין' }, { status: 400 });
  }
  if (!Number.isInteger(duration) || duration <= 0) {
    return NextResponse.json({ error: 'משך זמן לא תקין' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // New service goes to the end of this barber's list — look up the current
  // max sort_order so reordering never has to renumber existing rows.
  const { data: existing } = await sb
    .from('barber_services')
    .select('sort_order')
    .eq('barber_id', barber_id)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextSortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await sb
    .from('barber_services')
    .insert({ barber_id, name: name.trim(), price, duration, sort_order: nextSortOrder })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}

export async function PATCH(req: NextRequest) {
  if (!isManagerRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, name, price, duration, is_active, sort_order } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const update: Record<string, string | number | boolean> = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'שם שירות לא תקין' }, { status: 400 });
    }
    update.name = name.trim();
  }
  if (price !== undefined) {
    if (!Number.isInteger(price) || price <= 0) {
      return NextResponse.json({ error: 'מחיר לא תקין' }, { status: 400 });
    }
    update.price = price;
  }
  if (duration !== undefined) {
    if (!Number.isInteger(duration) || duration <= 0) {
      return NextResponse.json({ error: 'משך זמן לא תקין' }, { status: 400 });
    }
    update.duration = duration;
  }
  if (is_active !== undefined) {
    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid is_active' }, { status: 400 });
    }
    update.is_active = is_active;
  }
  if (sort_order !== undefined) {
    if (!Number.isInteger(sort_order)) {
      return NextResponse.json({ error: 'Invalid sort_order' }, { status: 400 });
    }
    update.sort_order = sort_order;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb.from('barber_services').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}
