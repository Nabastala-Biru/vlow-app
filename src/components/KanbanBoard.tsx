'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  Plus,
  Trash2,
  Lock,
  Archive,
  ArchiveRestore,
  RotateCcw,
  Calendar,
  Link2,
  Unlink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Minimize2,
  Maximize2,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  Sun,
  Moon,
  Search,
  Pencil,
  X,
  Layers,
  AlertCircle,
  AlertTriangle,
  Share2,
  Copy,
  Check,
  RefreshCw,
  EyeOff,
  Menu,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Target,
  Flag,
  ArrowRight,
  ArrowLeft,
  Flame,
  Sparkles,
  NotebookPen,
  HelpCircle,
  Bot,
  Coffee,
} from 'lucide-react';
import {
  CHILD_HORIZON_MAP,
  COLUMNS,
  HORIZONS,
  Horizon,
  Task,
  TaskPriority,
  TaskStatus,
  formatDateID,
  formatMonthYearID,
  getMonthDetailBounds,
  getMonthlyEffectiveRange,
} from '@/types/task';
import {
  archiveCompletedInHorizon,
  createTask,
  deleteTask,
  getArchivedTasks,
  linkChildTask,
  lockVault,
  moveTask,
  restoreArchivedTask,
  updateTask,
  updateTaskNotes,
} from '@/app/actions/tasks';
import {
  ShareConfig,
  disableShareLink,
  generateOrRotateShareLink,
} from '@/app/actions/share';
import { AgentMessage } from '@/app/actions/agent';
import {
  CustomDatePicker,
  CustomMonthPicker,
  CustomSelect,
  SelectOption,
} from '@/components/VaultPickers';
import YearlyRecapModal from '@/components/YearlyRecapModal';
import AgentDrawer from '@/components/AgentDrawer';

function getNowTimestamp() {
  return Date.now();
}

function generateTempId() {
  return crypto.randomUUID();
}

function formatLocalYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDateString() {
  return formatLocalYMD(new Date());
}

function getCurrentWeekBoundsYMD(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: formatLocalYMD(monday),
    end: formatLocalYMD(sunday),
  };
}

function getTaskSortKey(task: Task): string {
  if (task.horizon === 'daily' && task.target_date) return task.target_date;
  if (task.horizon === 'weekly' && task.start_date) return task.start_date;
  if (task.target_date) return task.target_date;
  if (task.start_date) return task.start_date;
  if (task.target_months && task.target_months.length > 0) {
    return `${task.target_months[0]}-01`;
  }
  return '9999-12-31';
}

function sortTasksChronologically(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    const keyA = getTaskSortKey(a);
    const keyB = getTaskSortKey(b);
    if (keyA !== keyB) {
      return keyA.localeCompare(keyB);
    }
    return (a.position || 0) - (b.position || 0);
  });
}

function isValidStreakCompletion(task: Task): boolean {
  if (
    task.horizon !== 'daily' ||
    (task.status !== 'done' && task.status !== 'archived') ||
    !task.target_date ||
    !task.updated_at
  ) {
    return false;
  }

  const completedLocalYMD = formatLocalYMD(new Date(task.updated_at));
  return completedLocalYMD === task.target_date;
}

function shiftDateYMD(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return formatLocalYMD(d);
}

function getCurrentMonthString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
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

const PRIORITY_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Semua Prioritas' },
  { value: 'high', label: 'Prioritas: High', dotClass: 'bg-rose-500' },
  { value: 'medium', label: 'Prioritas: Medium', dotClass: 'bg-sky-500' },
  { value: 'low', label: 'Prioritas: Low', dotClass: 'bg-slate-400' },
];

const FORM_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low (Santai)', dotClass: 'bg-slate-400' },
  { value: 'medium', label: 'Medium (Normal)', dotClass: 'bg-sky-500' },
  { value: 'high', label: 'High (Penting)', dotClass: 'bg-rose-500' },
];

const SUBTASK_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low', dotClass: 'bg-slate-400' },
  { value: 'medium', label: 'Med', dotClass: 'bg-sky-500' },
  { value: 'high', label: 'High', dotClass: 'bg-rose-500' },
];

const SHORT_DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const NEXT_STATUS_LABEL: Record<Exclude<TaskStatus, 'archived'>, string | null> = {
  todo: 'In Progress',
  in_progress: 'Done',
  done: null,
};

const PREV_STATUS_LABEL: Record<Exclude<TaskStatus, 'archived'>, string | null> = {
  todo: null,
  in_progress: 'To Do',
  done: 'In Progress',
};

interface SwipeableTaskCardProps {
  task: Task;
  colId: Exclude<TaskStatus, 'archived'>;
  parentTask: Task | null;
  childCount: number;
  completedChildren: number;
  scheduleBadge: React.ReactNode;
  isDragging?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenDetail: () => void;
  onOpenNotes: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMovePrev: () => void;
  onMoveNext: () => void;
}

