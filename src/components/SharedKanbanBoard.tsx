'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Link2,
  Sun,
  Moon,
  Search,
  X,
  Layers,
  AlertCircle,
  Eye,
  Menu,
  CheckCircle2,
  Clock,
  Circle,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Target,
  Flag,
  NotebookPen,
  HelpCircle,
} from 'lucide-react';
import {
  CHILD_HORIZON_MAP,
  COLUMNS,
  HORIZONS,
  Horizon,
  Task,
  TaskPriority,
  formatDateID,
  formatMonthYearID,
  getMonthDetailBounds,
  getMonthlyEffectiveRange,
} from '@/types/task';

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const MULTI_MONTH_HORIZONS: Horizon[] = ['quarterly', 'yearly'];

const HORIZON_ICONS: Record<Horizon, React.ComponentType<{ className?: string }>> = {
  daily: CalendarDays,
  weekly: CalendarRange,
  monthly: CalendarClock,
  quarterly: Target,
  yearly: Flag,
};

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string; dotClass: string }
> = {
  low: {
    label: 'Low',
    badgeClass:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
    dotClass: 'bg-slate-400',
  },
  medium: {
    label: 'Medium',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
    dotClass: 'bg-sky-500',
  },
  high: {
    label: 'High',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
    dotClass: 'bg-rose-500',
  },
};

