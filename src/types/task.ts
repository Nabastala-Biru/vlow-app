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
  start_date: string | null;
  target_date: string | null;
  target_months: string[];
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

export const CHILD_HORIZON_MAP: Record<Horizon, Horizon | null> = {
  daily: null,
  weekly: 'daily',
  monthly: 'weekly',
  quarterly: 'monthly',
  biannual: 'quarterly',
  yearly: 'biannual',
};

export const COLUMNS: { id: Exclude<TaskStatus, 'archived'>; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatDateID(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export function formatMonthYearID(ym: string): string {
  const [year, month] = ym.split('-');
  const monthIdx = Number(month) - 1;
  if (!year || monthIdx < 0 || monthIdx > 11) return ym;
  return `${MONTH_NAMES_ID[monthIdx]} ${year}`;
}

export function getCalendarMonthBounds(ym: string): { start: string; end: string } {
  const [yearStr, monthStr] = ym.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${yearStr}-${monthStr}-01`,
    end: `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function getMonthlyEffectiveRange(
  monthlyTask: Task,
  allTasks: Task[]
): { start: string; end: string; isAuto: boolean } | null {
  const weeklyChildren = allTasks.filter(
    (t) => t.parent_id === monthlyTask.id && t.horizon === 'weekly'
  );

  const starts: string[] = [];
  const ends: string[] = [];

  for (const w of weeklyChildren) {
    if (w.start_date) starts.push(w.start_date);
    else if (w.target_date) starts.push(w.target_date);

    if (w.target_date) ends.push(w.target_date);
    else if (w.start_date) ends.push(w.start_date);
  }

  if (starts.length > 0 && ends.length > 0) {
    starts.sort();
    ends.sort();
    return {
      start: starts[0],
      end: ends[ends.length - 1],
      isAuto: true,
    };
  }

  if (monthlyTask.start_date && monthlyTask.target_date) {
    return {
      start: monthlyTask.start_date,
      end: monthlyTask.target_date,
      isAuto: false,
    };
  }

  return null;
}

export function getMonthDetailBounds(
  ym: string,
  parentTask: Task,
  allTasks: Task[]
): { start: string; end: string; isFromWeekly: boolean } {
  const directMonthlyChildren = allTasks.filter(
    (t) => t.parent_id === parentTask.id && t.horizon === 'monthly'
  );

  for (const m of directMonthlyChildren) {
    const range = getMonthlyEffectiveRange(m, allTasks);
    if (range && (range.start.startsWith(ym) || range.end.startsWith(ym))) {
      return { start: range.start, end: range.end, isFromWeekly: range.isAuto };
    }
  }

  const cal = getCalendarMonthBounds(ym);
  return { start: cal.start, end: cal.end, isFromWeekly: false };
}