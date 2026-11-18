'use server';

import { revalidatePath } from 'next/cache';
import { requireVaultSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getTodayWIB } from '@/lib/agent/templates';

export interface AgentMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  is_read: boolean;
  created_at: string;
}

export async function getTodayAgentMessages(): Promise<AgentMessage[]> {
  const isAuth = await requireVaultSession();
  if (!isAuth) return [];

  const { dateStr } = getTodayWIB();
  const startOfDayWIB = `${dateStr}T00:00:00+07:00`;

  const { data, error } = await supabaseAdmin
    .from('agent_messages')
    .select('*')
    .gte('created_at', startOfDayWIB)
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data as AgentMessage[]) || [];
}

export async function getTodayFreeStatus(): Promise<boolean> {
  const isAuth = await requireVaultSession();
  if (!isAuth) return false;

  const { dateStr } = getTodayWIB();
  const { data } = await supabaseAdmin
    .from('daily_checkins')
    .select('is_confirmed_free')
    .eq('date', dateStr)
    .maybeSingle();

  return Boolean(data?.is_confirmed_free);
}

export async function markAgentMessagesRead() {
  const isAuth = await requireVaultSession();
  if (!isAuth) return;

  await supabaseAdmin
    .from('agent_messages')
    .update({ is_read: true })
    .eq('is_read', false);

  revalidatePath('/');
}

export async function clearTodayAgentMessages() {
  const isAuth = await requireVaultSession();
  if (!isAuth) return;

  const { dateStr } = getTodayWIB();
  const startOfDayWIB = `${dateStr}T00:00:00+07:00`;

  await supabaseAdmin
    .from('agent_messages')
    .delete()
    .gte('created_at', startOfDayWIB);

  revalidatePath('/');
}