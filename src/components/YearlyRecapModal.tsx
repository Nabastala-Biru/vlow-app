'use client';

import { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Compass,
  Flag,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import { HORIZONS, Horizon, Task, formatMonthYearID } from '@/types/task';
import { CustomSelect, SelectOption } from '@/components/VaultPickers';

const SHORT_MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const FULL_MONTHS_ID = [
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

function formatLocalYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTaskEffectiveYear(task: Task): number {
  if (task.target_date && /^\d{4}/.test(task.target_date)) {
    return Number(task.target_date.slice(0, 4));
  }
  if (task.start_date && /^\d{4}/.test(task.start_date)) {
    return Number(task.start_date.slice(0, 4));
  }
  if (Array.isArray(task.target_months) && task.target_months.length > 0) {
    const first = task.target_months[0];
    if (/^\d{4}/.test(first)) return Number(first.slice(0, 4));
  }
  if (task.updated_at && /^\d{4}/.test(task.updated_at)) {
    return Number(task.updated_at.slice(0, 4));
  }
  return new Date().getFullYear();
}

function getTaskEffectiveMonthIndex(task: Task): number {
  if (task.target_date && /^\d{4}-\d{2}/.test(task.target_date)) {
    return Number(task.target_date.slice(5, 7)) - 1;
  }
  if (task.start_date && /^\d{4}-\d{2}/.test(task.start_date)) {
    return Number(task.start_date.slice(5, 7)) - 1;
  }
  if (Array.isArray(task.target_months) && task.target_months.length > 0) {
    const first = task.target_months[0];
    if (/^\d{4}-\d{2}/.test(first)) return Number(first.slice(5, 7)) - 1;
  }
  if (task.updated_at && /^\d{4}-\d{2}/.test(task.updated_at)) {
    return Number(task.updated_at.slice(5, 7)) - 1;
  }
  return new Date().getMonth();
}

function computeBestStreakForDates(sortedUniqueDates: string[]): number {
  if (sortedUniqueDates.length === 0) return 0;
  let best = 1;
  let current = 1;

  for (let i = 1; i < sortedUniqueDates.length; i++) {
    const prev = new Date(`${sortedUniqueDates[i - 1]}T00:00:00`);
    const curr = new Date(`${sortedUniqueDates[i]}T00:00:00`);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

export default function YearlyRecapModal({
  isOpen,
  onClose,
  allTasks,
}: {
  isOpen: boolean;
  onClose: () => void;
  allTasks: Task[];
}) {
  const currentYear = new Date().getFullYear();

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYear]);
    allTasks.forEach((t) => {
      yearsSet.add(getTaskEffectiveYear(t));
      if (Array.isArray(t.target_months)) {
        t.target_months.forEach((ym) => {
          if (/^\d{4}/.test(ym)) yearsSet.add(Number(ym.slice(0, 4)));
        });
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allTasks, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const yearOptions: SelectOption[] = availableYears.map((y) => ({
    value: String(y),
    label: `Tahun ${y}`,
  }));

  const recap = useMemo(() => {
    const todayYMD = formatLocalYMD(new Date());

    const tasksInYear = allTasks.filter((t) => {
      const primaryYear = getTaskEffectiveYear(t);
      const hasMonthInYear =
        Array.isArray(t.target_months) &&
        t.target_months.some((ym) => ym.startsWith(`${selectedYear}-`));
      return primaryYear === selectedYear || hasMonthInYear;
    });

    const completedTasks = tasksInYear.filter(
      (t) => t.status === 'done' || t.status === 'archived'
    );

    const completionRate =
      tasksInYear.length > 0
        ? Math.round((completedTasks.length / tasksInYear.length) * 100)
        : 0;

    // Aktivitas bulanan (Jan - Des)
    const monthlyCounts = Array(12).fill(0);
    completedTasks.forEach((t) => {
      if (Array.isArray(t.target_months) && t.target_months.length > 0) {
        const matchingMonths = t.target_months.filter((ym) =>
          ym.startsWith(`${selectedYear}-`)
        );
        if (matchingMonths.length > 0) {
          matchingMonths.forEach((ym) => {
            const idx = Number(ym.slice(5, 7)) - 1;
            if (idx >= 0 && idx < 12) monthlyCounts[idx] += 1;
          });
          return;
        }
      }
      const mIdx = getTaskEffectiveMonthIndex(t);
      if (mIdx >= 0 && mIdx < 12) monthlyCounts[mIdx] += 1;
    });

    const maxMonthlyCount = Math.max(...monthlyCounts, 1);
    const bestMonthIdx = monthlyCounts.indexOf(Math.max(...monthlyCounts));
    const hasMonthlyActivity = Math.max(...monthlyCounts) > 0;

    // Rekor Streak Harian di tahun terpilih (Anti-Backdate: wajib selesai pada hari target_date)
    const completedDailyDates = Array.from(
      new Set(
        completedTasks
          .filter((t) => {
            if (
              t.horizon !== 'daily' ||
              !t.target_date ||
              !t.updated_at ||
              !t.target_date.startsWith(`${selectedYear}-`) ||
              t.target_date > todayYMD
            ) {
              return false;
            }
            const completedLocalYMD = formatLocalYMD(new Date(t.updated_at));
            return completedLocalYMD === t.target_date;
          })
          .map((t) => t.target_date!)
      )
    ).sort();

    const bestYearStreak = computeBestStreakForDates(completedDailyDates);

    // Breakdown per Horizon
    const byHorizon = HORIZONS.map((h) => {
      const total = tasksInYear.filter((t) => t.horizon === h.id).length;
      const done = completedTasks.filter((t) => t.horizon === h.id).length;
      return { ...h, total, done };
    });

    // Target Besar yang berhasil dituntaskan (1 Tahun, 6 Bulan, 3 Bulan)
    const majorMilestones = completedTasks.filter((t) =>
      (['yearly', 'biannual', 'quarterly'] as Horizon[]).includes(t.horizon)
    );

    return {
      totalTasks: tasksInYear.length,
      completedCount: completedTasks.length,
      activeStreakDays: completedDailyDates.length,
      completionRate,
      monthlyCounts,
      maxMonthlyCount,
      bestMonthLabel: hasMonthlyActivity ? FULL_MONTHS_ID[bestMonthIdx] : '-',
      bestMonthCount: hasMonthlyActivity ? monthlyCounts[bestMonthIdx] : 0,
      bestYearStreak,
      byHorizon,
      majorMilestones,
    };
  }, [allTasks, selectedYear]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/55 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0 bg-gradient-to-r from-emerald-50/70 via-white to-amber-50/50 dark:from-emerald-950/30 dark:via-neutral-900 dark:to-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15 border border-emerald-600/25 dark:border-emerald-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-none">
                Rekap Perjalanan {selectedYear}
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                Kilas balik seluruh pencapaian dan konsistensi tugas di Vlow Vault
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CustomSelect
              size="sm"
              align="right"
              value={String(selectedYear)}
              onChange={(val) => setSelectedYear(Number(val))}
              options={yearOptions}
              className="w-36"
            />
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Konten Rekap */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6">
          {/* 4 Kartu Statistik Utama */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-800/50">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1.5">
                <span className="text-xs font-semibold">Tugas Tuntas</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {recap.completedCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                dari {recap.totalTasks} tugas ({recap.completionRate}%)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/50">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1.5">
                <span className="text-xs font-semibold">Rekor Streak</span>
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {recap.bestYearStreak}{' '}
                <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                  Hari
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {recap.activeStreakDays} hari tepat waktu
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-800/50">
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1.5">
                <span className="text-xs font-semibold">Target Besar</span>
                <Trophy className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {recap.majorMilestones.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                Kuartal, 6 Bln & Tahunan
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/25 border border-sky-200/70 dark:border-sky-800/50">
              <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 mb-1.5">
                <span className="text-xs font-semibold">Bulan Terbaik</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
                {recap.bestMonthLabel}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {recap.bestMonthCount} tugas selesai
              </div>
            </div>
          </div>

          {/* Grafik Aktivitas Bulanan */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-neutral-950/70 border border-slate-200/80 dark:border-neutral-800/80">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  Aktivitas Penyelesaian per Bulan ({selectedYear})
                </h3>
              </div>
              <span className="text-xs text-slate-400 dark:text-neutral-500">
                Total: {recap.completedCount} selesai
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end h-36 pt-4 px-1">
              {recap.monthlyCounts.map((count, idx) => {
                const heightPct =
                  count > 0 ? Math.max(14, Math.round((count / recap.maxMonthlyCount) * 100)) : 6;
                return (
                  <div
                    key={SHORT_MONTHS_ID[idx]}
                    className="flex flex-col items-center gap-1.5 h-full justify-end group"
                  >
                    <span
                      className={`text-[11px] font-bold transition-opacity ${
                        count > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-300 dark:text-neutral-700'
                      }`}
                    >
                      {count}
                    </span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        title={`${FULL_MONTHS_ID[idx]} ${selectedYear}: ${count} tugas selesai`}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          count > 0
                            ? 'bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:brightness-110'
                            : 'bg-slate-200/70 dark:bg-neutral-800/70'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
                      {SHORT_MONTHS_ID[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid 2 Kolom: Pencapaian Besar & Rincian per Horizon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sorotan Pencapaian Jangka Menengah & Panjang */}
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-neutral-950/70 border border-slate-200/80 dark:border-neutral-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  Pencapaian Target Besar
                </h3>
              </div>

              {recap.majorMilestones.length > 0 ? (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {recap.majorMilestones.map((item) => {
                    const HorizonIcon =
                      item.horizon === 'yearly'
                        ? Flag
                        : item.horizon === 'biannual'
                        ? Compass
                        : Target;
                    const hLabel =
                      HORIZONS.find((h) => h.id === item.horizon)?.shortLabel || item.horizon;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <HorizonIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              {hLabel}
                            </span>
                            {item.target_months?.length > 0 && (
                              <span className="text-[10px] text-slate-400 dark:text-neutral-500 truncate">
                                {item.target_months.map(formatMonthYearID).join(', ')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-neutral-100 mt-1 leading-snug">
                            {item.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-neutral-500 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                  Belum ada target Kuartal, 6 Bulanan, atau Tahunan yang selesai di {selectedYear}.
                </div>
              )}
            </div>

            {/* Rincian Penyelesaian per Horizon */}
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-neutral-950/70 border border-slate-200/80 dark:border-neutral-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  Rincian per Rentang Waktu
                </h3>
              </div>

              <div className="space-y-3">
                {recap.byHorizon.map((h) => {
                  const pct = h.total > 0 ? Math.round((h.done / h.total) * 100) : 0;
                  return (
                    <div key={h.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-neutral-300">
                          {h.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-semibold">
                          {h.done}/{h.total} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200/80 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}