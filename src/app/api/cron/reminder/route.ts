import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getRandomReminderTemplate, getTodayWIB } from '@/lib/agent/templates';

export async function GET(request: Request) {
  // Validasi kunci rahasia dari Supabase pg_cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { dateStr, isWeekend } = getTodayWIB();

  // 1. Cek apakah hari ini sudah dikonfirmasi libur
  const { data: checkin } = await supabaseAdmin
    .from('daily_checkins')
    .select('is_confirmed_free')
    .eq('date', dateStr)
    .maybeSingle();

  if (checkin?.is_confirmed_free) {
    return NextResponse.json({ status: 'skipped', reason: 'Confirmed free day' });
  }

  // 2. Cek apakah ada tugas aktif di horizon 'daily'
  const { data: dailyTasks, error: taskError } = await supabaseAdmin
    .from('tasks')
    .select('id, title, status')
    .eq('horizon', 'daily')
    .in('status', ['todo', 'in_progress']);

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  let messageToSend = '';

  if (dailyTasks && dailyTasks.length > 0) {
    const taskTitles = dailyTasks.map((t) => `- ${t.title}`).join('\n');
    messageToSend = `Pengingat jadwal hari ini! Masih ada ${dailyTasks.length} tugas yang belum selesai:\n${taskTitles}`;
  } else {
    messageToSend = getRandomReminderTemplate(isWeekend);
  }

  // 3. Simpan pesan pengingat ke database agar muncul di UI Vlow Vault
  await supabaseAdmin.from('agent_messages').insert({
    role: 'assistant',
    content: messageToSend,
    is_read: false,
  });

  return NextResponse.json({ status: 'sent', message: messageToSend });
}