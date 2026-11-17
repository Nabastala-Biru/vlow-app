'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  dotClass?: string;
  disabled?: boolean;
}

const MONTHS_ID = [
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

const DAYS_HEADER_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function formatDisplayDate(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}-${m}-${y}`;
}

function formatDisplayMonth(ym: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return '';
  const [y, m] = ym.split('-');
  const idx = Number(m) - 1;
  return `${MONTHS_ID[idx] || m} ${y}`;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi...',
  size = 'md',
  align = 'left',
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 hover:border-emerald-500/60 rounded-xl text-left transition-colors cursor-pointer ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selected?.dotClass && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selected.dotClass}`} />
          )}
          <span
            className={`truncate ${
              selected
                ? 'text-slate-800 dark:text-neutral-100 font-medium'
                : 'text-slate-400 dark:text-neutral-500'
            }`}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1.5 min-w-full w-64 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xl p-1.5 space-y-0.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
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
                className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 transition-colors ${
                  opt.disabled
                    ? 'opacity-45 cursor-not-allowed'
                    : isSelected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold cursor-pointer'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-neutral-200 dark:hover:bg-neutral-800 cursor-pointer'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {opt.dotClass && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`} />
                    )}
                    <span className="text-xs truncate">{opt.label}</span>
                  </div>
                  {opt.sublabel && (
                    <p className="text-[10px] text-slate-400 dark:text-neutral-500 truncate mt-0.5 pl-4">
                      {opt.sublabel}
                    </p>
                  )}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CustomDatePicker({
  value,
  onChange,
  min,
  required,
  size = 'md',
  align = 'left',
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  min?: string;
  required?: boolean;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date();

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const d = new Date(`${value}T00:00:00`);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = viewMonth === 0 ? 12 : viewMonth;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarCells.push({
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(
        2,
        '0'
      )}`,
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 1 : viewMonth + 2;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarCells.push({
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-neutral-950 border rounded-xl text-left transition-colors cursor-pointer ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/15'
            : 'border-slate-200 dark:border-neutral-800 hover:border-emerald-500/60'
        } ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm'}`}
      >
        <span
          className={
            value
              ? 'text-slate-800 dark:text-neutral-100 font-medium'
              : 'text-slate-400 dark:text-neutral-500'
          }
        >
          {value ? formatDisplayDate(value) : 'Pilih tanggal...'}
        </span>
        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1.5 w-72 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-2xl p-3.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800 dark:text-neutral-100">
              {MONTHS_ID[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAYS_HEADER_ID.map((day) => (
              <span
                key={day}
                className="text-[10px] font-bold text-slate-400 dark:text-neutral-500"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarCells.map((cell) => {
              const isSelected = cell.dateStr === value;
              const isDisabled = Boolean(min && cell.dateStr < min);

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    onChange(cell.dateStr);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-lg text-xs flex items-center justify-center transition-colors ${
                    isDisabled
                      ? 'text-slate-300 dark:text-neutral-700 cursor-not-allowed'
                      : isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-xs cursor-pointer'
                      : cell.isCurrentMonth
                      ? 'text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 font-medium cursor-pointer'
                      : 'text-slate-400 dark:text-neutral-600 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer'
                  }`}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>

          {required && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-neutral-500">
              <span>Wajib diisi</span>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
                    2,
                    '0'
                  )}-${String(now.getDate()).padStart(2, '0')}`;
                  if (!min || todayStr >= min) {
                    onChange(todayStr);
                    setOpen(false);
                  }
                }}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Hari Ini
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CustomMonthPicker({
  value,
  onChange,
  size = 'md',
  align = 'left',
  className = '',
}: {
  value: string;
  onChange: (val: string) => void;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialYear =
    value && /^\d{4}-\d{2}$/.test(value) ? Number(value.slice(0, 4)) : new Date().getFullYear();
  const [viewYear, setViewYear] = useState(initialYear);

  useEffect(() => {
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      setViewYear(Number(value.slice(0, 4)));
    }
  }, [value]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 hover:border-indigo-500/60 rounded-xl text-left transition-colors cursor-pointer ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
        }`}
      >
        <span className="text-slate-800 dark:text-neutral-100 font-medium truncate">
          {value ? formatDisplayMonth(value) : 'Pilih bulan...'}
        </span>
        <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1.5 w-64 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-2xl p-3.5 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 dark:text-neutral-100">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {SHORT_MONTHS_ID.map((mLabel, idx) => {
              const ym = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
              const isSelected = ym === value;
              return (
                <button
                  key={ym}
                  type="button"
                  onClick={() => {
                    onChange(ym);
                    setOpen(false);
                  }}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {mLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}