'use server';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { Task } from '@/types/task';

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const isValid = token ? await verifySessionToken(token) : false;

  if (!isValid) {
    throw new Error('Unauthorized: Sesi Vault tidak valid.');
  }
}

export interface ShareConfig {
  share_enabled: boolean;
  share_token: string | null;
}

// Ambil status share untuk ditampilkan di modal pemilik Vault
export async function getShareConfig(): Promise<ShareConfig> {
  await requireAuth();

  const { data, error } = await supabaseAdmin
    .from('vault_settings')
    .select('share_enabled, share_token')
    .eq('id', 1)
    .single();

  if (error) {
    return { share_enabled: false, share_token: null };
  }

  return {
    share_enabled: data.share_enabled,
    share_token: data.share_token,
  };
}

// Aktifkan share atau buat ulang token baru (link lama otomatis tidak berlaku)
export async function generateOrRotateShareLink(): Promise<ShareConfig> {
  await requireAuth();

  const newToken = crypto.randomBytes(24).toString('hex');

  const { data, error } = await supabaseAdmin
    .from('vault_settings')
    .upsert({
      id: 1,
      share_enabled: true,
      share_token: newToken,
      updated_at: new Date().toISOString(),
    })
    .select('share_enabled, share_token')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/');

  return {
    share_enabled: data.share_enabled,
    share_token: data.share_token,
  };
}

// Matikan akses publik
export async function disableShareLink(): Promise<ShareConfig> {
  await requireAuth();

  const { error } = await supabaseAdmin
    .from('vault_settings')
    .update({
      share_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) throw new Error(error.message);
  revalidatePath('/');

  return { share_enabled: false, share_token: null };
}

// Ambil data tugas secara READ-ONLY untuk pengunjung dengan token valid
export async function getSharedVaultTasks(token: string): Promise<Task[] | null> {
  if (!token || token.length < 32) return null;

  const { data: settings } = await supabaseAdmin
    .from('vault_settings')
    .select('share_enabled, share_token')
    .eq('id', 1)
    .single();

  if (!settings || !settings.share_enabled || settings.share_token !== token) {
    return null;
  }

  const { data: tasks, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .neq('status', 'archived')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return null;
  return (tasks as Task[]) || [];
}