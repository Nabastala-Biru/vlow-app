'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  Plus,
  Trash2,
  Lock,
  Archive,
  Calendar,
  Link2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sun,
  Moon,
  Search,
  Pencil,
  X,
  Layers,
  AlertCircle,
  Share2,
  Copy,
  Check,
  RefreshCw,
  EyeOff,
} from 'lucide-react';
import { COLUMNS, HORIZONS, Horizon, Task, TaskPriority, TaskStatus } from '@/types/task';
import {
  archiveCompletedInHorizon,
  createTask,
  deleteTask,
  lockVault,
  moveTask,
  updateTask,
} from '@/app/actions/tasks';
import {
  ShareConfig,
  disableShareLink,
  generateOrRotateShareLink,
} from '@/app/actions/share';

function getNowTimestamp() {
  return Date.now();
}

function generateTempId() {
  return crypto.randomUUID();
}

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

export default function KanbanBoard({
  initialTasks,
  initialShareConfig,
}: {
  initialTasks: Task[];
  initialShareConfig: ShareConfig;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('daily');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Theme state (Light / Dark)
  const [isDark, setIsDark] = useState(true);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Share Modal state
  const [shareConfig, setShareConfig] = useState<ShareConfig>(initialShareConfig);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formHorizon, setFormHorizon] = useState<Horizon>('daily');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [parentId, setParentId] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Sinkronisasi tema awal dari localStorage
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

  // Keyboard shortcuts: 'n' untuk tugas baru, '/' untuk cari
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';

      if (isTyping || isModalOpen || isShareModalOpen) return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openCreateModal();
      } else if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Share handlers
  const shareUrl =
    typeof window !== 'undefined' && shareConfig.share_token
      ? `${window.location.origin}/share/${shareConfig.share_token}`
      : '';

  async function handleEnableOrRotateShare() {
    setShareLoading(true);
    try {
      const updated = await generateOrRotateShareLink();
      setShareConfig(updated);
    } finally {
      setShareLoading(false);
    }
  }

  async function handleDisableShare() {
    setShareLoading(true);
    try {
      const updated = await disableShareLink();
      setShareConfig(updated);
    } finally {
      setShareLoading(false);
    }
  }

  function handleCopyShareUrl() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Task Modal handlers
  function openCreateModal() {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setFormHorizon(activeHorizon);
    setPriority('medium');
    setParentId('');
    setTargetDate('');
    setIsModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setFormHorizon(task.horizon);
    setPriority(task.priority || 'medium');
    setParentId(task.parent_id || '');
    setTargetDate(task.target_date || '');
    setIsModalOpen(true);
  }

  const activeHorizonMeta = HORIZONS.find((h) => h.id === activeHorizon)!;
  const horizonTasks = tasks.filter((t) => t.horizon === activeHorizon);
  const doneCount = horizonTasks.filter((t) => t.status === 'done').length;
  const progress =
    horizonTasks.length > 0 ? Math.round((doneCount / horizonTasks.length) * 100) : 0;

  // Filter pencarian & prioritas
  const filteredTasks = horizonTasks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || (t.priority || 'medium') === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Kandidat target induk dari horizon yang lebih panjang
  const modalHorizonIndex = HORIZONS.findIndex((h) => h.id === formHorizon);
  const higherHorizonIds = HORIZONS.slice(modalHorizonIndex + 1).map((h) => h.id);
  const parentCandidates = tasks.filter(
    (t) => higherHorizonIds.includes(t.horizon) && t.id !== editingTask?.id
  );

  function handleDrop(targetStatus: Exclude<TaskStatus, 'archived'>) {
    setDragOverCol(null);
    if (!draggedTaskId) return;
    const newPosition = getNowTimestamp();

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTaskId ? { ...t, status: targetStatus, position: newPosition } : t
      )
    );

    const idToMove = draggedTaskId;
    setDraggedTaskId(null);

    startTransition(async () => {
      await moveTask(idToMove, targetStatus, newPosition);
    });
  }

  function handleQuickMove(task: Task, direction: 'prev' | 'next') {
    const order: Exclude<TaskStatus, 'archived'>[] = ['todo', 'in_progress', 'done'];
    const idx = order.indexOf(task.status as Exclude<TaskStatus, 'archived'>);
    const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= order.length) return;

    const targetStatus = order[nextIdx];
    const newPosition = getNowTimestamp();

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: targetStatus, position: newPosition } : t))
    );

    startTransition(async () => {
      await moveTask(task.id, targetStatus, newPosition);
    });
  }

  function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const now = getNowTimestamp();
    const isoNow = new Date(now).toISOString();

    if (editingTask) {
      const updatedFields = {
        title: title.trim(),
        description: description.trim() || null,
        horizon: formHorizon,
        priority,
        parent_id: parentId || null,
        target_date: targetDate || null,
      };

      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id ? { ...t, ...updatedFields, updated_at: isoNow } : t
        )
      );
      setIsModalOpen(false);
      setActiveHorizon(formHorizon);

      startTransition(async () => {
        await updateTask(editingTask.id, updatedFields);
      });
    } else {
      const optimisticTask: Task = {
        id: generateTempId(),
        title: title.trim(),
        description: description.trim() || null,
        horizon: formHorizon,
        priority,
        status: 'todo',
        position: now,
        parent_id: parentId || null,
        target_date: targetDate || null,
        created_at: isoNow,
        updated_at: isoNow,
      };

      setTasks((prev) => [optimisticTask, ...prev]);
      setIsModalOpen(false);
      setActiveHorizon(formHorizon);

      startTransition(async () => {
        await createTask({
          title: optimisticTask.title,
          description: optimisticTask.description || undefined,
          horizon: formHorizon,
          priority,
          parent_id: optimisticTask.parent_id,
          target_date: optimisticTask.target_date,
        });
      });
    }
  }

  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await deleteTask(id);
    });
  }

  function handleArchiveDone() {
    if (doneCount === 0) return;
    setTasks((prev) => prev.filter((t) => !(t.horizon === activeHorizon && t.status === 'done')));
    startTransition(async () => {
      await archiveCompletedInHorizon(activeHorizon);
    });
  }

  const todayStr = getTodayDateString();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-neutral-800/90 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15 border border-emerald-600/20 dark:border-emerald-500/30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-base sm:text-lg leading-none">
                Personal Task Vault
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 hidden sm:block mt-0.5">
                {activeHorizonMeta.desc}
              </p>
            </div>
            {isPending && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
                Menyinkronkan...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Share Vault (Read-Only) */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              title="Bagikan Vault (Read-Only)"
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
                shareConfig.share_enabled
                  ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                  : 'border-slate-200 dark:border-neutral-800 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Tombol Ganti Tema Siang / Malam */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Ganti ke Mode Siang' : 'Ganti ke Mode Malam'}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tugas Baru</span>
              <kbd className="hidden md:inline-block text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded ml-1 font-mono">
                N
              </kbd>
            </button>

            <form action={lockVault}>
              <button
                type="submit"
                title="Kunci Vault"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100/80 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:bg-neutral-800/80 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 dark:hover:border-rose-900 text-slate-600 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
              </button>
            </form>
          </div>
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

      {/* Toolbar: Progress, Search, Priority Filter & Cycle Reset */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-2 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-neutral-900/70 border border-slate-200/90 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
          {/* Progress Bar */}
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

          {/* Search, Filter & Archive Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari tugas... (tekan /)"
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

            {doneCount > 0 && (
              <button
                onClick={handleArchiveDone}
                className="text-xs font-medium text-slate-600 hover:text-emerald-700 dark:text-neutral-300 dark:hover:text-emerald-400 flex items-center gap-1.5 bg-slate-100 hover:bg-emerald-50 dark:bg-neutral-800 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-neutral-700 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Arsipkan {doneCount} Selesai</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Columns */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const columnTasks = filteredTasks.filter((t) => t.status === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <section
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(col.id)}
              className={`rounded-2xl p-4 flex flex-col min-h-[440px] border transition-all ${
                isOver
                  ? 'bg-emerald-50/70 border-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-600/70'
                  : 'bg-slate-100/70 border-slate-200/80 dark:bg-neutral-900/50 dark:border-neutral-800/80'
              }`}
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
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverCol(null);
                      }}
                      className="group bg-white hover:bg-slate-50/90 dark:bg-neutral-900 dark:hover:bg-neutral-800/90 border border-slate-200/90 hover:border-slate-300 dark:border-neutral-800 dark:hover:border-neutral-700 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                    >
                      {/* Top Badges: Priority + Parent Link */}
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

                      {/* Title & Action Icons */}
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          onClick={() => openEditModal(task)}
                          className={`text-sm font-semibold leading-snug cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${
                            task.status === 'done'
                              ? 'line-through text-slate-400 dark:text-neutral-500'
                              : 'text-slate-800 dark:text-neutral-100'
                          }`}
                        >
                          {task.title}
                        </h3>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => openEditModal(task)}
                            className="text-slate-400 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-200 p-1 rounded cursor-pointer"
                            title="Edit tugas"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="text-slate-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 p-1 rounded cursor-pointer"
                            title="Hapus tugas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Sub-tasks Progress Pill */}
                      {childTasks.length > 0 && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 px-2 py-1 rounded-lg w-fit">
                          <Layers className="w-3 h-3" />
                          <span>
                            {completedChildren}/{childTasks.length} sub-tugas selesai
                          </span>
                        </div>
                      )}

                      {/* Footer: Due Date & Quick Move */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
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

                        <div className="flex items-center gap-1">
                          {col.id !== 'todo' && (
                            <button
                              onClick={() => handleQuickMove(task, 'prev')}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                              title="Geser ke kiri"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {col.id !== 'done' ? (
                            <button
                              onClick={() => handleQuickMove(task, 'next')}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                              title="Geser ke kanan"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {columnTasks.length === 0 && (
                  <div className="h-28 border border-dashed border-slate-300/80 dark:border-neutral-800 rounded-xl flex items-center justify-center text-xs text-slate-400 dark:text-neutral-600">
                    {searchQuery || priorityFilter !== 'all'
                      ? 'Tidak ada tugas yang cocok dengan filter'
                      : 'Tarik kartu ke sini'}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </main>

      {/* Modal Tambah / Edit Tugas */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">
                {editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Judul Tugas *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Selesaikan modul autentikasi"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Rentang Waktu
                  </label>
                  <select
                    value={formHorizon}
                    onChange={(e) => {
                      setFormHorizon(e.target.value as Horizon);
                      setParentId('');
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {HORIZONS.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="low">Low (Santai)</option>
                    <option value="medium">Medium (Normal)</option>
                    <option value="high">High (Penting)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Catatan / Detail
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opsional..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {parentCandidates.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Tautkan ke Target Jangka Panjang (Opsional)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Tidak ditautkan --</option>
                    {parentCandidates.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{HORIZONS.find((h) => h.id === p.horizon)?.shortLabel}] {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Target Tanggal (Opsional)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm cursor-pointer"
                >
                  {editingTask ? 'Simpan Perubahan' : 'Simpan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Share Vault (Read-Only) */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-sky-500" />
                <h2 className="text-base font-bold">Bagikan Vault (Read-Only)</h2>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
              Siapa pun yang memiliki link ini hanya dapat <strong>melihat</strong> progres tugasmu
              tanpa bisa mengubah, menggeser, atau menghapus kartu apa pun.
            </p>

            {shareConfig.share_enabled && shareConfig.share_token ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-600 dark:text-neutral-300 select-all"
                  />
                  <button
                    onClick={handleCopyShareUrl}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800">
                  <button
                    onClick={handleEnableOrRotateShare}
                    disabled={shareLoading}
                    className="text-xs text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${shareLoading ? 'animate-spin' : ''}`} />
                    <span>Buat Link Baru (Reset)</span>
                  </button>

                  <button
                    onClick={handleDisableShare}
                    disabled={shareLoading}
                    className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Matikan Akses</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleEnableOrRotateShare}
                disabled={shareLoading}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>
                  {shareLoading ? 'Membuat Link...' : 'Aktifkan & Buat Link Read-Only'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}