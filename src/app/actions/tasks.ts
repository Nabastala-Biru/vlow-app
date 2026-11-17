'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { Horizon, Task, TaskPriority, TaskStatus } from '@/types/task';

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const isValid = token ? await verifySessionToken(token) : false;

  if (!isValid) {
    throw new Error('Unauthorized: Sesi Vault tidak valid.');
  }
}

export async function getActiveTasks(): Promise<Task[]> {
  await requireAuth();

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .neq('status', 'archived')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });

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
    .order('updated_at', { ascending: false });

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
  priority: TaskPriority;
  parent_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  target_months?: string[];
}) {
  await requireAuth();

  const { error } = await supabaseAdmin.from('tasks').insert({
    title: input.title.trim(),
    description: input.description?.trim() || null,
    horizon: input.horizon,
    priority: input.priority || 'medium',
    status: 'todo',
    position: Date.now(),
    parent_id: input.parent_id || null,
    start_date: input.start_date || null,
    target_date: input.target_date || null,
    target_months: input.target_months || [],
  });

  if (error) throw new Error(error.message);
  revalidatePath('/');
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
      title: input.title.trim(),
      description: input.description?.trim() || null,
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

export async function linkChildTask(childTaskId: string, parentTaskId: string | null) {
  await requireAuth();

  const { error } = await supabaseAdmin
    .from('tasks')
    .update({
      parent_id: parentTaskId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', childTaskId);

  if (error) throw new Error(error.message);
  revalidatePath('/');
}

export async function moveTask(id: string, status: TaskStatus, position: number) {
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
    .update({ status: 'archived', updated_at: new Date().toISOString() })
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

export async function lockVault() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect('/login');
}