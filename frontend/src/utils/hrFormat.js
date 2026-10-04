import { useCallback, useRef, useState } from 'react';

// Shared helpers for the attendance / leave screens.

export const STATE_META = {
  Present: { label: 'Present', color: '#2563eb', badge: 'bg-blue-100 text-blue-700' },
  Late: { label: 'Late', color: '#f59e0b', badge: 'bg-amber-100 text-amber-700' },
  'Half Day': { label: 'Half Day', color: '#14b8a6', badge: 'bg-teal-100 text-teal-700' },
  Incomplete: { label: 'Incomplete', color: '#f97316', badge: 'bg-orange-100 text-orange-700' },
  Leave: { label: 'Leave', color: '#a3b018', badge: 'bg-lime-100 text-lime-800' },
  Absent: { label: 'Absent', color: '#dc2626', badge: 'bg-red-100 text-red-700' },
  Weekend: { label: 'Weekend', color: '#cbd5e1', badge: 'bg-slate-100 text-slate-600' },
  Upcoming: { label: 'Upcoming', color: '#e2e8f0', badge: 'bg-slate-100 text-slate-500' }
};

export const LEAVE_STATUS_BADGE = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Cancelled: 'bg-slate-100 text-slate-600'
};

export const apiError = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.error || (err?.code === 'ERR_NETWORK' ? 'Network error. Check your connection and try again.' : fallback);

// "09:42 AM" in the organization's timezone (not the device's)
export const fmtTime = (iso, tz) =>
  iso
    ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz }).format(new Date(iso))
    : '—';

export const fmtDate = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : '—';

export const fmtWeekday = (ymd) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

// seconds -> "8h 05m"
export const fmtDuration = (sec) => {
  if (sec == null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

// seconds -> "08:05:09"
export const fmtClock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
};

export const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// State holder for page toasts; render it with <Toast toast={toast} />.
export const useToast = () => {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  return [toast, show];
};

export const money = (n) => (n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export const toneFor = (s) => ({
  Active: 'green', Open: 'green', Approved: 'green', Paid: 'green', Succeeded: 'green', Completed: 'green', Hired: 'green', Acknowledged: 'green', Sent: 'blue', Processed: 'blue', Submitted: 'blue', Ongoing: 'blue', 'In Progress': 'blue', Interview: 'blue', Screening: 'blue', Offered: 'amber',
  Pending: 'amber', Draft: 'amber', Planned: 'amber', Unpaid: 'amber', 'Partially Paid': 'amber', Applied: 'slate', Enrolled: 'slate', 'Not Started': 'slate',
  Rejected: 'red', Failed: 'red', Cancelled: 'slate', Closed: 'slate', Inactive: 'slate', Void: 'slate', Dropped: 'slate', Ended: 'slate', Refunded: 'orange'
}[s] || 'slate');


export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Same naming rule as the server's Content-Disposition filename.
export const payrollCsvName = ({ month, year }) =>
  month && year ? `Payroll_${MONTH_NAMES[month - 1]}_${year}.csv` : year ? `Payroll_${year}.csv` : month ? `Payroll_${MONTH_NAMES[month - 1]}_AllYears.csv` : 'Payroll_All_Records.csv';
