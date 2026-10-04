import { useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Clock, LogIn, LogOut } from 'lucide-react';
import api from '../../../Config/apiConfig';
import { AppContext } from '../../../context/AppContext';
import { STAFF_ROLE_NAMES } from '../../../Config/constant';
import DashboardLayout from '../../../layouts/DashboardLayout';
import Button from '../../../shared/Button/Button';
import Card from '../../../shared/Card/Card';
import Table from '../../../shared/Table/Table';
import AttendanceChart from '../../../shared/AttendanceChart/AttendanceChart';
import { StatusBadge, Toast } from '../../../shared/HrUi/HrUi';
import { apiError, currentMonthStr, fmtClock, fmtDate, fmtDuration, fmtTime, fmtWeekday, useToast } from '../../../utils/hrFormat';

const StaffAttendance = () => {
  const { currentUser } = useContext(AppContext);
  const [toast, showToast] = useToast();

  const [today, setToday] = useState(null); // { state, session, timezone, serverNow, staleOpenSession }
  const [clockOffset, setClockOffset] = useState(0); // serverTime - deviceTime (ms)
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [month, setMonth] = useState(currentMonthStr());
  const [monthData, setMonthData] = useState(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const applyToday = useCallback((t) => {
    setToday(t);
    setClockOffset(Date.parse(t.serverNow) - Date.now());
  }, []);

  const fetchToday = useCallback(async () => {
    try {
      const res = await api.get('/attendance/today');
      applyToday(res.data);
      setLoadError('');
    } catch (err) {
      setLoadError(apiError(err, 'Could not load your attendance.'));
    }
  }, [applyToday]);

  // Initial load. The timer resumes correctly after a page refresh because the
  // check-in time always comes from the server.
  useEffect(() => {
    let alive = true;
    api.get('/attendance/today')
      .then((res) => { if (alive) { applyToday(res.data); setLoadError(''); } })
      .catch((err) => { if (alive) setLoadError(apiError(err, 'Could not load your attendance.')); });
    return () => { alive = false; };
  }, [applyToday]);

  useEffect(() => {
    let alive = true;
    api.get('/attendance/me', { params: { month } })
      .then((res) => { if (alive) { setMonthData(res.data); setMonthLoading(false); } })
      .catch((err) => { if (alive) { setMonthLoading(false); showToast(apiError(err, 'Could not load attendance history.'), 'error'); } });
    return () => { alive = false; };
  }, [month, showToast]);

  const checkedIn = today?.state === 'checked_in';

  // 1-second tick, only while checked in
  useEffect(() => {
    if (!checkedIn) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [checkedIn]);

  const session = today?.session;
  const elapsed = checkedIn
    ? (now + clockOffset - Date.parse(session.checkInAt)) / 1000
    : session?.durationSeconds || 0;

  const refreshMonth = async () => {
    try {
      const res = await api.get('/attendance/me', { params: { month } });
      setMonthData(res.data);
    } catch { /* keep the previous data */ }
  };

  const act = async (kind) => {
    if (busy) return; // ignore double clicks
    setBusy(true);
    try {
      await api.post(`/attendance/${kind}`);
      await fetchToday();
      await refreshMonth();
      showToast(kind === 'check-in' ? 'Checked in successfully.' : 'Checked out. Have a good one!');
    } catch (err) {
      // A network failure may still have succeeded on the server - re-sync.
      await fetchToday();
      showToast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!currentUser) return <Navigate to="/login/org" replace />;
  if (!STAFF_ROLE_NAMES.includes(currentUser.role)) return <Navigate to="/org-admin/dashboard" replace />;

  const tz = today?.timezone;
  const rows = (monthData?.sessions || []).filter((s) => !dateFilter || s.workDate === dateFilter);
  const stateLabel = { not_checked_in: 'Not checked in', checked_in: 'Checked in', checked_out: 'Checked out' }[today?.state] || '…';

  return (
    <DashboardLayout>
      <Toast toast={toast} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">My Attendance</h1>
        <p className="text-gray-600 mt-2">Check in and out, track today's working hours and review your attendance history.</p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <Button size="small" variant="outline" onClick={fetchToday}>Retry</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card title="Today" subtitle={today ? `${fmtDate(today.today)} · ${tz}` : ''}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Clock size={16} /> Working time today
                </div>
                <p className={`font-mono text-5xl font-bold tracking-tight ${checkedIn ? 'text-blue-600' : 'text-gray-800'}`} aria-live="off">
                  {today ? fmtClock(elapsed) : '--:--:--'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Status: <span className="font-semibold text-gray-800">{stateLabel}</span>
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
                  <span>Check-in: <b className="text-gray-900">{fmtTime(session?.checkInAt, tz)}</b></span>
                  <span>Check-out: <b className="text-gray-900">{fmtTime(session?.checkOutAt, tz)}</b></span>
                  {session?.status && <span>Result: <StatusBadge state={session.status} /></span>}
                </div>
              </div>

              <div className="shrink-0">
                {today?.state === 'checked_in' ? (
                  <Button variant="danger" size="large" onClick={() => act('check-out')} disabled={busy}>
                    <span className="inline-flex items-center gap-2"><LogOut size={18} /> {busy ? 'Please wait…' : 'Check Out'}</span>
                  </Button>
                ) : today?.state === 'checked_out' ? (
                  <p className="text-sm text-gray-500 max-w-[200px]">You have completed today's attendance.</p>
                ) : (
                  <Button variant="success" size="large" onClick={() => act('check-in')} disabled={busy || !today}>
                    <span className="inline-flex items-center gap-2"><LogIn size={18} /> {busy ? 'Please wait…' : 'Check In'}</span>
                  </Button>
                )}
              </div>
            </div>

            {today?.staleOpenSession && (
              <p className="mt-4 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
                A previous day's session was never checked out. It will be closed as “Incomplete” when you check in today.
              </p>
            )}
          </Card>
        </div>

        <Card title="This month" subtitle={month}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Days attended', monthData?.totals.present],
              ['Leave', monthData?.totals.leave],
              ['Absent', monthData?.totals.absent],
              ['Late', monthData?.totals.late],
              ['Hours worked', monthData ? fmtDuration(monthData.totals.workedSeconds) : undefined]
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                <dt className="text-gray-500 text-xs">{k}</dt>
                <dd className="font-bold text-gray-900 text-lg">{v ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="mb-6">
        <AttendanceChart
          title="My Attendance Summary"
          days={monthData?.days || []}
          month={month}
          maxMonth={currentMonthStr()}
          loading={monthLoading}
          onMonthChange={(m) => { setMonthLoading(true); setDateFilter(''); setMonth(m); }}
        />
      </div>

      <Card
        title="Attendance History"
        subtitle="Times are shown in your organization's timezone."
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              min={`${month}-01`}
              max={`${month}-31`}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
              aria-label="Filter by date"
            />
            {dateFilter && <Button size="small" variant="outline" onClick={() => setDateFilter('')}>Clear</Button>}
          </div>
        }
      >
        <Table
          headers={['Date', 'Check-in', 'Check-out', 'Total hours', 'Status']}
          data={rows}
          emptyMessage={monthLoading ? 'Loading…' : dateFilter ? 'No attendance record for this date.' : 'No attendance records for this month.'}
          renderRow={(s) => (
            <tr key={s.id}>
              <td>{fmtDate(s.workDate)} <span className="text-gray-400">({fmtWeekday(s.workDate)})</span></td>
              <td>{fmtTime(s.checkInAt, tz)}</td>
              <td>{s.checkOutAt ? fmtTime(s.checkOutAt, tz) : <span className="text-blue-600 font-medium">In progress</span>}</td>
              <td>{fmtDuration(s.durationSeconds)}</td>
              <td><StatusBadge state={s.status} />{s.isCorrected && <span className="ml-2 text-xs text-gray-400">(corrected)</span>}</td>
            </tr>
          )}
        />
      </Card>
    </DashboardLayout>
  );
};

export default StaffAttendance;
