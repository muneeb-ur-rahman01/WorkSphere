import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad2 = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' -> { y, m (0-indexed), d } local, avoiding timezone drift
const parseISODate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
};

const toISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

// The single source of truth for how a meeting date is displayed anywhere
// in the Meetings section: DD / MM / YYYY, never the US MM/DD/YYYY order.
export const formatDMY = (iso) => {
  const parsed = parseISODate(iso);
  if (!parsed) return '';
  return `${pad2(parsed.d)} / ${pad2(parsed.m + 1)} / ${parsed.y}`;
};

/**
 * A DD/MM/YYYY date picker. Stores/emits plain ISO ('YYYY-MM-DD') strings
 * via onChange (so it drops straight into existing date-typed form state),
 * but always *displays* and lets the user browse dates in DD/MM/YYYY order,
 * independent of the browser's OS/locale settings (native <input type="date">
 * can silently render as MM/DD/YYYY on US-locale browsers, which is exactly
 * what this app must avoid for Meetings).
 */
const DateInputDMY = ({ value, onChange, required = false, placeholder = 'DD / MM / YYYY', id }) => {
  const [open, setOpen] = useState(false);
  const parsed = parseISODate(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed ? parsed.y : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.m : today.getMonth());
  const wrapRef = useRef(null);

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.y);
      setViewMonth(parsed.m);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  // Monday-first grid offset
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (d) => parsed && parsed.y === viewYear && parsed.m === viewMonth && parsed.d === d;
  const isToday = (d) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;

  const handlePick = (d) => {
    onChange(toISO(viewYear, viewMonth, d));
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between border border-gray-300 rounded-lg px-4 py-3 bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          parsed ? 'text-black' : 'text-gray-400'
        }`}
      >
        <span>{parsed ? formatDMY(value) : placeholder}</span>
        <CalendarDays size={18} className="text-gray-400 shrink-0" />
      </button>

      {/* Hidden required-field hook so native form validation still fires */}
      {required && (
        <input type="text" value={value || ''} required onChange={() => {}} tabIndex={-1}
          className="absolute inset-0 w-px h-px opacity-0 pointer-events-none" aria-hidden="true" />
      )}

      {open && (
        <div className="absolute z-20 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={goPrevMonth} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition">
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-black text-sm">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={goNextMonth} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <span key={w} className="text-[11px] font-bold text-gray-400 text-center py-1">{w}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, idx) =>
              d === null ? (
                <span key={`empty-${idx}`} />
              ) : (
                <button
                  type="button"
                  key={d}
                  onClick={() => handlePick(d)}
                  className={`h-8 w-8 mx-auto rounded-full text-sm font-medium transition flex items-center justify-center ${
                    isSelected(d)
                      ? 'bg-blue-600 text-white'
                      : isToday(d)
                      ? 'border border-blue-400 text-blue-600 hover:bg-blue-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {d}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateInputDMY;
