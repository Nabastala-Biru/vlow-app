'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { COLUMNS, HORIZONS, Horizon, Task, TaskPriority } from '@/types/task';

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-neutral-800/90 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-600/10 dark:bg-sky-500/15 border border-sky-600/20 dark:border-sky-500/30 flex items-center justify-center">
              <Eye className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold tracking-tight text-base sm:text-lg leading-none">
                  Shared Task Vault
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60">
                  Read-Only
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 hidden sm:block mt-0.5">
                {activeHorizonMeta.desc}
              </p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            title={isDark ? 'Ganti ke Mode Siang' : 'Ganti ke Mode Malam'}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Horizon Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto pb-3 pt-1">
          {HORIZONS.map((h) => {
            const count = tasks.filter((t) => t.horizon === h.id && t.status !== 'done').length;
            const active = activeHorizon === h.id;
            return (
              <button
                key={h.id}
                onClick={() => setActiveHorizon(h.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/70'
                }`}
              >
                <span>{h.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-md font-semibold ${
                    active
                      ? 'bg-slate-700 text-slate-100 dark:bg-neutral-800 dark:text-neutral-100'
                      : 'bg-slate-200 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Toolbar: Progress, Search & Priority Filter */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-neutral-900/70 border border-slate-200/90 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-4 flex-1">
            <div className="text-sm font-medium text-slate-700 dark:text-neutral-300 whitespace-nowrap">
              Progres {activeHorizonMeta.label}:{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{progress}%</span>
              <span className="text-xs text-slate-400 dark:text-neutral-500 ml-1.5">
                ({doneCount}/{horizonTasks.length})
              </span>
            </div>
            <div className="flex-1 max-w-xs h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
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
                className="w-full sm:w-52 pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
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
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Prioritas</option>
              <option value="high">Prioritas: High</option>
              <option value="medium">Prioritas: Medium</option>
              <option value="low">Prioritas: Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Columns (Read-Only) */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const columnTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <section
              key={col.id}
              className="rounded-2xl p-4 flex flex-col min-h-[440px] border bg-slate-100/70 border-slate-200/80 dark:bg-neutral-900/50 dark:border-neutral-800/80"
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

                  const isOverdue =
                    task.target_date && task.target_date < todayStr && task.status !== 'done';
                  const isDueToday =
                    task.target_date && task.target_date === todayStr && task.status !== 'done';

                  return (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-neutral-900 border border-slate-200/90 dark:border-neutral-800 rounded-xl p-3.5 shadow-xs"
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
                        className={`text-sm font-semibold leading-snug ${
                          task.status === 'done'
                            ? 'line-through text-slate-400 dark:text-neutral-500'
                            : 'text-slate-800 dark:text-neutral-100'
                        }`}
                      >
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 whitespace-pre-line leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {childTasks.length > 0 && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 px-2 py-1 rounded-lg w-fit">
                          <Layers className="w-3 h-3" />
                          <span>
                            {completedChildren}/{childTasks.length} sub-tugas selesai
                          </span>
                        </div>
                      )}

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px]">
                        {task.target_date ? (
                          <span
                            className={`inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded ${
                              isOverdue
                                ? 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50'
                                : isDueToday
                                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50'
                                : 'text-slate-500 dark:text-neutral-400'
                            }`}
                          >
                            {isOverdue ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <Calendar className="w-3 h-3" />
                            )}
                            <span>{isDueToday ? 'Hari ini' : task.target_date}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-neutral-500">
                            {activeHorizonMeta.shortLabel}
                          </span>
                        )}
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
  );
}