function SwipeableTaskCard({
  task,
  colId,
  parentTask,
  childCount,
  completedChildren,
  scheduleBadge,
  isDragging = false,
  isCollapsed,
  onToggleCollapse,
  onDragStart,
  onDragEnd,
  onOpenDetail,
  onOpenNotes,
  onEdit,
  onDelete,
  onMovePrev,
  onMoveNext,
}: SwipeableTaskCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isHorizontalLock = useRef<boolean | null>(null);
  const didSwipeRef = useRef(false);

  const SWIPE_THRESHOLD = 68;
  const MAX_OFFSET = 115;

  const canSwipeRight = colId !== 'done';
  const canSwipeLeft = colId !== 'todo';
  const prio = PRIORITY_META[task.priority || 'medium'];

  const hasNotes = Boolean(
    (task.progress_notes && task.progress_notes.trim()) ||
      (task.blocker_notes && task.blocker_notes.trim())
  );

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalLock.current = null;
    didSwipeRef.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    if (isHorizontalLock.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalLock.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (!isHorizontalLock.current) return;

    didSwipeRef.current = true;
    setIsSwiping(true);

    let clamped = deltaX;
    if (deltaX > 0 && !canSwipeRight) {
      clamped = Math.min(deltaX * 0.2, 24);
    } else if (deltaX < 0 && !canSwipeLeft) {
      clamped = Math.max(deltaX * 0.2, -24);
    } else {
      clamped = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, deltaX));
    }

    setOffsetX(clamped);
  }

  function handleTouchEnd() {
    if (isHorizontalLock.current) {
      if (offsetX >= SWIPE_THRESHOLD && canSwipeRight) {
        onMoveNext();
      } else if (offsetX <= -SWIPE_THRESHOLD && canSwipeLeft) {
        onMovePrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isHorizontalLock.current = null;
    setIsSwiping(false);
    setOffsetX(0);
  }

  function handleCardClick() {
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    onOpenDetail();
  }

  const rightTargetLabel = NEXT_STATUS_LABEL[colId];
  const leftTargetLabel = PREV_STATUS_LABEL[colId];
  const isRightReady = offsetX >= SWIPE_THRESHOLD && canSwipeRight;
  const isLeftReady = offsetX <= -SWIPE_THRESHOLD && canSwipeLeft;

  // Tampilan Compact List saat kartu diperkecil
  if (isCollapsed) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={handleCardClick}
        className={`group bg-white hover:bg-slate-50/90 dark:bg-neutral-900 dark:hover:bg-neutral-800/90 border border-slate-200/90 hover:border-emerald-400/60 dark:border-neutral-800 dark:hover:border-emerald-600/50 rounded-xl px-3 py-2.5 shadow-xs transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 animate-card ${
          isDragging ? 'opacity-50 scale-[0.97]' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${prio.dotClass}`}
            title={`Prioritas: ${prio.label}`}
          />
          <span
            className={`text-xs font-semibold truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors ${
              task.status === 'done'
                ? 'line-through text-slate-400 dark:text-neutral-500'
                : 'text-slate-800 dark:text-neutral-100'
            }`}
          >
            {task.title}
          </span>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 shrink-0"
        >
          <div className="hidden sm:block text-[10px]">{scheduleBadge}</div>

          {colId !== 'todo' && (
            <button
              onClick={onMovePrev}
              className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white active:scale-90 transition-all cursor-pointer"
              title="Geser ke kiri"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {colId !== 'done' && (
            <button
              onClick={onMoveNext}
              className="p-1 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white active:scale-90 transition-all cursor-pointer"
              title="Geser ke kanan"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 text-slate-400 hover:text-emerald-600 dark:text-neutral-500 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 active:scale-90 transition-all cursor-pointer"
            title="Perbesar kartu"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden select-none md:select-auto animate-card">
      <div
        className={`md:hidden absolute inset-0 rounded-xl flex items-center justify-between px-4 transition-colors ${
          offsetX > 12 && canSwipeRight
            ? isRightReady
              ? colId === 'in_progress'
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-500 text-white'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            : offsetX < -12 && canSwipeLeft
            ? isLeftReady
              ? 'bg-slate-700 text-white dark:bg-neutral-700'
              : 'bg-slate-500/15 text-slate-700 dark:text-neutral-300'
            : 'bg-transparent pointer-events-none'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 text-xs font-bold transition-opacity ${
            offsetX > 12 && canSwipeRight ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          <span>{rightTargetLabel}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 text-xs font-bold transition-opacity ${
            offsetX < -12 && canSwipeLeft ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span>{leftTargetLabel}</span>
          <ArrowLeft className="w-4 h-4" />
        </div>
      </div>

      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
        style={{
          transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
          transition: isSwiping
            ? 'none'
            : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease, box-shadow 150ms ease',
        }}
        className={`relative group bg-white hover:bg-slate-50/90 dark:bg-neutral-900 dark:hover:bg-neutral-800/90 border border-slate-200/90 hover:border-emerald-400/60 dark:border-neutral-800 dark:hover:border-emerald-600/50 rounded-xl p-3.5 shadow-xs hover:shadow-md cursor-pointer ${
          isDragging ? 'opacity-50 scale-[0.97] rotate-1 shadow-xl' : ''
        }`}
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

        <div className="flex items-start justify-between gap-2">
          <h3
            className={`text-sm font-semibold leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors ${
              task.status === 'done'
                ? 'line-through text-slate-400 dark:text-neutral-500'
                : 'text-slate-800 dark:text-neutral-100'
            }`}
          >
            {task.title}
          </h3>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
          >
            <button
              onClick={onToggleCollapse}
              className="text-slate-400 hover:text-emerald-600 dark:text-neutral-500 dark:hover:text-emerald-400 p-1 rounded cursor-pointer active:scale-90 transition-transform"
              title="Perkecil jadi list"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onEdit}
              className="text-slate-400 hover:text-slate-700 dark:text-neutral-500 dark:hover:text-neutral-200 p-1 rounded cursor-pointer active:scale-90 transition-transform"
              title="Edit tugas"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="text-slate-400 hover:text-rose-600 dark:text-neutral-500 dark:hover:text-rose-400 p-1 rounded cursor-pointer active:scale-90 transition-transform"
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

        {childCount > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 px-2 py-1 rounded-lg w-fit">
            <Layers className="w-3 h-3" />
            <span>
              {completedChildren}/{childCount} sub-tugas selesai
            </span>
          </div>
        )}

        <div onClick={(e) => e.stopPropagation()} className="mt-3">
          <button
            type="button"
            onClick={onOpenNotes}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all duration-150 active:scale-[0.97] cursor-pointer ${
              hasNotes
                ? 'bg-amber-50/90 hover:bg-amber-100/90 text-amber-800 border-amber-300/80 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700/60'
                : 'bg-slate-50 hover:bg-emerald-50/80 text-slate-600 hover:text-emerald-700 border-slate-200/90 hover:border-emerald-300 dark:bg-neutral-950/80 dark:hover:bg-emerald-950/35 dark:text-neutral-300 dark:hover:text-emerald-300 dark:border-neutral-800 dark:hover:border-emerald-700/60'
            }`}
          >
            <NotebookPen
              className={`w-3.5 h-3.5 shrink-0 ${
                hasNotes ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-500'
              }`}
            />
            <span>{hasNotes ? 'Lihat / Edit Catatan' : '+ Tambah Catatan'}</span>
          </button>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] gap-2"
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">{scheduleBadge}</div>

          <div className="flex items-center gap-1 shrink-0">
            {colId !== 'todo' && (
              <button
                onClick={onMovePrev}
                className="p-1.5 md:p-1 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white active:scale-90 transition-all cursor-pointer"
                title="Geser ke kiri"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {colId !== 'done' ? (
              <button
                onClick={onMoveNext}
                className="p-1.5 md:p-1 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white active:scale-90 transition-all cursor-pointer"
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
    </div>
  );
}

interface DeleteConfirmTarget {
  id: string;
  title: string;
  childCount: number;
  isArchived?: boolean;
}

export default function KanbanBoard({
  initialTasks,
  initialAllTasks,
  initialShareConfig,
  initialAgentMessages = [],
  initialIsFreeDay = false,
}: {
  initialTasks: Task[];
  initialAllTasks?: Task[];
  initialShareConfig: ShareConfig;
  initialAgentMessages?: AgentMessage[];
  initialIsFreeDay?: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('daily');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter khusus To Do Minggu Ini & Collapse Card state
  const [todoThisWeekOnly, setTodoThisWeekOnly] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  // Agent Drawer & Free Day Status state
  const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState(false);
  const [isFreeDay, setIsFreeDay] = useState(initialIsFreeDay);
  const unreadAgentCount = initialAgentMessages.filter((m) => !m.is_read).length;

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [shareConfig, setShareConfig] = useState<ShareConfig>(initialShareConfig);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState<DeleteConfirmTarget | null>(null);

  // Dedicated Task Notes Modal state
  const [notesTaskId, setNotesTaskId] = useState<string | null>(null);
  const [progressNotesInput, setProgressNotesInput] = useState('');
  const [blockerNotesInput, setBlockerNotesInput] = useState('');

  // Archive & Analytics state
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>(() =>
    initialAllTasks ? initialAllTasks.filter((t) => t.status === 'archived') : []
  );
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveHorizonFilter, setArchiveHorizonFilter] = useState<'all' | Horizon>('all');

  // Yearly Recap Modal state
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);

  // Detail Modal & Subtask state
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [showMonthDetails, setShowMonthDetails] = useState(false);
  const [subtaskMode, setSubtaskMode] = useState<'pick' | 'create'>('pick');
  const [selectedExistingChildId, setSelectedExistingChildId] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState<TaskPriority>('medium');
  const [newSubtaskStartDate, setNewSubtaskStartDate] = useState('');
  const [newSubtaskTargetDate, setNewSubtaskTargetDate] = useState('');
  const [newSubtaskMonths, setNewSubtaskMonths] = useState<string[]>([]);
  const [subtaskMonthPicker, setSubtaskMonthPicker] = useState(getCurrentMonthString());
  const [subtaskError, setSubtaskError] = useState('');

  // Create / Edit Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formHorizon, setFormHorizon] = useState<Horizon>('daily');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [parentId, setParentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetMonths, setTargetMonths] = useState<string[]>([]);
  const [monthPicker, setMonthPicker] = useState(getCurrentMonthString());
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setIsFreeDay(initialIsFreeDay);
  }, [initialIsFreeDay]);

  useEffect(() => {
    if (!initialAllTasks) {
      getArchivedTasks()
        .then((data) => setArchivedTasks(data))
        .catch(() => {});
    }
  }, [initialAllTasks]);

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

  function toggleCollapseTask(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleCollapseColumn(columnTaskIds: string[]) {
    if (columnTaskIds.length === 0) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      const allCollapsed = columnTaskIds.every((id) => next.has(id));
      if (allCollapsed) {
        columnTaskIds.forEach((id) => next.delete(id));
      } else {
        columnTaskIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';

      if (e.key === 'Escape') {
        if (deleteTarget) {
          setDeleteTarget(null);
          return;
        }
        if (notesTaskId) {
          setNotesTaskId(null);
          return;
        }
        setDetailTaskId(null);
        setIsFormModalOpen(false);
        setIsShareModalOpen(false);
        setIsArchiveModalOpen(false);
        setIsRecapModalOpen(false);
        setIsAgentDrawerOpen(false);
        setMobileMenuOpen(false);
        return;
      }

      if (
        isTyping ||
        deleteTarget ||
        notesTaskId ||
        isFormModalOpen ||
        isShareModalOpen ||
        isArchiveModalOpen ||
        isRecapModalOpen ||
        isAgentDrawerOpen ||
        detailTaskId
      ) {
        return;
      }

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

  // Gabungan semua tugas (aktif + arsip) untuk Streak, Progressive Unlock & Rekap Tahunan
  const allCombinedTasks = useMemo(() => {
    const map = new Map<string, Task>();
    archivedTasks.forEach((t) => map.set(t.id, t));
    tasks.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [tasks, archivedTasks]);

  // Progressive Unlock Horizon: 3 Bulan butuh >= 3 tugas Bulanan Done; 1 Tahun butuh 3 Bulan terisi
  const monthlyDoneTotal = useMemo(
    () => allCombinedTasks.filter((t) => t.horizon === 'monthly' && t.status === 'done').length,
    [allCombinedTasks]
  );
  const isQuarterlyUnlocked = monthlyDoneTotal >= 3;
  const hasQuarterlyTasks = useMemo(
    () => allCombinedTasks.some((t) => t.horizon === 'quarterly'),
    [allCombinedTasks]
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

  // Perhitungan Daily Streak
  const streakStats = useMemo(() => {
    const today = getTodayDateString();
    const yesterday = shiftDateYMD(today, -1);

    const completedDailyDatesSet = new Set<string>();
    allCombinedTasks.forEach((t) => {
      if (isValidStreakCompletion(t) && t.target_date! <= today) {
        completedDailyDatesSet.add(t.target_date!);
      }
    });

    const todayDone = completedDailyDatesSet.has(today);

    let currentStreak = 0;
    let cursor = todayDone ? today : completedDailyDatesSet.has(yesterday) ? yesterday : null;
    while (cursor && completedDailyDatesSet.has(cursor)) {
      currentStreak += 1;
      cursor = shiftDateYMD(cursor, -1);
    }

    const sortedDates = Array.from(completedDailyDatesSet).sort();
    let bestStreak = 0;
    let tempStreak = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const expectedPrev = shiftDateYMD(sortedDates[i], -1);
        tempStreak = sortedDates[i - 1] === expectedPrev ? tempStreak + 1 : 1;
      }
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    }

    const last7Days = Array.from({ length: 7 }, (_, idx) => {
      const dateStr = shiftDateYMD(today, idx - 6);
      const dObj = new Date(`${dateStr}T00:00:00`);
      return {
        dateStr,
        dayShort: SHORT_DAY_NAMES_ID[dObj.getDay()],
        dayNum: dObj.getDate(),
        isCompleted: completedDailyDatesSet.has(dateStr),
        isToday: dateStr === today,
      };
    });

    return {
      currentStreak,
      bestStreak,
      todayDone,
      last7Days,
    };
  }, [allCombinedTasks]);

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

  function openNotesModal(task: Task) {
    setNotesTaskId(task.id);
    setProgressNotesInput(task.progress_notes || '');
    setBlockerNotesInput(task.blocker_notes || '');
  }

  function handleSaveNotes(e: React.FormEvent) {
    e.preventDefault();
    if (!notesTaskId) return;

    const cleanProgress = progressNotesInput.trim() || null;
    const cleanBlocker = blockerNotesInput.trim() || null;
    const isoNow = new Date().toISOString();
    const targetId = notesTaskId;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === targetId
          ? {
              ...t,
              progress_notes: cleanProgress,
              blocker_notes: cleanBlocker,
              updated_at: isoNow,
            }
          : t
      )
    );
    setNotesTaskId(null);

    startTransition(async () => {
      await updateTaskNotes(targetId, {
        progress_notes: cleanProgress,
        blocker_notes: cleanBlocker,
      });
    });
  }

  async function openArchiveModal() {
    setMobileMenuOpen(false);
    setArchiveSearch('');
    setArchiveHorizonFilter('all');
    setIsArchiveModalOpen(true);
    setArchiveLoading(true);
    try {
      const data = await getArchivedTasks();
      setArchivedTasks(data);
    } finally {
      setArchiveLoading(false);
    }
  }

  function handleRestoreTask(
    task: Task,
    targetStatus: Exclude<TaskStatus, 'archived'> = 'done'
  ) {
    const newPosition = getNowTimestamp();
    const isoNow = new Date(newPosition).toISOString();

    setArchivedTasks((prev) => prev.filter((t) => t.id !== task.id));
    setTasks((prev) => [
      ...prev,
      { ...task, status: targetStatus, position: newPosition, updated_at: isoNow },
    ]);

    startTransition(async () => {
      await restoreArchivedTask(task.id, targetStatus);
    });
  }

  function requestDeleteConfirmation(task: Task, isArchived = false) {
    const childCount = isArchived
      ? 0
      : tasks.filter((c) => c.parent_id === task.id).length;

    setDeleteTarget({
      id: task.id,
      title: task.title,
      childCount,
      isArchived,
    });
  }

  function confirmDeleteTask() {
    if (!deleteTarget) return;
    const { id } = deleteTarget;

    if (detailTaskId === id) setDetailTaskId(null);
    if (notesTaskId === id) setNotesTaskId(null);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setArchivedTasks((prev) => prev.filter((t) => t.id !== id));
    setDeleteTarget(null);

    startTransition(async () => {
      await deleteTask(id);
    });
  }

  function openCreateModal() {
    const today = getTodayDateString();
    const currentMonth = getCurrentMonthString();
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setFormHorizon(activeHorizon);
    setPriority('medium');
    setParentId('');
    setStartDate(activeHorizon === 'weekly' ? today : '');
    setTargetDate(activeHorizon === 'daily' || activeHorizon === 'weekly' ? today : '');
    setTargetMonths(MULTI_MONTH_HORIZONS.includes(activeHorizon) ? [currentMonth] : []);
    setMonthPicker(currentMonth);
    setFormError('');
    setIsFormModalOpen(true);
  }

  function openEditModal(task: Task) {
    setDetailTaskId(null);
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setFormHorizon(task.horizon);
    setPriority(task.priority || 'medium');
    setParentId(task.parent_id || '');
    setStartDate(task.start_date || '');
    setTargetDate(task.target_date || '');
    setTargetMonths(task.target_months || []);
    setMonthPicker(getCurrentMonthString());
    setFormError('');
    setIsFormModalOpen(true);
  }

  function openDetailModal(task: Task) {
    const today = getTodayDateString();
    const currentMonth = getCurrentMonthString();
    const childHorizon = CHILD_HORIZON_MAP[task.horizon];

    setShowMonthDetails(false);
    setSubtaskMode('pick');
    setSelectedExistingChildId('');
    setNewSubtaskTitle('');
    setNewSubtaskPriority('medium');
    setNewSubtaskStartDate(childHorizon === 'weekly' ? today : '');
    setNewSubtaskTargetDate(childHorizon === 'daily' || childHorizon === 'weekly' ? today : '');
    setNewSubtaskMonths(
      childHorizon && MULTI_MONTH_HORIZONS.includes(childHorizon) ? [currentMonth] : []
    );
    setSubtaskMonthPicker(currentMonth);
    setSubtaskError('');
    setDetailTaskId(task.id);
  }

  function handleAddMonthToForm() {
    if (!monthPicker) return;
    if (!targetMonths.includes(monthPicker)) {
      setTargetMonths((prev) => [...prev, monthPicker].sort());
    }
  }

  function handleRemoveMonthFromForm(ym: string) {
    setTargetMonths((prev) => prev.filter((m) => m !== ym));
  }

  function handleAddMonthToSubtask() {
    if (!subtaskMonthPicker) return;
    if (!newSubtaskMonths.includes(subtaskMonthPicker)) {
      setNewSubtaskMonths((prev) => [...prev, subtaskMonthPicker].sort());
    }
  }

  function handleRemoveMonthFromSubtask(ym: string) {
    setNewSubtaskMonths((prev) => prev.filter((m) => m !== ym));
  }

  const activeHorizonMeta = HORIZONS.find((h) => h.id === activeHorizon)!;
  const horizonTasks = tasks.filter((t) => t.horizon === activeHorizon);
  const doneCount = horizonTasks.filter((t) => t.status === 'done').length;
  const progress =
    horizonTasks.length > 0 ? Math.round((doneCount / horizonTasks.length) * 100) : 0;

  const weekBounds = useMemo(() => getCurrentWeekBoundsYMD(), []);

  const filteredTasks = horizonTasks.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || (t.priority || 'medium') === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const filteredArchivedTasks = archivedTasks.filter((t) => {
    const matchesHorizon =
      archiveHorizonFilter === 'all' || t.horizon === archiveHorizonFilter;
    const matchesSearch =
      !archiveSearch.trim() ||
      t.title.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(archiveSearch.toLowerCase()));
    return matchesHorizon && matchesSearch;
  });

  const modalHorizonIndex = HORIZONS.findIndex((h) => h.id === formHorizon);
  const higherHorizonIds = HORIZONS.slice(modalHorizonIndex + 1).map((h) => h.id);
  const parentCandidates = tasks.filter(
    (t) => higherHorizonIds.includes(t.horizon) && t.id !== editingTask?.id
  );

  function handleDrop(targetStatus: Exclude<TaskStatus, 'archived'>) {
    setDragOverCol(null);
    if (!draggedTaskId) return;
    const newPosition = getNowTimestamp();
    const isoNow = new Date(newPosition).toISOString();

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTaskId
          ? { ...t, status: targetStatus, position: newPosition, updated_at: isoNow }
          : t
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
    const isoNow = new Date(newPosition).toISOString();

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: targetStatus, position: newPosition, updated_at: isoNow }
          : t
      )
    );

    startTransition(async () => {
      await moveTask(task.id, targetStatus, newPosition);
    });
  }

  function handleCycleSubtaskStatus(subtask: Task) {
    const order: Exclude<TaskStatus, 'archived'>[] = ['todo', 'in_progress', 'done'];
    const idx = order.indexOf(subtask.status as Exclude<TaskStatus, 'archived'>);
    const nextStatus = order[(idx + 1) % order.length];
    const newPosition = getNowTimestamp();
    const isoNow = new Date(newPosition).toISOString();

    setTasks((prev) =>
      prev.map((t) =>
        t.id === subtask.id
          ? { ...t, status: nextStatus, position: newPosition, updated_at: isoNow }
          : t
      )
    );

    startTransition(async () => {
      await moveTask(subtask.id, nextStatus, newPosition);
    });
  }

  function handleAttachExistingChild(e: React.FormEvent, parentTask: Task) {
    e.preventDefault();
    setSubtaskError('');
    if (!selectedExistingChildId) return;

    const isoNow = new Date().toISOString();
    const targetChildId = selectedExistingChildId;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === targetChildId ? { ...t, parent_id: parentTask.id, updated_at: isoNow } : t
      )
    );
    setSelectedExistingChildId('');

    startTransition(async () => {
      await linkChildTask(targetChildId, parentTask.id);
    });
  }

  function handleDetachChild(childTaskId: string) {
    const isoNow = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === childTaskId ? { ...t, parent_id: null, updated_at: isoNow } : t
      )
    );

    startTransition(async () => {
      await linkChildTask(childTaskId, null);
    });
  }

  function handleAddSubtask(e: React.FormEvent, parentTask: Task, childHorizon: Horizon) {
    e.preventDefault();
    setSubtaskError('');

    if (!newSubtaskTitle.trim()) return;

    if (childHorizon === 'daily' && !newSubtaskTargetDate) {
      setSubtaskError('Tanggal tugas harian wajib diisi.');
      return;
    }

    if (childHorizon === 'weekly') {
      if (!newSubtaskStartDate || !newSubtaskTargetDate) {
        setSubtaskError('Tanggal mulai dan tanggal akhir mingguan wajib diisi.');
        return;
      }
      if (newSubtaskTargetDate < newSubtaskStartDate) {
        setSubtaskError('Tanggal akhir tidak boleh lebih awal dari tanggal mulai.');
        return;
      }
    }

    if (MULTI_MONTH_HORIZONS.includes(childHorizon) && newSubtaskMonths.length === 0) {
      setSubtaskError('Pilih minimal satu bulan.');
      return;
    }

    const now = getNowTimestamp();
    const isoNow = new Date(now).toISOString();
    const tempId = generateTempId();

    const cleanStart = childHorizon === 'weekly' ? newSubtaskStartDate : null;
    const cleanTarget =
      childHorizon === 'daily' || childHorizon === 'weekly' ? newSubtaskTargetDate : null;
    const cleanMonths = MULTI_MONTH_HORIZONS.includes(childHorizon) ? newSubtaskMonths : [];

    const optimisticSubtask: Task = {
      id: tempId,
      title: newSubtaskTitle.trim(),
      description: null,
      horizon: childHorizon,
      priority: newSubtaskPriority,
      status: 'todo',
      position: now,
      parent_id: parentTask.id,
      start_date: cleanStart,
      target_date: cleanTarget,
      target_months: cleanMonths,
      progress_notes: null,
      blocker_notes: null,
      created_at: isoNow,
      updated_at: isoNow,
    };

    // Tambahkan task baru di bagian bawah (akhir array)
    setTasks((prev) => [...prev, optimisticSubtask]);
    if (childHorizon === 'daily') {
      setIsFreeDay(false);
    }
    setNewSubtaskTitle('');
    setNewSubtaskPriority('medium');

    startTransition(async () => {
      const created = await createTask({
        title: optimisticSubtask.title,
        horizon: childHorizon,
        priority: optimisticSubtask.priority,
        parent_id: parentTask.id,
        start_date: cleanStart,
        target_date: cleanTarget,
        target_months: cleanMonths,
      });

      setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
    });
  }

  function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) return;

    if (formHorizon === 'daily' && !targetDate) {
      setFormError('Tanggal untuk tugas harian wajib diisi.');
      return;
    }

    if (formHorizon === 'weekly') {
      if (!startDate || !targetDate) {
        setFormError('Tanggal awal dan tanggal akhir untuk tugas mingguan wajib diisi.');
        return;
      }
      if (targetDate < startDate) {
        setFormError('Tanggal akhir tidak boleh lebih awal dari tanggal awal.');
        return;
      }
    }

    if (MULTI_MONTH_HORIZONS.includes(formHorizon) && targetMonths.length === 0) {
      setFormError('Tambahkan minimal 1 bulan target.');
      return;
    }

    const now = getNowTimestamp();
    const isoNow = new Date(now).toISOString();

    const cleanStartDate = formHorizon === 'weekly' ? startDate : null;
    const cleanTargetDate =
      formHorizon === 'daily' || formHorizon === 'weekly' ? targetDate : null;
    const cleanTargetMonths = MULTI_MONTH_HORIZONS.includes(formHorizon) ? targetMonths : [];

    if (editingTask) {
      const updatedFields = {
        title: title.trim(),
        description: description.trim() || null,
        horizon: formHorizon,
        priority,
        parent_id: parentId || null,
        start_date: cleanStartDate,
        target_date: cleanTargetDate,
        target_months: cleanTargetMonths,
      };

      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id ? { ...t, ...updatedFields, updated_at: isoNow } : t
        )
      );
      setIsFormModalOpen(false);
      setActiveHorizon(formHorizon);

      startTransition(async () => {
        await updateTask(editingTask.id, updatedFields);
      });
    } else {
      const tempId = generateTempId();
      const optimisticTask: Task = {
        id: tempId,
        title: title.trim(),
        description: description.trim() || null,
        horizon: formHorizon,
        priority,
        status: 'todo',
        position: now,
        parent_id: parentId || null,
        start_date: cleanStartDate,
        target_date: cleanTargetDate,
        target_months: cleanTargetMonths,
        progress_notes: null,
        blocker_notes: null,
        created_at: isoNow,
        updated_at: isoNow,
      };

      // Tambahkan task baru di bagian bawah (akhir array)
      setTasks((prev) => [...prev, optimisticTask]);
      if (formHorizon === 'daily') {
        setIsFreeDay(false);
      }
      setIsFormModalOpen(false);
      setActiveHorizon(formHorizon);

      startTransition(async () => {
        const created = await createTask({
          title: optimisticTask.title,
          description: optimisticTask.description || undefined,
          horizon: formHorizon,
          priority,
          parent_id: optimisticTask.parent_id,
          start_date: cleanStartDate,
          target_date: cleanTargetDate,
          target_months: cleanTargetMonths,
        });

        setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
        setDetailTaskId((prevId) => (prevId === tempId ? created.id : prevId));
        setNotesTaskId((prevId) => (prevId === tempId ? created.id : prevId));
      });
    }
  }

  function handleArchiveDone() {
    if (doneCount === 0) return;
    const isoNow = new Date().toISOString();
    const toArchive = tasks
      .filter((t) => t.horizon === activeHorizon && t.status === 'done')
      .map((t) => ({ ...t, status: 'archived' as const, updated_at: isoNow }));

    setTasks((prev) => prev.filter((t) => !(t.horizon === activeHorizon && t.status === 'done')));
    setArchivedTasks((prev) => [...toArchive, ...prev]);

    startTransition(async () => {
      await archiveCompletedInHorizon(activeHorizon);
    });
  }

  const todayStr = getTodayDateString();
  const isWeekendDay = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }, []);

  const showFreeDayBadge = isWeekendDay || isFreeDay;

  const notesTask = notesTaskId ? tasks.find((t) => t.id === notesTaskId) || null : null;
  const detailTask = detailTaskId ? tasks.find((t) => t.id === detailTaskId) || null : null;
  const detailChildHorizon = detailTask ? CHILD_HORIZON_MAP[detailTask.horizon] : null;
  const detailChildHorizonMeta = detailChildHorizon
    ? HORIZONS.find((h) => h.id === detailChildHorizon) || null
    : null;
  const detailSubtasks = detailTask ? tasks.filter((t) => t.parent_id === detailTask.id) : [];

  const availableChildCandidates =
    detailTask && detailChildHorizon
      ? tasks.filter(
          (t) => t.horizon === detailChildHorizon && t.parent_id !== detailTask.id
        )
      : [];

  const detailMonthlyRange =
    detailTask && detailTask.horizon === 'monthly'
      ? getMonthlyEffectiveRange(detailTask, tasks)
      : null;

  const editingMonthlyPreview =
    editingTask && formHorizon === 'monthly'
      ? getMonthlyEffectiveRange(editingTask, tasks)
      : null;

  function formatOptionSchedule(task: Task): string {
    if (task.horizon === 'daily' && task.target_date) {
      return formatDateID(task.target_date);
    }
    if (task.horizon === 'weekly' && task.start_date && task.target_date) {
      return `${formatDateID(task.start_date)} s/d ${formatDateID(task.target_date)}`;
    }
    if (task.horizon === 'monthly') {
      const range = getMonthlyEffectiveRange(task, tasks);
      if (range) {
        return `${formatDateID(range.start)} s/d ${formatDateID(range.end)}`;
      }
    }
    if (MULTI_MONTH_HORIZONS.includes(task.horizon) && task.target_months?.length > 0) {
      return task.target_months.map(formatMonthYearID).join(', ');
    }
    return '';
  }

  const archiveHorizonOptions: SelectOption[] = [
    { value: 'all', label: 'Semua Horizon' },
    ...HORIZONS.map((h) => ({ value: h.id, label: h.label })),
  ];

  const formHorizonOptions: SelectOption[] = visibleHorizons.map((h) => ({
    value: h.id,
    label: h.label,
  }));

  const parentCandidateOptions: SelectOption[] = [
    { value: '', label: 'Tidak ditautkan' },
    ...parentCandidates.map((p) => ({
      value: p.id,
      label: `[${HORIZONS.find((h) => h.id === p.horizon)?.shortLabel}] ${p.title}`,
      sublabel: formatOptionSchedule(p) || undefined,
    })),
  ];

  const childCandidateOptions: SelectOption[] = detailChildHorizonMeta
    ? [
        {
          value: '',
          label:
            availableChildCandidates.length > 0
              ? `Pilih tugas ${detailChildHorizonMeta.label.toLowerCase()} (${availableChildCandidates.length})`
              : `Tidak ada tugas ${detailChildHorizonMeta.label.toLowerCase()} tersedia`,
          disabled: availableChildCandidates.length === 0,
        },
        ...availableChildCandidates.map((cand) => {
          const existingParent = cand.parent_id
            ? tasks.find((p) => p.id === cand.parent_id)
            : null;
          const schedule = formatOptionSchedule(cand);
          const subParts = [
            schedule,
            existingParent ? `Saat ini di: ${existingParent.title}` : '',
          ].filter(Boolean);

          return {
            value: cand.id,
            label: cand.title,
            sublabel: subParts.length > 0 ? subParts.join(' • ') : undefined,
            dotClass: PRIORITY_META[cand.priority || 'medium'].dotClass,
          };
        }),
      ]
    : [];

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
        {HORIZONS.find((h) => h.id === task.horizon)?.shortLabel || activeHorizonMeta.shortLabel}
      </span>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/15 border border-emerald-600/25 dark:border-emerald-500/30 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-sm block leading-none">
              Vlow Vault
            </span>
            <span className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1 block">
              Multi-Horizon Tracker
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 active:scale-90 transition-all cursor-pointer"
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
              className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
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
                    ? 'bg-emerald-700/80 text-white'
                    : 'bg-slate-200/80 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {activeCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-200/80 dark:border-neutral-800/80 space-y-1.5 shrink-0">
        <button
          onClick={() => {
            setMobileMenuOpen(false);
            setIsRecapModalOpen(true);
          }}
          className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-200/70 dark:border-emerald-800/50 flex items-center justify-between transition-all duration-150 active:scale-[0.97] cursor-pointer"
        >
          <span className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Rekap Tahunan</span>
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600/15 dark:bg-emerald-500/20">
            {new Date().getFullYear()}
          </span>
        </button>

        <button
          onClick={openArchiveModal}
          className="w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800/70 flex items-center justify-between transition-all duration-150 active:scale-[0.97] cursor-pointer"
        >
          <span className="flex items-center gap-2.5">
            <ArchiveRestore className="w-4 h-4 text-amber-500" />
            <span>Arsip Tugas</span>
          </span>
          {archivedTasks.length > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400 font-semibold">
              {archivedTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setMobileMenuOpen(false);
            setIsShareModalOpen(true);
          }}
          className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all duration-150 active:scale-[0.97] cursor-pointer ${
            shareConfig.share_enabled
              ? 'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60'
              : 'text-slate-600 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800/70'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Share2 className="w-4 h-4" />
            <span>Share Vault</span>
          </span>
          {shareConfig.share_enabled && (
            <span className="w-2 h-2 rounded-full bg-sky-500" />
          )}
        </button>

        <button
          onClick={toggleTheme}
          className="w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-800/70 flex items-center gap-2.5 transition-all duration-150 active:scale-[0.97] cursor-pointer"
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

        <form action={lockVault}>
          <button
            type="submit"
            className="w-full px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-all duration-150 active:scale-[0.97] cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Kunci Vault</span>
          </button>
        </form>
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
            className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-backdrop"
          />
          <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 h-full z-10 animate-modal">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200/80 dark:border-neutral-800/90 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Kiri Header */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-300 active:scale-95 transition-all cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="font-bold tracking-tight text-base sm:text-lg truncate">
                  {activeHorizonMeta.label}
                </h1>
                {isPending && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
                    Menyinkronkan...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 truncate hidden sm:block">
                {activeHorizonMeta.desc}
              </p>
            </div>
          </div>

          {/* Tengah Header: Indikator Hari Libur */}
          {showFreeDayBadge && (
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-sky-50/90 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 text-xs font-medium shadow-xs animate-card">
              <Coffee className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>
                {isWeekendDay
                  ? 'Akhir pekan — Hari libur'
                  : 'Hari ini libur — tidak ada jadwal kerja'}
              </span>
            </div>
          )}

          {/* Kanan Header */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              title={
                streakStats.todayDone
                  ? `Streak aktif! ${streakStats.currentStreak} hari berturut-turut (Rekor: ${streakStats.bestStreak} hari)`
                  : streakStats.currentStreak > 0
                  ? `Streak ${streakStats.currentStreak} hari menunggu! Selesaikan 1 tugas harian hari ini agar tidak putus.`
                  : 'Selesaikan 1 tugas harian hari ini untuk memulai Streak!'
              }
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all select-none ${
                streakStats.todayDone
                  ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-orange-600 dark:text-amber-300 border-amber-400/50 dark:border-amber-500/40 shadow-xs'
                  : 'bg-slate-100/80 dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 border-slate-200 dark:border-neutral-800'
              }`}
            >
              <Flame
                className={`w-4 h-4 shrink-0 ${
                  streakStats.todayDone
                    ? 'text-orange-500 fill-orange-500/80 animate-pulse'
                    : 'text-slate-400 dark:text-neutral-600'
                }`}
              />
              <span>{streakStats.currentStreak}</span>
              <span className="hidden md:inline font-medium">Hari</span>
            </div>

            <button
              onClick={() => setIsAgentDrawerOpen(true)}
              className="relative px-3 py-2 bg-white hover:bg-emerald-50 dark:bg-neutral-900 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-neutral-800 text-xs sm:text-sm font-medium rounded-xl flex items-center gap-1.5 transition-all duration-150 active:scale-[0.96] cursor-pointer"
              title="Vlow Assistant"
            >
              <Bot className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Asisten</span>
              {unreadAgentCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setIsRecapModalOpen(true)}
              className="hidden sm:flex px-3 py-2 bg-white hover:bg-emerald-50 dark:bg-neutral-900 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-neutral-800 text-xs sm:text-sm font-medium rounded-xl items-center gap-1.5 transition-all duration-150 active:scale-[0.96] cursor-pointer"
              title="Lihat Rekap Tahunan"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Rekap</span>
            </button>

            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all duration-150 active:scale-[0.96] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tugas Baru</span>
              <kbd className="hidden md:inline-block text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded ml-1 font-mono">
                N
              </kbd>
            </button>
          </div>
        </header>

        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-2 space-y-3">
          {/* Banner Hari Libur versi Mobile */}
          {showFreeDayBadge && (
            <div className="md:hidden flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-sky-50/90 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 text-xs font-medium animate-card">
              <Coffee className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>
                {isWeekendDay
                  ? 'Akhir pekan — Hari libur'
                  : 'Hari ini libur — tidak ada jadwal kerja'}
              </span>
            </div>
          )}

          {/* Strip Streak 7 Hari Terakhir */}
          <div className="bg-white dark:bg-neutral-900/70 border border-slate-200/90 dark:border-neutral-800 rounded-2xl px-4 py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  streakStats.todayDone
                    ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500'
                }`}
              >
                <Flame
                  className={`w-4 h-4 ${
                    streakStats.todayDone ? 'fill-orange-500/80' : ''
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-neutral-100">
                    {streakStats.currentStreak > 0
                      ? `${streakStats.currentStreak} Hari Streak Beruntun`
                      : 'Belum Ada Streak Aktif'}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400">
                    Rekor: {streakStats.bestStreak} Hari
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 truncate mt-0.5">
                  {streakStats.todayDone
                    ? 'Mantap! Tugas harian hari ini sudah tuntas tepat waktu, streak hari ini menyala.'
                    : 'Selesaikan minimal 1 tugas harian bertanggal hari ini untuk menyalakan streak.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-center">
              {streakStats.last7Days.map((day) => (
                <div
                  key={day.dateStr}
                  title={`${formatDateID(day.dateStr)}${
                    day.isCompleted ? ' • Streak Aktif' : ' • Tidak ada streak'
                  }`}
                  className={`w-8 h-10 rounded-xl flex flex-col items-center justify-center text-[10px] border transition-all ${
                    day.isCompleted
                      ? 'bg-gradient-to-b from-amber-500 to-orange-500 text-white border-orange-500 font-bold shadow-xs shadow-orange-500/20'
                      : day.isToday
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-400/60 border-dashed font-semibold'
                      : 'bg-slate-50 dark:bg-neutral-950 text-slate-400 dark:text-neutral-500 border-slate-200/80 dark:border-neutral-800'
                  }`}
                >
                  <span className="leading-none">{day.dayShort}</span>
                  <span className="text-[11px] mt-1 leading-none">{day.dayNum}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Progres & Filter */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-neutral-900/70 border border-slate-200/90 dark:border-neutral-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-sm font-medium text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                Progres:{' '}
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

              <CustomSelect
                size="sm"
                align="right"
                value={priorityFilter}
                onChange={(val) => setPriorityFilter(val as 'all' | TaskPriority)}
                options={PRIORITY_FILTER_OPTIONS}
                className="min-w-[155px]"
              />

              {doneCount > 0 && (
                <button
                  onClick={handleArchiveDone}
                  className="text-xs font-medium text-slate-600 hover:text-emerald-700 dark:text-neutral-300 dark:hover:text-emerald-400 flex items-center gap-1.5 bg-slate-100 hover:bg-emerald-50 dark:bg-neutral-800 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-neutral-700 px-3 py-1.5 rounded-xl transition-all duration-150 active:scale-[0.96] cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Arsipkan {doneCount} Selesai</span>
                </button>
              )}
            </div>
          </div>

          <p className="md:hidden text-[11px] text-slate-400 dark:text-neutral-500 text-center">
            Geser kartu ke kanan untuk maju status, atau ke kiri untuk mundur
          </p>
        </div>

        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-start">
          {COLUMNS.map((col) => {
            const rawColTasks = filteredTasks.filter((t) => t.status === col.id);

            // Terapkan filter Minggu Ini khusus pada kolom To Do di horizon Harian
            const afterWeekFilter =
              col.id === 'todo' && activeHorizon === 'daily' && todoThisWeekOnly
                ? rawColTasks.filter(
                    (t) =>
                      t.target_date &&
                      t.target_date >= weekBounds.start &&
                      t.target_date <= weekBounds.end
                  )
                : rawColTasks;

            // Urutkan agar tanggal terdekat di atas, dan task baru di bawah task lama
            const columnTasks = sortTasksChronologically(afterWeekFilter);

            const isOver = dragOverCol === col.id;
            const hasMoreThanThree = columnTasks.length > 3;
            const colIds = columnTasks.map((t) => t.id);
            const allColCollapsed =
              colIds.length > 0 && colIds.every((id) => collapsedIds.has(id));

            return (
              <section
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverCol !== col.id) setDragOverCol(col.id);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.id)}
                className={`rounded-2xl p-3.5 sm:p-4 flex flex-col min-h-[140px] md:min-h-[460px] border transition-all ${
                  isOver
                    ? 'bg-emerald-50/70 border-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-600/70'
                    : 'bg-slate-100/70 border-slate-200/80 dark:bg-neutral-900/50 dark:border-neutral-800/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3.5 px-1 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        col.id === 'todo'
                          ? 'bg-slate-400 dark:bg-neutral-500'
                          : col.id === 'in_progress'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-neutral-200 truncate">
                      {col.title}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 font-semibold border border-slate-200/80 dark:border-neutral-700/80">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Tombol Filter Minggu Ini khusus kolom To Do pada horizon Harian */}
                    {col.id === 'todo' && activeHorizon === 'daily' && (
                      <button
                        type="button"
                        onClick={() => setTodoThisWeekOnly((prev) => !prev)}
                        title={`Fokus tugas minggu ini (${formatDateID(weekBounds.start)} s/d ${formatDateID(weekBounds.end)})`}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                          todoThisWeekOnly
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border-slate-200 dark:bg-neutral-800 dark:hover:bg-emerald-950/40 dark:text-neutral-300 dark:hover:text-emerald-300 dark:border-neutral-700'
                        }`}
                      >
                        <Filter className="w-3 h-3" />
                        <span>Minggu Ini</span>
                      </button>
                    )}

                    {/* Tombol Perkecil / Perbesar Semua Kartu di Kolom */}
                    {columnTasks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleCollapseColumn(colIds)}
                        title={
                          allColCollapsed
                            ? 'Perbesar semua kartu di kolom ini'
                            : 'Perkecil semua kartu jadi list'
                        }
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-100 border border-slate-200/80 dark:border-neutral-700 transition-all active:scale-90 cursor-pointer"
                      >
                        {allColCollapsed ? (
                          <ChevronsUpDown className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <ChevronsDownUp className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`space-y-2.5 flex-1 ${
                    hasMoreThanThree
                      ? 'max-h-[840px] overflow-y-auto pr-1.5 overscroll-contain'
                      : ''
                  }`}
                >
                  {columnTasks.map((task) => {
                    const parentTask = task.parent_id
                      ? tasks.find((p) => p.id === task.parent_id) || null
                      : null;

                    const childTasks = tasks.filter((c) => c.parent_id === task.id);
                    const completedChildren = childTasks.filter((c) => c.status === 'done').length;

                    return (
                      <SwipeableTaskCard
                        key={task.id}
                        task={task}
                        colId={col.id}
                        parentTask={parentTask}
                        childCount={childTasks.length}
                        completedChildren={completedChildren}
                        scheduleBadge={renderTaskScheduleBadge(task)}
                        isDragging={draggedTaskId === task.id}
                        isCollapsed={collapsedIds.has(task.id)}
                        onToggleCollapse={() => toggleCollapseTask(task.id)}
                        onDragStart={() => setDraggedTaskId(task.id)}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverCol(null);
                        }}
                        onOpenDetail={() => openDetailModal(task)}
                        onOpenNotes={() => openNotesModal(task)}
                        onEdit={() => openEditModal(task)}
                        onDelete={() => requestDeleteConfirmation(task, false)}
                        onMovePrev={() => handleQuickMove(task, 'prev')}
                        onMoveNext={() => handleQuickMove(task, 'next')}
                      />
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="h-20 md:h-28 border border-dashed border-slate-300/80 dark:border-neutral-800 rounded-xl flex items-center justify-center text-xs text-slate-400 dark:text-neutral-600 px-4 text-center">
                      {col.id === 'todo' && activeHorizon === 'daily' && todoThisWeekOnly ? (
                        'Tidak ada tugas To Do untuk minggu ini'
                      ) : searchQuery || priorityFilter !== 'all' ? (
                        'Tidak ada tugas yang cocok dengan filter'
                      ) : (
                        <>
                          <span className="hidden md:inline">Tarik kartu ke sini</span>
                          <span className="md:hidden">Belum ada tugas di {col.title}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {hasMoreThanThree && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-neutral-800/80 text-center text-[11px] font-medium text-slate-400 dark:text-neutral-500 shrink-0">
                    Scroll ke bawah untuk melihat {columnTasks.length - 3} tugas lainnya
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>

      {/* Agent Drawer */}
      <AgentDrawer
        isOpen={isAgentDrawerOpen}
        onClose={() => setIsAgentDrawerOpen(false)}
        initialMessages={initialAgentMessages}
      />

      {/* Modal Rekap Tahunan */}
      <YearlyRecapModal
        isOpen={isRecapModalOpen}
        onClose={() => setIsRecapModalOpen(false)}
        allTasks={allCombinedTasks}
      />

      {/* Modal Khusus Catatan Progres & Kendala */}
      {notesTask && (
        <div
          onClick={() => setNotesTaskId(null)}
          className="fixed inset-0 bg-slate-900/55 dark:bg-black/80 backdrop-blur-xs z-[55] flex items-center justify-center p-4 animate-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-modal"
          >
            <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0 bg-gradient-to-r from-amber-50/60 via-white to-emerald-50/50 dark:from-amber-950/20 dark:via-neutral-900 dark:to-emerald-950/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <NotebookPen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold leading-none">
                    Catatan Progres & Evaluasi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 truncate">
                    Tugas: <strong className="text-slate-700 dark:text-neutral-200">{notesTask.title}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setNotesTaskId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-90 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNotes} className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Apa yang Sudah Dilakukan</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Catat langkah, progres, atau bagian yang sudah berhasil kamu selesaikan sejauh ini.
                </p>
                <textarea
                  rows={4}
                  autoFocus
                  value={progressNotesInput}
                  onChange={(e) => setProgressNotesInput(e.target.value)}
                  placeholder="- Sudah setup struktur project dan koneksi API&#10;- Berhasil membuat tampilan halaman utama..."
                  className="w-full px-3.5 py-2.5 bg-emerald-50/30 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Apa yang Kurang Dimengerti & Perlu Dicari Solusinya</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Tulis konsep yang belum dipahami, error yang muncul, atau referensi/cara yang perlu diriset nanti.
                </p>
                <textarea
                  rows={4}
                  value={blockerNotesInput}
                  onChange={(e) => setBlockerNotesInput(e.target.value)}
                  placeholder="- Belum paham cara optimasi query saat datanya banyak&#10;- Perlu cari cara handle state saat refresh halaman..."
                  className="w-full px-3.5 py-2.5 bg-amber-50/30 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setNotesTaskId(null)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white active:scale-95 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 active:scale-[0.96] transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Catatan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Arsip Tugas & Pemulihan */}
      {isArchiveModalOpen && (
        <div
          onClick={() => setIsArchiveModalOpen(false)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-modal"
          >
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                  <ArchiveRestore className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold leading-none">Arsip Tugas</h2>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
                    Pulihkan tugas kembali ke papan aktif atau hapus secara permanen
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-90 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-neutral-950/60 border-b border-slate-100 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder="Cari judul tugas di arsip..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500"
                />
                {archiveSearch && (
                  <button
                    onClick={() => setArchiveSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <CustomSelect
                size="sm"
                align="right"
                value={archiveHorizonFilter}
                onChange={(val) => setArchiveHorizonFilter(val as 'all' | Horizon)}
                options={archiveHorizonOptions}
                className="sm:w-44"
              />
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-2.5">
              {archiveLoading ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-neutral-500 animate-pulse">
                  Memuat daftar arsip...
                </div>
              ) : filteredArchivedTasks.length > 0 ? (
                filteredArchivedTasks.map((arch) => {
                  const horizonMeta = HORIZONS.find((h) => h.id === arch.horizon);
                  const prio = PRIORITY_META[arch.priority || 'medium'];

                  return (
                    <div
                      key={arch.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200/80 dark:border-neutral-800/80"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
                            {horizonMeta?.label}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${prio.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${prio.dotClass}`} />
                            {prio.label}
                          </span>
                          <span className="text-[10px]">{renderTaskScheduleBadge(arch)}</span>
                        </div>

                        <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-200 truncate">
                          {arch.title}
                        </h3>

                        {arch.description && (
                          <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-1">
                            {arch.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleRestoreTask(arch, 'todo')}
                          className="px-2.5 py-1.5 text-[11px] font-medium bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700 rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Kembalikan ke kolom To Do"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Ke To Do</span>
                        </button>

                        <button
                          onClick={() => handleRestoreTask(arch, 'done')}
                          className="px-2.5 py-1.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Kembalikan ke kolom Done"
                        >
                          <ArchiveRestore className="w-3 h-3" />
                          <span>Pulihkan</span>
                        </button>

                        <button
                          onClick={() => requestDeleteConfirmation(arch, true)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all active:scale-90 cursor-pointer"
                          title="Hapus permanen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-neutral-500 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                  {archiveSearch || archiveHorizonFilter !== 'all'
                    ? 'Tidak ada tugas arsip yang cocok dengan filter.'
                    : 'Belum ada tugas yang diarsipkan.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Kartu & Relasi Sub-Tugas */}
      {detailTask && (
        <div
          onClick={() => setDetailTaskId(null)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal"
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

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditModal(detailTask)}
                  className="p-1.5 text-slate-500 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-90 cursor-pointer"
                  title="Edit detail kartu"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => requestDeleteConfirmation(detailTask, false)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-90 cursor-pointer"
                  title="Hapus kartu"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDetailTaskId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors active:scale-90 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => openNotesModal(detailTask)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700/60 flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer"
                  >
                    <NotebookPen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>
                      {detailTask.progress_notes || detailTask.blocker_notes
                        ? 'Buka & Edit Catatan Progres / Kendala'
                        : '+ Tambah Catatan Progres & Kendala'}
                    </span>
                  </button>
                </div>

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
                <div className="pt-4 border-t border-slate-200/80 dark:border-neutral-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                        Relasi Tugas {detailChildHorizonMeta.label}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-neutral-500">
                      {detailSubtasks.filter((s) => s.status === 'done').length}/
                      {detailSubtasks.length} selesai
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-neutral-950 rounded-xl border border-slate-200/80 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => {
                        setSubtaskMode('pick');
                        setSubtaskError('');
                      }}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        subtaskMode === 'pick'
                          ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                      }`}
                    >
                      Ambil dari {detailChildHorizonMeta.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubtaskMode('create');
                        setSubtaskError('');
                      }}
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        subtaskMode === 'create'
                          ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200'
                      }`}
                    >
                      + Buat {detailChildHorizonMeta.label} Baru
                    </button>
                  </div>

                  {subtaskMode === 'pick' ? (
                    <form
                      onSubmit={(e) => handleAttachExistingChild(e, detailTask)}
                      className="space-y-2.5 bg-slate-50 dark:bg-neutral-950/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-neutral-800"
                    >
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-neutral-400">
                        Pilih tugas {detailChildHorizonMeta.label.toLowerCase()} yang sudah dibuat:
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <CustomSelect
                          size="sm"
                          value={selectedExistingChildId}
                          onChange={setSelectedExistingChildId}
                          options={childCandidateOptions}
                          className="flex-1 min-w-0"
                        />

                        <button
                          type="submit"
                          disabled={!selectedExistingChildId}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Tautkan</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form
                      onSubmit={(e) => handleAddSubtask(e, detailTask, detailChildHorizon)}
                      className="space-y-3 bg-slate-50 dark:bg-neutral-950/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-neutral-800"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder={`Judul tugas ${detailChildHorizonMeta.label.toLowerCase()} baru...`}
                          className="flex-1 px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500"
                        />
                        <CustomSelect
                          size="sm"
                          align="right"
                          value={newSubtaskPriority}
                          onChange={(val) => setNewSubtaskPriority(val as TaskPriority)}
                          options={SUBTASK_PRIORITY_OPTIONS}
                          className="w-24 shrink-0"
                        />
                      </div>

                      {detailChildHorizon === 'daily' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400 shrink-0">
                            Tanggal Wajib:
                          </span>
                          <CustomDatePicker
                            size="sm"
                            required
                            value={newSubtaskTargetDate}
                            onChange={setNewSubtaskTargetDate}
                            className="flex-1"
                          />
                        </div>
                      )}

                      {detailChildHorizon === 'weekly' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-neutral-400 mb-0.5">
                              Dari Tanggal *
                            </label>
                            <CustomDatePicker
                              size="sm"
                              required
                              value={newSubtaskStartDate}
                              onChange={setNewSubtaskStartDate}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 dark:text-neutral-400 mb-0.5">
                              Sampai Tanggal *
                            </label>
                            <CustomDatePicker
                              size="sm"
                              align="right"
                              required
                              min={newSubtaskStartDate || undefined}
                              value={newSubtaskTargetDate}
                              onChange={setNewSubtaskTargetDate}
                            />
                          </div>
                        </div>
                      )}

                      {MULTI_MONTH_HORIZONS.includes(detailChildHorizon) && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CustomMonthPicker
                              size="sm"
                              value={subtaskMonthPicker}
                              onChange={setSubtaskMonthPicker}
                              className="flex-1"
                            />
                            <button
                              type="button"
                              onClick={handleAddMonthToSubtask}
                              className="px-2.5 py-1.5 text-xs font-medium bg-slate-200 hover:bg-slate-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-lg active:scale-95 transition-all cursor-pointer"
                            >
                              + Bulan
                            </button>
                          </div>
                          {newSubtaskMonths.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {newSubtaskMonths.map((ym) => (
                                <span
                                  key={ym}
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                                >
                                  {formatMonthYearID(ym)}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMonthFromSubtask(ym)}
                                    className="hover:text-rose-500 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {subtaskError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400">{subtaskError}</p>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 active:scale-[0.97] transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Simpan & Kaitkan Tugas {detailChildHorizonMeta.label}</span>
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {detailSubtasks.map((sub) => {
                      const subPrio = PRIORITY_META[sub.priority || 'medium'];
                      return (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950/70 border border-slate-200/80 dark:border-neutral-800/80"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              onClick={() => handleCycleSubtaskStatus(sub)}
                              title="Ubah status"
                              className="shrink-0 active:scale-90 transition-transform cursor-pointer"
                            >
                              {sub.status === 'done' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : sub.status === 'in_progress' ? (
                                <Clock className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400 dark:text-neutral-600" />
                              )}
                            </button>

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

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${subPrio.badgeClass}`}
                            >
                              {subPrio.label}
                            </span>
                            <button
                              onClick={() => handleDetachChild(sub.id)}
                              className="text-slate-400 hover:text-amber-500 p-1 active:scale-90 transition-transform cursor-pointer"
                              title="Lepas relasi (tugas asli tetap tersimpan)"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => requestDeleteConfirmation(sub, false)}
                              className="text-slate-400 hover:text-rose-500 p-1 active:scale-90 transition-transform cursor-pointer"
                              title="Hapus permanen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {detailSubtasks.length === 0 && (
                      <div className="py-5 text-center text-xs text-slate-400 dark:text-neutral-500 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                        Belum ada tugas {detailChildHorizonMeta.label.toLowerCase()} yang terhubung.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Tugas */}
      {isFormModalOpen && (
        <div
          onClick={() => setIsFormModalOpen(false)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-7 shadow-2xl animate-modal"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base sm:text-lg font-bold">
                {editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}
              </h2>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 active:scale-90 transition-all cursor-pointer"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Rentang Waktu
                  </label>
                  <CustomSelect
                    value={formHorizon}
                    onChange={(val) => {
                      const nextHorizon = val as Horizon;
                      const today = getTodayDateString();
                      setFormHorizon(nextHorizon);
                      setParentId('');
                      setFormError('');
                      if (nextHorizon === 'daily') {
                        setStartDate('');
                        if (!targetDate) setTargetDate(today);
                      } else if (nextHorizon === 'weekly') {
                        if (!startDate) setStartDate(today);
                        if (!targetDate) setTargetDate(today);
                      } else if (MULTI_MONTH_HORIZONS.includes(nextHorizon)) {
                        if (targetMonths.length === 0) {
                          setTargetMonths([getCurrentMonthString()]);
                        }
                      }
                    }}
                    options={formHorizonOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Prioritas
                  </label>
                  <CustomSelect
                    align="right"
                    value={priority}
                    onChange={(val) => setPriority(val as TaskPriority)}
                    options={FORM_PRIORITY_OPTIONS}
                  />
                </div>
              </div>

              {formHorizon === 'daily' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Tanggal Pengerjaan *
                  </label>
                  <CustomDatePicker
                    required
                    value={targetDate}
                    onChange={setTargetDate}
                  />
                </div>
              )}

              {formHorizon === 'weekly' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                      Dari Tanggal *
                    </label>
                    <CustomDatePicker
                      required
                      value={startDate}
                      onChange={setStartDate}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                      Sampai Tanggal *
                    </label>
                    <CustomDatePicker
                      align="right"
                      required
                      min={startDate || undefined}
                      value={targetDate}
                      onChange={setTargetDate}
                    />
                  </div>
                </div>
              )}

              {formHorizon === 'monthly' && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="font-semibold">Rentang Tanggal Otomatis</div>
                  {editingMonthlyPreview ? (
                    <p>
                      Terdeteksi:{' '}
                      <strong>
                        {formatDateID(editingMonthlyPreview.start)} s/d{' '}
                        {formatDateID(editingMonthlyPreview.end)}
                      </strong>
                    </p>
                  ) : (
                    <p className="text-[11px] opacity-90">
                      Tanggal awal dan akhir otomatis terdeteksi dari tugas Mingguan yang ditautkan ke kartu ini.
                    </p>
                  )}
                </div>
              )}

              {MULTI_MONTH_HORIZONS.includes(formHorizon) && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400">
                    Pilih Bulan Target *
                  </label>
                  <div className="flex items-center gap-2">
                    <CustomMonthPicker
                      value={monthPicker}
                      onChange={setMonthPicker}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddMonthToForm}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      + Tambah Bulan
                    </button>
                  </div>

                  {targetMonths.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {targetMonths.map((ym) => (
                        <span
                          key={ym}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                        >
                          <span>{formatMonthYearID(ym)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMonthFromForm(ym)}
                            className="hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                  Deskripsi Tugas
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opsional..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {parentCandidates.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-neutral-400 mb-1">
                    Tautkan ke Target Induk (Opsional)
                  </label>
                  <CustomSelect
                    value={parentId}
                    onChange={setParentId}
                    options={parentCandidateOptions}
                    placeholder="Tidak ditautkan"
                  />
                </div>
              )}

              {formError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white active:scale-95 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm active:scale-[0.96] transition-all cursor-pointer"
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
        <div
          onClick={() => setIsShareModalOpen(false)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-modal"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-sky-500" />
                <h2 className="text-base font-bold">Bagikan Vault (Read-Only)</h2>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1 active:scale-90 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
              Siapa pun yang memiliki link ini hanya dapat <strong>melihat</strong> progres tugas
              dan catatanmu tanpa bisa mengubah, menggeser, atau menghapus kartu apa pun.
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
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800">
                  <button
                    onClick={handleEnableOrRotateShare}
                    disabled={shareLoading}
                    className="text-xs text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${shareLoading ? 'animate-spin' : ''}`} />
                    <span>Buat Link Baru (Reset)</span>
                  </button>

                  <button
                    onClick={handleDisableShare}
                    disabled={shareLoading}
                    className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] cursor-pointer"
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

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-modal"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100">
                  {deleteTarget.isArchived ? 'Hapus Permanen dari Arsip?' : 'Konfirmasi Hapus Tugas'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                  Apakah kamu yakin ingin menghapus tugas{' '}
                  <strong className="text-slate-800 dark:text-neutral-200">
                    &ldquo;{deleteTarget.title}&rdquo;
                  </strong>
                  ? Tindakan ini tidak dapat dibatalkan.
                </p>
                {deleteTarget.childCount > 0 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 rounded-lg px-2.5 py-1.5 mt-2.5">
                    Tugas ini memiliki {deleteTarget.childCount} sub-tugas yang terhubung (sub-tugas tidak ikut terhapus, namun relasinya akan terlepas).
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-sm shadow-rose-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}