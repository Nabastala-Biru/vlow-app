import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { getTodayWIB } from './templates';

export const agentTools = {
  addDailyTask: tool({
    description: 'Menambahkan tugas baru ke papan Kanban horizon Harian (daily) untuk hari ini.',
    inputSchema: z.object({
      title: z.string().describe('Judul tugas yang ringkas dan jelas'),
      description: z.string().optional().describe('Detail tambahan jika disebutkan pengguna'),
      priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Prioritas tugas'),
    }),
    execute: async ({ title, description, priority }) => {
      const { dateStr, isWeekend } = getTodayWIB();
      const { error } = await supabaseAdmin.from('tasks').insert({
        title,
        description: description || null,
        horizon: 'daily',
        priority,
        status: 'todo',
        position: Date.now(),
        start_date: dateStr,
        target_date: dateStr,
        target_months: [],
      });

      if (error) return { success: false, message: error.message };

      // Jika hari kerja (Senin-Jumat), batalkan status libur saat tugas baru ditambahkan
      if (!isWeekend) {
        await supabaseAdmin.from('daily_checkins').upsert({
          date: dateStr,
          is_confirmed_free: false,
          updated_at: new Date().toISOString(),
        });
      }

      return { success: true, message: `Tugas "${title}" berhasil ditambahkan ke papan Harian.` };
    },
  }),

  confirmFreeDay: tool({
    description:
      'Menandai bahwa hari ini memang libur atau tidak ada pekerjaan sehingga agen berhenti bertanya.',
    inputSchema: z.object({
      reason: z.string().optional().describe('Alasan singkat misal libur atau istirahat'),
    }),
    execute: async () => {
      const { dateStr } = getTodayWIB();
      const { error } = await supabaseAdmin.from('daily_checkins').upsert({
        date: dateStr,
        is_confirmed_free: true,
        updated_at: new Date().toISOString(),
      });

      if (error) return { success: false, message: error.message };
      return {
        success: true,
        message: 'Status hari ini ditandai libur. Pengingat dihentikan sampai besok.',
      };
    },
  }),
};