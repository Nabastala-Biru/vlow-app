'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { clearVaultSession, requireVaultSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getTodayWIB } from '@/lib/agent/templates';
import { Horizon, Task, TaskPriority, TaskStatus } from '@/types/task';

async function requireAuth() {
  const authenticated = await requireVaultSession();
  if (!authenticated) {
    redirect('/login');
  }
}

export async function getActiveTasks(): Promise<Task[]> {
  await requireAuth();

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .neq('status', 'archived')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data as Task[]) || []).map((t) => ({
    ...t,
    target_months: Array.isArray(t.target_months) ? t.target_months : [],
  }));
}

export async function getArchivedTasks(): Promise<Task[]> {
  await requireAuth();

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('status', 'archived')
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data as Task[]) || []).map((t) => ({
    ...t,
    target_months: Array.isArray(t.target_months) ? t.target_months : [],
  }));
}

export async function getAllTasksForAnalytics(): Promise<Task[]> {
  await requireAuth();

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data as Task[]) || []).map((t) => ({
    ...t,
    target_months: Array.isArray(t.target_months) ? t.target_months : [],
  }));
}

export async function createTask(input: {
  title: string;
  description?: string;
  horizon: Horizon;
  priority?: TaskPriority;
  parent_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  target_months?: string[];
}): Promise<Task> {
  await requireAuth();

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description || null,
      horizon: input.horizon,
      priority: input.priority || 'medium',
      status: 'todo',
      position: Date.now(),
      parent_id: input.parent_id || null,
      start_date: input.start_date || null,
      target_date: input.target_date || null,
      target_months: input.target_months || [],
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  // Jika tugas harian baru dibuat, otomatis batalkan status libur hari ini
  if (input.horizon === 'daily') {
    const { dateStr, isWeekend } = getTodayWIB();
    if (!isWeekend && (!input.target_date || input.target_date === dateStr)) {
      await supabaseAdmin.from('daily_checkins').upsert({
        date: dateStr,
        is_confirmed_free: false,
        updated_at: new Date().toISOString(),
      });
    }
  }

  revalidatePath('/');

  return {
    ...(data as Task),
    target_months: Array.isArray(data.target_months) ? data.target_months : [],
  };
}

export async function updateTask(
  id: string,
  input: {
    title: string;
    description?: string | null;
    horizon: Horizon;
    priority: TaskPriority;
    parent_id?: string | null;
    start_date?: string | null;
    target_date?: string | null;
    target_months?: string[];
  }
) {
  await requireAuth();

  const { error } = await supabaseAdmin
    .from('tasks')
    .update({
      title: input.title,
      description: input.description || null,
      horizon: input.horizon,
      priority: input.priority,
      parent_id: input.parent_id || null,
      start_date: input.start_date || null,
      target_date: input.target_date || null,
      target_months: input.target_months || [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function linkChildTask(childTaskId: string, parentId: string | null) {
  await requireAuth();

  const { error } = await supabaseAdmin
    .from('tasks')
    .update({
      parent_id: parentId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', childTaskId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function moveTask(
  id: string,
  status: Exclude<TaskStatus, 'archived'>,
  position: number
) {
  await requireAuth();

  const { error } = await supabaseAdmin
    .from('tasks')
    .update({
      status,
      position,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function deleteTask(id: string) {
  await requireAuth();

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function archiveCompletedInHorizon(horizon: Horizon) {
  await requireAuth();

  const { error } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('horizon', horizon)
    .eq('status', 'done');

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function restoreArchivedTask(
  id: string,
  targetStatus: Exclude<TaskStatus, 'archived'> = 'done'
) {
  await requireAuth();

  const { error } = await supabaseAdmin
    .from('tasks')
    .update({
      status: targetStatus,
      position: Date.now(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function lockVault() {
  await clearVaultSession();
  redirect('/login');
}

export async function updateTaskNotes(
  id: string,
  input: {
    progress_notes: string | null;
    blocker_notes: string | null;
  }
) {
  await requireAuth();

  const { error } = await supabaseAdmin
    .from('tasks')
    .update({
      progress_notes: input.progress_notes || null,
      blocker_notes: input.blocker_notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}