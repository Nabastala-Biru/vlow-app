import { groq } from '@ai-sdk/groq';
import { generateText, stepCountIs } from 'ai';
import { NextResponse } from 'next/server';
import { requireVaultSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getTodayWIB } from '@/lib/agent/templates';
import { agentTools } from '@/lib/agent/tools';

export async function POST(request: Request) {
  const isAuth = await requireVaultSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages } = await request.json();
  const { dateStr, isWeekend, dayName } = getTodayWIB();

  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg?.role === 'user') {
    await supabaseAdmin.from('agent_messages').insert({
      role: 'user',
      content: lastUserMsg.content,
      is_read: true,
    });
  }

  const systemPrompt = `Kamu adalah asisten pribadi khusus untuk aplikasi manajemen tugas "Vlow Vault".
Konteks waktu saat ini: Hari ${dayName}, tanggal ${dateStr} (${isWeekend ? 'Weekend - fokus freelance/project sampingan/istirahat' : 'Weekday - fokus kerjaan harian'}).

ATURAN KETAT (GUARDRAIL):
1. Kamu HANYA boleh membahas hal seputar tugas, jadwal harian, dan papan Kanban di dalam Vlow Vault.
2. Jika pengguna bertanya topik di luar Vlow Vault (seperti pemrograman umum, pengetahuan umum, berita, hiburan, dll.), TOLAK dengan sopan dan singkat: "Maaf, aku hanya fokus membantu urusan jadwal dan tugasmu di Vlow Vault."
3. WAJIB panggil tool 'addDailyTask' setiap kali pengguna menyebutkan pekerjaan/tugas yang ingin dikerjakan hari ini. Jika ada beberapa tugas, panggil 'addDailyTask' untuk masing-masing tugas.
4. WAJIB panggil tool 'confirmFreeDay' jika pengguna menyatakan hari ini memang kosong, libur, atau tidak ada pekerjaan.
5. Jawab selalu dalam Bahasa Indonesia yang singkat, santai, dan jelas.`;

  const result = await generateText({
    model: groq('openai/gpt-oss-20b'),
    system: systemPrompt,
    messages,
    tools: agentTools,
    stopWhen: stepCountIs(5),
    temperature: 0.1,
  });

  const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
  const hasTaskUpdate = allToolCalls.some((t) => t.toolName === 'addDailyTask');
  const isFreeConfirmed = allToolCalls.some((t) => t.toolName === 'confirmFreeDay');

  const finalReply =
    result.text ||
    (hasTaskUpdate
      ? 'Siap, tugas sudah ditambahkan ke papan Harian.'
      : isFreeConfirmed
      ? 'Oke, hari ini ditandai libur.'
      : '');

  if (finalReply) {
    await supabaseAdmin.from('agent_messages').insert({
      role: 'assistant',
      content: finalReply,
      is_read: true,
    });
  }

  return NextResponse.json({
    text: finalReply,
    hasTaskUpdate,
    isFreeConfirmed,
  });
}