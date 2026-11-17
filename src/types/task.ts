export type Horizon = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
    id: string;
    title: string;
    description: string | null;
    horizon: Horizon;
    status: TaskStatus;
    priority: TaskPriority;
    position: number;
    parent_id: string | null;
    target_date: string | null;
    created_at: string;
    updated_at: string;
}

export const HORIZONS: { id: Horizon; label: string; shortLabel: string; desc: string }[] = [
    { id: 'daily', label: 'Harian', shortLabel: '1 Hari', desc: 'Fokus eksekusi hari ini' },
    { id: 'weekly', label: 'Mingguan', shortLabel: '1 Minggu', desc: 'Target penyelesaian pekan ini' },
    { id: 'monthly', label: 'Bulanan', shortLabel: '1 Bulan', desc: 'Milestone bulan berjalan' },
    { id: 'quarterly', label: 'Per 3 Bulan', shortLabel: '3 Bulan', desc: 'Sasaran kuartal (Q1–Q4)' },
    { id: 'biannual', label: 'Per 6 Bulan', shortLabel: '6 Bulan', desc: 'Target tengah tahun' },
    { id: 'yearly', label: '1 Tahun', shortLabel: '1 Tahun', desc: 'Visi & resolusi utama tahun ini' },
];

export const COLUMNS: { id: Exclude<TaskStatus, 'archived'>; title: string }[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
];