export default function SharedKanbanBoard({ tasks }: { tasks: Task[] }) {
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('daily');
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [showMonthDetails, setShowMonthDetails] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('vault_theme');
    const darkEnabled = saved ? saved === 'dark' : true;
    setIsDark(darkEnabled);
    document.documentElement.classList.toggle('dark', darkEnabled);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('vault_theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  }

  // Syarat Progressive Unlock yang konsisten dengan papan utama
  const monthlyDoneTotal = useMemo(
    () => tasks.filter((t) => t.horizon === 'monthly' && t.status === 'done').length,
    [tasks]
  );
  const isQuarterlyUnlocked = monthlyDoneTotal >= 3;
  const hasQuarterlyTasks = useMemo(
    () => tasks.some((t) => t.horizon === 'quarterly'),
    [tasks]
  );
  const isYearlyUnlocked = isQuarterlyUnlocked && hasQuarterlyTasks;

  const visibleHorizons = useMemo(
    () =>
      HORIZONS.filter((h) => {
        if (h.id === 'quarterly') return isQuarterlyUnlocked;
        if (h.id === 'yearly') return isYearlyUnlocked;
        return true;
      }),
    [isQuarterlyUnlocked, isYearlyUnlocked]
  );

  const activeHorizonMeta = HORIZONS.find((h) => h.id === activeHorizon)!;
  const horizonTasks = tasks.filter((t) => t.horizon === activeHorizon);
  const doneCount = horizonTasks.filter((t) => t.status === 'done').length;
  const progress =
    horizonTasks.length > 0 ? Math.round((doneCount / horizonTasks.length) * 100) : 0;

  const filteredTasks = horizonTasks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || (t.priority || 'medium') === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const todayStr = getTodayDateString();
  const detailTask = detailTaskId ? tasks.find((t) => t.id === detailTaskId) || null : null;
  const detailChildHorizon = detailTask ? CHILD_HORIZON_MAP[detailTask.horizon] : null;
  const detailChildHorizonMeta = detailChildHorizon
    ? HORIZONS.find((h) => h.id === detailChildHorizon) || null
    : null;
  const detailSubtasks = detailTask ? tasks.filter((t) => t.parent_id === detailTask.id) : [];
  const detailMonthlyRange =
    detailTask && detailTask.horizon === 'monthly'
      ? getMonthlyEffectiveRange(detailTask, tasks)
      : null;

  function renderTaskScheduleBadge(task: Task) {
    if (task.horizon === 'daily' && task.target_date) {
      const isOverdue = task.target_date < todayStr && task.status !== 'done';
      const isDueToday = task.target_date === todayStr && task.status !== 'done';

      return (
        <span
          className={`inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded ${
            isOverdue
              ? 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50'
              : isDueToday
              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50'
              : 'text-slate-500 dark:text-neutral-400'
          }`}
        >
          {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
          <span>{isDueToday ? 'Hari ini' : formatDateID(task.target_date)}</span>
        </span>
      );
    }

    if (task.horizon === 'weekly' && task.start_date && task.target_date) {
      const isOverdue = task.target_date < todayStr && task.status !== 'done';
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded ${
            isOverdue
              ? 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50'
              : 'text-slate-600 bg-slate-100 dark:text-neutral-300 dark:bg-neutral-800'
          }`}
        >
          <CalendarRange className="w-3 h-3 shrink-0" />
          <span>
            {formatDateID(task.start_date)} s/d {formatDateID(task.target_date)}
          </span>
        </span>
      );
    }

    if (task.horizon === 'monthly') {
      const range = getMonthlyEffectiveRange(task, tasks);
      if (range) {
        return (
          <span className="inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50">
            <CalendarClock className="w-3 h-3 shrink-0" />
            <span>
              {formatDateID(range.start)} s/d {formatDateID(range.end)}
            </span>
          </span>
        );
      }
      return (
        <span className="text-slate-400 dark:text-neutral-500 italic">
          Menunggu jadwal mingguan
        </span>
      );
    }

    if (MULTI_MONTH_HORIZONS.includes(task.horizon) && task.target_months?.length > 0) {
      const firstLabel = formatMonthYearID(task.target_months[0]);
      const extraCount = task.target_months.length - 1;
      return (
        <span className="inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/50">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>
            {firstLabel}
            {extraCount > 0 ? ` +${extraCount} bln` : ''}
          </span>
        </span>
      );
    }

    return (
      <span className="text-slate-400 dark:text-neutral-500">
        {activeHorizonMeta.shortLabel}
      </span>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-600/10 dark:bg-sky-500/15 border border-sky-600/20 dark:border-sky-500/30 flex items-center justify-center">
            <Eye className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-sm block leading-none">
              Shared Vault
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 mt-1 block">
              Read-Only Mode
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
          Horizon Waktu
        </div>
        {visibleHorizons.map((h) => {
          const Icon = HORIZON_ICONS[h.id];
          const activeCount = tasks.filter((t) => t.horizon === h.id && t.status !== 'done').length;
          const active = activeHorizon === h.id;

          return (
            <button
              key={h.id}
              onClick={() => {
                setActiveHorizon(h.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                active
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-white' : 'text-slate-400 dark:text-neutral-500'
                  }`}
                />
                <span className="text-xs sm:text-sm font-medium truncate">{h.label}</span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-md font-semibold shrink-0 ${
                  active
                    ? 'bg-sky-700/80 text-white'
                    : 'bg-slate-200/80 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {activeCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-200/80 dark:border-neutral-800/80 shrink-0">
        <button
          onClick={toggleTheme}
          className="w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800/70 flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Mode Siang</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span>Mode Malam</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100 flex transition-colors duration-200">
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200/80 dark:border-neutral-800/90 bg-white dark:bg-neutral-900/70 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs"
          />
          <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 h-full z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200/80 dark:border-neutral-800/90 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold tracking-tight text-base sm:text-lg truncate">
                  {activeHorizonMeta.label}
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60">
                  Read-Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 truncate hidden sm:block">
                {activeHorizonMeta.desc}
              </p>
            </div>
          </div>
        </header>

        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-2">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-neutral-900/70 border border-slate-200/90 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-sm font-medium text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                Progres:{' '}
                <span className="text-sky-600 dark:text-sky-400 font-bold">{progress}%</span>
                <span className="text-xs text-slate-400 dark:text-neutral-500 ml-1.5">
                  ({doneCount}/{horizonTasks.length})
                </span>
              </div>
              <div className="flex-1 max-w-xs h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari tugas..."
                  className="w-full sm:w-52 pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-sky-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="all">Semua Prioritas</option>
                <option value="high">Prioritas: High</option>
                <option value="medium">Prioritas: Medium</option>
                <option value="low">Prioritas: Low</option>
              </select>
            </div>
          </div>
        </div>

        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <section
                key={col.id}
                className="rounded-2xl p-4 flex flex-col min-h-[460px] border bg-slate-100/70 border-slate-200/80 dark:bg-neutral-900/50 dark:border-neutral-800/80"
              >
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        col.id === 'todo'
                          ? 'bg-slate-400 dark:bg-neutral-500'
                          : col.id === 'in_progress'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-neutral-200">
                      {col.title}
                    </h2>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 font-semibold border border-slate-200/80 dark:border-neutral-700/80">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {columnTasks.map((task) => {
                    const parentTask = task.parent_id
                      ? tasks.find((p) => p.id === task.parent_id)
                      : null;

                    const childTasks = tasks.filter((c) => c.parent_id === task.id);
                    const completedChildren = childTasks.filter((c) => c.status === 'done').length;
                    const prio = PRIORITY_META[task.priority || 'medium'];
                    const hasNotes = Boolean(
                      (task.progress_notes && task.progress_notes.trim()) ||
                        (task.blocker_notes && task.blocker_notes.trim())
                    );

                    return (
                      <div
                        key={task.id}
                        onClick={() => {
                          setShowMonthDetails(false);
                          setDetailTaskId(task.id);
                        }}
                        className="group bg-white hover:bg-slate-50/90 dark:bg-neutral-900 dark:hover:bg-neutral-800/90 border border-slate-200/90 hover:border-sky-400/60 dark:border-neutral-800 dark:hover:border-sky-600/50 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${prio.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${prio.dotClass}`} />
                            {prio.label}
                          </span>

                          {parentTask && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/60 px-2 py-0.5 rounded-md max-w-[180px]">
                              <Link2 className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{parentTask.title}</span>
                            </span>
                          )}
                        </div>

                        <h3
                          className={`text-sm font-semibold leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors ${
                            task.status === 'done'
                              ? 'line-through text-slate-400 dark:text-neutral-500'
                              : 'text-slate-800 dark:text-neutral-100'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {childTasks.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 px-2 py-1 rounded-lg">
                              <Layers className="w-3 h-3" />
                              <span>
                                {completedChildren}/{childTasks.length} sub-tugas
                              </span>
                            </div>
                          )}

                          {hasNotes && (
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-2 py-1 rounded-lg">
                              <NotebookPen className="w-3 h-3 text-amber-500" />
                              <span>Ada Catatan</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px]">
                          {renderTaskScheduleBadge(task)}
                          <span className="text-[10px] font-medium text-slate-400 group-hover:text-sky-500 transition-colors">
                            Klik untuk detail
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="h-28 border border-dashed border-slate-300/80 dark:border-neutral-800 rounded-xl flex items-center justify-center text-xs text-slate-400 dark:text-neutral-600">
                      Tidak ada tugas
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </main>
      </div>

      {/* Modal Detail Read-Only (Termasuk Akses Baca Catatan) */}
      {detailTask && (
        <div
          onClick={() => setDetailTaskId(null)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                    PRIORITY_META[detailTask.priority || 'medium'].badgeClass
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      PRIORITY_META[detailTask.priority || 'medium'].dotClass
                    }`}
                  />
                  {PRIORITY_META[detailTask.priority || 'medium'].label}
                </span>

                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {HORIZONS.find((h) => h.id === detailTask.horizon)?.label}
                </span>

                {detailTask.horizon === 'daily' && detailTask.target_date && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-md">
                    <Calendar className="w-3 h-3" />
                    {formatDateID(detailTask.target_date)}
                  </span>
                )}

                {detailTask.horizon === 'weekly' &&
                  detailTask.start_date &&
                  detailTask.target_date && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-md">
                      <CalendarRange className="w-3 h-3" />
                      {formatDateID(detailTask.start_date)} s/d {formatDateID(detailTask.target_date)}
                    </span>
                  )}

                {detailTask.horizon === 'monthly' && detailMonthlyRange && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-md">
                    <CalendarClock className="w-3 h-3" />
                    {formatDateID(detailMonthlyRange.start)} s/d{' '}
                    {formatDateID(detailMonthlyRange.end)}
                  </span>
                )}
              </div>

              <button
                onClick={() => setDetailTaskId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-neutral-100">
                  {detailTask.title}
                </h2>
                {detailTask.description ? (
                  <p className="text-sm text-slate-600 dark:text-neutral-300 mt-2.5 whitespace-pre-line leading-relaxed">
                    {detailTask.description}
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-neutral-500 mt-2">
                    Tidak ada deskripsi tambahan.
                  </p>
                )}

                {/* Tampilan Baca Catatan Progres & Kendala (Strict Read-Only) */}
                {(detailTask.progress_notes || detailTask.blocker_notes) && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-slate-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                      <NotebookPen className="w-3.5 h-3.5 text-amber-500" />
                      <span>Catatan Progres &amp; Evaluasi (Read-Only)</span>
                    </div>

                    {detailTask.progress_notes && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/50 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Yang Sudah Dilakukan</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-neutral-200 whitespace-pre-line leading-relaxed">
                          {detailTask.progress_notes}
                        </p>
                      </div>
                    )}

                    {detailTask.blocker_notes && (
                      <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/50 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Kendala &amp; Hal yang Perlu Dicari Solusinya</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-neutral-200 whitespace-pre-line leading-relaxed">
                          {detailTask.blocker_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {MULTI_MONTH_HORIZONS.includes(detailTask.horizon) &&
                  detailTask.target_months?.length > 0 && (
                    <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                          Target Bulan ({detailTask.target_months.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMonthDetails((prev) => !prev)}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>
                            {showMonthDetails ? 'Sembunyikan detail' : 'Lihat selengkapnya'}
                          </span>
                          {showMonthDetails ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {detailTask.target_months.map((ym) => (
                          <span
                            key={ym}
                            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-indigo-200/80 dark:border-indigo-800/60 text-slate-700 dark:text-neutral-200"
                          >
                            {formatMonthYearID(ym)}
                          </span>
                        ))}
                      </div>

                      {showMonthDetails && (
                        <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50 space-y-1.5">
                          {detailTask.target_months.map((ym) => {
                            const bounds = getMonthDetailBounds(ym, detailTask, tasks);
                            return (
                              <div
                                key={ym}
                                className="flex items-center justify-between text-xs bg-white/80 dark:bg-neutral-900/80 px-3 py-2 rounded-lg border border-indigo-100 dark:border-neutral-800"
                              >
                                <span className="font-semibold text-slate-700 dark:text-neutral-200">
                                  {formatMonthYearID(ym)}
                                </span>
                                <span className="text-slate-500 dark:text-neutral-400">
                                  {formatDateID(bounds.start)} s/d {formatDateID(bounds.end)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {detailChildHorizon && detailChildHorizonMeta && (
                <div className="pt-4 border-t border-slate-200/80 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                        Daftar Tugas {detailChildHorizonMeta.label}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-neutral-500">
                      {detailSubtasks.filter((s) => s.status === 'done').length}/
                      {detailSubtasks.length} selesai
                    </span>
                  </div>

                  <div className="space-y-2">
                    {detailSubtasks.map((sub) => {
                      const subPrio = PRIORITY_META[sub.priority || 'medium'];
                      return (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200/80 dark:border-neutral-800/80"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {sub.status === 'done' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : sub.status === 'in_progress' ? (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 dark:text-neutral-600 shrink-0" />
                            )}

                            <div className="min-w-0">
                              <span
                                className={`text-xs font-medium block truncate ${
                                  sub.status === 'done'
                                    ? 'line-through text-slate-400 dark:text-neutral-500'
                                    : 'text-slate-800 dark:text-neutral-200'
                                }`}
                              >
                                {sub.title}
                              </span>
                              <div className="mt-0.5 text-[10px]">
                                {renderTaskScheduleBadge(sub)}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${subPrio.badgeClass}`}
                          >
                            {subPrio.label}
                          </span>
                        </div>
                      );
                    })}

                    {detailSubtasks.length === 0 && (
                      <div className="py-5 text-center text-xs text-slate-400 dark:text-neutral-500 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                        Belum ada tugas {detailChildHorizonMeta.label.toLowerCase()} di dalam kartu ini.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}