'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { formatDateID, formatMonthYearID } from '@/types/task';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  dotClass?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  disabled = false,
  size = 'md',
  className = '',
  menuClassName = '',
  align = 'left',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 250 && rect.top > 250);
    }

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [open]);

  const sizeClasses =
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 text-left bg-slate-50 dark:bg-neutral-950 border rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/15 bg-white dark:bg-neutral-900'
            : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.dotClass && (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotClass}`}
            />
          )}
          <span
            className={`truncate ${
              selectedOption
                ? 'text-slate-800 dark:text-neutral-100 font-medium'
                : 'text-slate-400 dark:text-neutral-500'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-neutral-500 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-emerald-500' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 min-w-full w-max max-w-[min(90vw,22rem)] bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 py-1.5 max-h-60 overflow-y-auto ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${align === 'right' ? 'right-0' : 'left-0'} ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold'
                    : 'text-slate-700 dark:text-neutral-200 hover:bg-slate-100/80 dark:hover:bg-neutral-800/80'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  {opt.dotClass && (
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${opt.dotClass}`}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs leading-snug truncate">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="text-[10px] text-slate-400 dark:text-neutral-500 truncate mt-0.5">
                        {opt.sublabel}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

const SHORT_MONTH_NAMES_ID = [
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

const DAY_HEADERS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toYMD(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseYMD(value: string): { year: number; month: number; day: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal...',
  required = false,
  min,
  size = 'md',
  className = '',
}: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const todayStr = toYMD(now.getFullYear(), now.getMonth(), now.getDate());
  const parsed = parseYMD(value);

  const [viewYear, setViewYear] = useState<number>(parsed?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed?.month ?? now.getMonth());

  useEffect(() => {
    const p = parseYMD(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 330 && rect.top > 330);
    }

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells: {
    ymd: string;
    day: number;
    isCurrentMonth: boolean;
  }[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarCells.push({
      ymd: toYMD(prevY, prevM, day),
      day,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push({
      ymd: toYMD(viewYear, viewMonth, day),
      day,
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - calendarCells.length;
  for (let day = 1; day <= remaining; day++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarCells.push({
      ymd: toYMD(nextY, nextM, day),
      day,
      isCurrentMonth: false,
    });
  }

  const sizeClasses =
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 text-left bg-slate-50 dark:bg-neutral-950 border rounded-xl transition-all cursor-pointer ${sizeClasses} ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/15 bg-white dark:bg-neutral-900'
            : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
        }`}
      >
        <span
          className={`truncate ${
            value
              ? 'text-slate-800 dark:text-neutral-100 font-medium'
              : 'text-slate-400 dark:text-neutral-500'
          }`}
        >
          {value ? formatDateID(value) : placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {value && !required && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 text-slate-400 hover:text-rose-500 rounded"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <Calendar
            className={`w-3.5 h-3.5 transition-colors ${
              open ? 'text-emerald-500' : 'text-slate-400 dark:text-neutral-500'
            }`}
          />
        </div>
      </button>

      {open && (
        <div
          className={`absolute z-50 w-72 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/60 p-3.5 left-0 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800 dark:text-neutral-100 px-1">
              {MONTH_NAMES_ID[viewMonth]} {viewYear}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Bulan berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADERS_ID.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold text-slate-400 dark:text-neutral-500 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              const isSelected = cell.ymd === value;
              const isToday = cell.ymd === todayStr;
              const isDisabled = Boolean(min && cell.ymd < min);

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(cell.ymd);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-xs shadow-emerald-600/30'
                      : isToday
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/40'
                      : cell.isCurrentMonth
                      ? 'text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800'
                      : 'text-slate-400/70 dark:text-neutral-600 hover:bg-slate-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
            {!required ? (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="font-medium text-slate-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400 px-1.5 py-0.5 rounded cursor-pointer"
              >
                Hapus
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                Wajib diisi
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                setOpen(false);
              }}
              className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 px-2 py-0.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
            >
              Hari Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CustomMonthPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function CustomMonthPicker({
  value,
  onChange,
  size = 'md',
  className = '',
}: CustomMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [selectedYearStr, selectedMonthStr] = (value || '').split('-');
  const parsedYear = Number(selectedYearStr) || now.getFullYear();
  const parsedMonthIndex = (Number(selectedMonthStr) || now.getMonth() + 1) - 1;

  const [displayYear, setDisplayYear] = useState<number>(parsedYear);

  useEffect(() => {
    if (selectedYearStr) {
      setDisplayYear(Number(selectedYearStr));
    }
  }, [selectedYearStr]);

  useEffect(() => {
    if (!open) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 240 && rect.top > 240);
    }

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [open]);

  const sizeClasses =
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 text-left bg-slate-50 dark:bg-neutral-950 border rounded-xl transition-all cursor-pointer ${sizeClasses} ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/15 bg-white dark:bg-neutral-900'
            : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
        }`}
      >
        <span className="truncate font-medium text-slate-800 dark:text-neutral-100">
          {value ? formatMonthYearID(value) : 'Pilih bulan...'}
        </span>
        <Calendar
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            open ? 'text-emerald-500' : 'text-slate-400 dark:text-neutral-500'
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 w-64 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/60 p-3.5 left-0 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setDisplayYear((y) => y - 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-bold text-slate-800 dark:text-neutral-100">
              {displayYear}
            </span>

            <button
              type="button"
              onClick={() => setDisplayYear((y) => y + 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {SHORT_MONTH_NAMES_ID.map((mName, idx) => {
              const ym = `${displayYear}-${String(idx + 1).padStart(2, '0')}`;
              const isSelected =
                displayYear === parsedYear && idx === parsedMonthIndex;

              return (
                <button
                  key={ym}
                  type="button"
                  onClick={() => {
                    onChange(ym);
                    setOpen(false);
                  }}
                  className={`py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-600/30'
                      : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {mName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}