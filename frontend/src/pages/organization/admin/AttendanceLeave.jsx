import { useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  Paperclip,
  Pencil,
  Plus,
  X,
  ClipboardList,
  FileText,
  Clock3,
} from 'lucide-react';

import api from '../../../Config/apiConfig';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import Button from '../../../shared/Button/Button';
import Card from '../../../shared/Card/Card';
import AttendanceChart from '../../../shared/AttendanceChart/AttendanceChart';
import { StatusBadge, Toast } from '../../../shared/HrUi/HrUi';
import {
  apiError,
  currentMonthStr,
  fmtDate,
  fmtDuration,
  fmtTime,
  toLocalInput,
  useToast,
} from '../../../utils/hrFormat';

const TABS = [
  'Daily Attendance',
  'Leave Requests',
  'Leave Categories',
];

const todayLocal = () =>
  new Date().toLocaleDateString('en-CA');

/* ========================================================================== */
/* Shared Tailwind Form Components                                            */
/* ========================================================================== */

const inputClass = `
  w-full rounded-lg border border-slate-300
  bg-white px-3.5 py-2.5
  text-sm text-slate-900
  placeholder:text-slate-400
  shadow-sm outline-none transition
  focus:border-blue-500
  focus:ring-2 focus:ring-blue-100
  disabled:cursor-not-allowed
  disabled:bg-slate-100
  disabled:text-slate-500
`;

const labelClass =
  'mb-1.5 block text-sm font-semibold text-slate-700';

const FormField = ({
  label,
  required = false,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  rows = 4,
  disabled = false,
}) => {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {type === 'textarea' ? (
        <textarea
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={`${inputClass} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
        />
      )}
    </div>
  );
};

const SelectField = ({
  label,
  required = false,
  value,
  onChange,
  options = [],
  disabled = false,
}) => {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <select
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className={inputClass}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/* ========================================================================== */
/* Professional Modal                                                         */
/* ========================================================================== */

const ModalShell = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
  closeDisabled = false,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !closeDisabled) {
        onClose();
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [open, onClose, closeDisabled]);

  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-[9999]
        flex items-center justify-center
        bg-slate-950/60
        p-0 backdrop-blur-sm
        sm:p-4
      "
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !closeDisabled
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`
          flex max-h-[100vh]
          w-full flex-col
          overflow-hidden
          bg-white shadow-2xl
          sm:max-h-[90vh]
          sm:rounded-2xl
          ${maxWidth}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-modal-title"
      >
        {/* Header */}
        <div
          className="
            flex shrink-0 items-center
            justify-between
            border-b border-slate-200
            px-5 py-4
            sm:px-6
          "
        >
          <div className="min-w-0">
            <h2
              id="attendance-modal-title"
              className="
                truncate text-lg
                font-bold text-slate-900
              "
            >
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="
              ml-4 shrink-0 rounded-lg p-2
              text-slate-400 transition
              hover:bg-slate-100
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ========================================================================== */
/* Professional Table Wrapper                                                */
/* ========================================================================== */

const TableWrapper = ({ children, minWidth = '900px' }) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <table
          className="w-full border-collapse text-left"
          style={{ minWidth }}
        >
          {children}
        </table>
      </div>
    </div>
  );
};

const TableHead = ({ children }) => (
  <thead>
    <tr className="border-b border-slate-200 bg-slate-50">
      {children}
    </tr>
  </thead>
);

const Th = ({
  children,
  align = 'left',
}) => (
  <th
    className={`
      whitespace-nowrap
      px-5 py-3.5
      text-xs font-bold
      uppercase tracking-wider
      text-slate-500
      ${align === 'right' ? 'text-right' : ''}
      ${align === 'center' ? 'text-center' : ''}
    `}
  >
    {children}
  </th>
);

const Td = ({
  children,
  className = '',
}) => (
  <td
    className={`
      px-5 py-4
      text-sm text-slate-600
      ${className}
    `}
  >
    {children}
  </td>
);

const EmptyRow = ({
  colSpan,
  loading,
  message,
  icon: Icon = ClipboardList,
}) => (
  <tr>
    <td
      colSpan={colSpan}
      className="px-6 py-16 text-center"
    >
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div
          className="
            mb-4 flex h-12 w-12
            items-center justify-center
            rounded-full bg-slate-100
            text-slate-400
          "
        >
          <Icon size={22} />
        </div>

        <p className="text-sm font-semibold text-slate-700">
          {loading ? 'Loading…' : message}
        </p>

        {!loading && (
          <p className="mt-1 text-xs text-slate-400">
            There is nothing to display at the moment.
          </p>
        )}
      </div>
    </td>
  </tr>
);

/* ========================================================================== */
/* Daily Attendance                                                           */
/* ========================================================================== */

const DailyAttendance = ({ showToast }) => {
  const [date, setDate] = useState(todayLocal());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [monthFor, setMonthFor] = useState(null);
  const [month, setMonth] = useState(
    currentMonthStr()
  );
  const [monthData, setMonthData] = useState(null);
  const [monthLoading, setMonthLoading] =
    useState(false);

  const [fix, setFix] = useState(null);

  const [fixForm, setFixForm] = useState({
    status: '',
    checkInAt: '',
    checkOutAt: '',
    reason: '',
  });

  const [fixError, setFixError] = useState('');
  const [fixSaving, setFixSaving] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Load Attendance                                                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    api
      .get('/attendance', {
        params: { date },
      })
      .then((res) => {
        if (!alive) return;

        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;

        setLoading(false);

        showToast(
          apiError(
            err,
            'Could not load attendance.'
          ),
          'error'
        );
      });

    return () => {
      alive = false;
    };
  }, [date, tick, showToast]);

  /* ------------------------------------------------------------------------ */
  /* Load Monthly Attendance                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!monthFor) return undefined;

    let alive = true;

    api
      .get(
        `/attendance/user/${monthFor.userId}`,
        {
          params: { month },
        }
      )
      .then((res) => {
        if (!alive) return;

        setMonthData(res.data);
        setMonthLoading(false);
      })
      .catch((err) => {
        if (!alive) return;

        setMonthLoading(false);

        showToast(
          apiError(err),
          'error'
        );
      });

    return () => {
      alive = false;
    };
  }, [monthFor, month, showToast]);

  const rows = data?.rows || [];

  const summary = rows.reduce(
    (map, row) => ({
      ...map,
      [row.state]:
        (map[row.state] || 0) + 1,
    }),
    {}
  );

  const tz = data?.timezone;

  /* ------------------------------------------------------------------------ */
  /* Open Correction                                                          */
  /* ------------------------------------------------------------------------ */

  const openFix = (row) => {
    setFix(row);
    setFixError('');

    setFixForm({
      status: row.session.status,
      checkInAt: toLocalInput(
        row.session.checkInAt
      ),
      checkOutAt: toLocalInput(
        row.session.checkOutAt
      ),
      reason: '',
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Save Correction                                                          */
  /* ------------------------------------------------------------------------ */

  const saveFix = async (event) => {
    event.preventDefault();

    if (fixSaving) return;

    if (
      fixForm.reason.trim().length < 3
    ) {
      setFixError(
        'Please enter a reason for this correction.'
      );
      return;
    }

    setFixSaving(true);
    setFixError('');

    try {
      await api.post(
        `/attendance/${fix.session.id}/correct`,
        {
          status: fixForm.status,

          checkInAt: fixForm.checkInAt
            ? new Date(
                fixForm.checkInAt
              ).toISOString()
            : undefined,

          checkOutAt: fixForm.checkOutAt
            ? new Date(
                fixForm.checkOutAt
              ).toISOString()
            : undefined,

          reason:
            fixForm.reason.trim(),
        }
      );

      setFix(null);

      setTick((value) => value + 1);

      showToast(
        'Attendance corrected and the staff member was notified.'
      );
    } catch (err) {
      setFixError(apiError(err));
    } finally {
      setFixSaving(false);
    }
  };

  return (
    <>
      {/* ================================================================== */}
      {/* Attendance Card                                                    */}
      {/* ================================================================== */}

      <Card
        title="Staff attendance"
        subtitle={
          data ? fmtDate(data.date) : ''
        }
        actions={
          <div className="relative">
            <CalendarDays
              size={16}
              className="
                pointer-events-none
                absolute left-3 top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              type="date"
              value={date}
              onChange={(event) => {
                if (event.target.value) {
                  setLoading(true);
                  setDate(event.target.value);
                }
              }}
              className="
                rounded-lg
                border border-slate-300
                bg-white
                py-2 pl-9 pr-3
                text-sm text-slate-700
                shadow-sm outline-none
                transition
                focus:border-blue-500
                focus:ring-2 focus:ring-blue-100
              "
              aria-label="Select date"
            />
          </div>
        }
      >
        {/* Summary */}
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            'Present',
            'Late',
            'Half Day',
            'Incomplete',
            'Leave',
            'Absent',
          ].map((status) => (
            <div
              key={status}
              className="
                flex items-center
                justify-between
                rounded-lg
                border border-slate-200
                bg-slate-50
                px-3 py-2.5
              "
            >
              <div className="min-w-0">
                <StatusBadge state={status} />
              </div>

              <span className="ml-2 text-sm font-bold text-slate-800">
                {summary[status] || 0}
              </span>
            </div>
          ))}
        </div>

        {/* Attendance Table */}
        <TableWrapper minWidth="1050px">
          <TableHead>
            <Th>Staff member</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Check-in</Th>
            <Th>Check-out</Th>
            <Th>Total hours</Th>
            <Th align="right">Actions</Th>
          </TableHead>

          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={row.userId}
                  className="
                    group
                    bg-white
                    transition-colors
                    hover:bg-slate-50
                  "
                >
                  {/* Staff */}
                  <Td>
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          flex h-10 w-10
                          shrink-0 items-center
                          justify-center
                          rounded-lg
                          bg-blue-50
                          text-sm font-bold
                          text-blue-700
                        "
                      >
                        {(row.fullName || 'S')
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {row.fullName}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Staff member
                        </p>
                      </div>
                    </div>
                  </Td>

                  {/* Role */}
                  <Td>
                    <span className="font-medium text-slate-700">
                      {row.role}
                    </span>
                  </Td>

                  {/* Status */}
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        state={row.state}
                      />

                      {row.session?.isCorrected && (
                        <span
                          className="
                            rounded-full
                            bg-amber-50
                            px-2 py-1
                            text-[11px]
                            font-semibold
                            text-amber-700
                          "
                        >
                          Corrected
                        </span>
                      )}
                    </div>
                  </Td>

                  {/* Check in */}
                  <Td>
                    <div className="flex items-center gap-2">
                      <Clock3
                        size={15}
                        className="text-slate-400"
                      />

                      <span>
                        {fmtTime(
                          row.session?.checkInAt,
                          tz
                        )}
                      </span>
                    </div>
                  </Td>

                  {/* Check out */}
                  <Td>
                    {row.session ? (
                      row.session.checkOutAt ? (
                        <span>
                          {fmtTime(
                            row.session
                              .checkOutAt,
                            tz
                          )}
                        </span>
                      ) : (
                        <span
                          className="
                            inline-flex
                            rounded-full
                            bg-blue-50
                            px-2.5 py-1
                            text-xs font-semibold
                            text-blue-700
                          "
                        >
                          In progress
                        </span>
                      )
                    ) : (
                      '—'
                    )}
                  </Td>

                  {/* Duration */}
                  <Td>
                    <span className="font-semibold text-slate-800">
                      {fmtDuration(
                        row.session
                          ?.durationSeconds
                      )}
                    </span>
                  </Td>

                  {/* Actions */}
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMonthData(null);
                          setMonthLoading(true);
                          setMonthFor(row);
                        }}
                        className="
                          inline-flex items-center
                          gap-1.5 rounded-lg
                          border border-slate-300
                          bg-white px-3 py-2
                          text-xs font-semibold
                          text-slate-700
                          shadow-sm transition
                          hover:border-blue-300
                          hover:bg-blue-50
                          hover:text-blue-700
                        "
                      >
                        <CalendarDays size={14} />
                        Month
                      </button>

                      {row.session && (
                        <button
                          type="button"
                          onClick={() =>
                            openFix(row)
                          }
                          className="
                            inline-flex items-center
                            gap-1.5 rounded-lg
                            border border-slate-300
                            bg-white px-3 py-2
                            text-xs font-semibold
                            text-slate-700
                            shadow-sm transition
                            hover:border-blue-300
                            hover:bg-blue-50
                            hover:text-blue-700
                          "
                        >
                          <Pencil size={14} />
                          Correct
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            ) : (
              <EmptyRow
                colSpan={7}
                loading={loading}
                message="No active staff members found."
              />
            )}
          </tbody>
        </TableWrapper>

        <p className="mt-3 text-xs text-slate-400">
          Approved leave is shown as “Leave” and is
          never counted as an absence.
        </p>
      </Card>

      {/* ================================================================== */}
      {/* Monthly Attendance Modal                                           */}
      {/* ================================================================== */}

      <ModalShell
        open={!!monthFor}
        onClose={() => setMonthFor(null)}
        title={
          monthFor
            ? `${monthFor.fullName} — monthly attendance`
            : ''
        }
        maxWidth="max-w-4xl"
      >
        <div className="p-5 sm:p-6">
          <AttendanceChart
            title="Attendance Summary"
            days={monthData?.days || []}
            month={month}
            maxMonth={currentMonthStr()}
            loading={monthLoading}
            onMonthChange={(selectedMonth) => {
              setMonthLoading(true);
              setMonth(selectedMonth);
            }}
          />
        </div>
      </ModalShell>

      {/* ================================================================== */}
      {/* Correction Modal                                                   */}
      {/* ================================================================== */}

      <ModalShell
        open={!!fix}
        onClose={() =>
          !fixSaving && setFix(null)
        }
        title={
          fix
            ? `Correct attendance — ${fix.fullName}`
            : ''
        }
        subtitle="Update the attendance record and provide a reason for the audit trail."
        maxWidth="max-w-lg"
        closeDisabled={fixSaving}
      >
        <form
          onSubmit={saveFix}
          className="flex flex-col"
          noValidate
        >
          <div className="space-y-5 p-5 sm:p-6">
            <SelectField
              label="Status"
              required
              value={fixForm.status}
              onChange={(event) =>
                setFixForm({
                  ...fixForm,
                  status:
                    event.target.value,
                })
              }
              disabled={fixSaving}
              options={[
                {
                  value: 'Present',
                  label: 'Present',
                },
                {
                  value: 'Late',
                  label: 'Late',
                },
                {
                  value: 'Half Day',
                  label: 'Half Day',
                },
                {
                  value: 'Absent',
                  label: 'Absent',
                },
                {
                  value: 'Incomplete',
                  label: 'Incomplete',
                },
              ]}
            />

            <FormField
              label="Check-in (your local time)"
              type="datetime-local"
              value={fixForm.checkInAt}
              onChange={(event) =>
                setFixForm({
                  ...fixForm,
                  checkInAt:
                    event.target.value,
                })
              }
              disabled={fixSaving}
            />

            <FormField
              label="Check-out (your local time)"
              type="datetime-local"
              value={fixForm.checkOutAt}
              onChange={(event) =>
                setFixForm({
                  ...fixForm,
                  checkOutAt:
                    event.target.value,
                })
              }
              disabled={fixSaving}
            />

            <FormField
              label="Reason"
              required
              type="textarea"
              rows={3}
              value={fixForm.reason}
              onChange={(event) =>
                setFixForm({
                  ...fixForm,
                  reason:
                    event.target.value,
                })
              }
              placeholder="Explain why this attendance record needs correction..."
              disabled={fixSaving}
            />

            <p className="text-xs text-slate-400">
              This reason will be recorded in the
              attendance audit trail.
            </p>

            {fixError && (
              <div
                className="
                  rounded-lg
                  border border-red-200
                  bg-red-50
                  px-3.5 py-3
                  text-sm text-red-700
                "
                role="alert"
              >
                {fixError}
              </div>
            )}
          </div>

          <div
            className="
              flex shrink-0 justify-end gap-3
              border-t border-slate-200
              bg-slate-50
              px-5 py-4
              sm:px-6
            "
          >
            <button
              type="button"
              onClick={() => setFix(null)}
              disabled={fixSaving}
              className="
                rounded-lg
                border border-slate-300
                bg-white
                px-4 py-2.5
                text-sm font-semibold
                text-slate-700
                shadow-sm transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={fixSaving}
              className="
                inline-flex
                items-center justify-center
                rounded-lg
                bg-blue-600
                px-4 py-2.5
                text-sm font-semibold
                text-white
                shadow-sm transition
                hover:bg-blue-700
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
                focus:ring-offset-2
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {fixSaving
                ? 'Saving…'
                : 'Save correction'}
            </button>
          </div>
        </form>
      </ModalShell>
    </>
  );
};

/* ========================================================================== */
/* Leave Requests                                                             */
/* ========================================================================== */

const LeaveRequests = ({ showToast }) => {
  const [status, setStatus] =
    useState('Pending');

  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [tick, setTick] = useState(0);

  const [decide, setDecide] =
    useState(null);

  const [remarks, setRemarks] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Load Requests                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    api
      .get('/leave', {
        params:
          status === 'All'
            ? {}
            : { status },
      })
      .then((res) => {
        if (!alive) return;

        setRequests(
          res.data.requests || []
        );

        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;

        setLoading(false);

        showToast(
          apiError(
            err,
            'Could not load leave requests.'
          ),
          'error'
        );
      });

    return () => {
      alive = false;
    };
  }, [status, tick, showToast]);

  /* ------------------------------------------------------------------------ */
  /* Submit Decision                                                          */
  /* ------------------------------------------------------------------------ */

  const submit = async () => {
    if (saving || !decide) return;

    setSaving(true);

    try {
      await api.post(
        `/leave/${decide.request.id}/review`,
        {
          decision:
            decide.decision,
          remarks:
            remarks.trim() || undefined,
        }
      );

      const decisionText =
        decide.decision.toLowerCase();

      setDecide(null);

      setTick((value) => value + 1);

      showToast(
        `Leave request ${decisionText}. The staff member was notified.`
      );
    } catch (err) {
      showToast(
        apiError(err),
        'error'
      );

      setDecide(null);
      setTick((value) => value + 1);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Attachment                                                               */
  /* ------------------------------------------------------------------------ */

  const viewAttachment = async (id) => {
    try {
      const res = await api.get(
        `/leave/${id}/attachment`
      );

      window.open(
        res.data.url,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (err) {
      showToast(
        apiError(err),
        'error'
      );
    }
  };

  return (
    <>
      <Card
        title="Leave requests"
        subtitle="Review and manage staff leave applications."
        actions={
          <select
            value={status}
            onChange={(event) => {
              setLoading(true);
              setStatus(event.target.value);
            }}
            className="
              rounded-lg
              border border-slate-300
              bg-white
              px-3 py-2
              text-sm text-slate-700
              shadow-sm outline-none
              focus:border-blue-500
              focus:ring-2
              focus:ring-blue-100
            "
            aria-label="Filter by status"
          >
            {[
              'Pending',
              'Approved',
              'Rejected',
              'Cancelled',
              'All',
            ].map((value) => (
              <option key={value}>
                {value}
              </option>
            ))}
          </select>
        }
      >
        <TableWrapper minWidth="1200px">
          <TableHead>
            <Th>Staff member</Th>
            <Th>Category</Th>
            <Th>From</Th>
            <Th>To</Th>
            <Th align="center">Days</Th>
            <Th>Reason</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </TableHead>

          <tbody className="divide-y divide-slate-100">
            {requests.length > 0 ? (
              requests.map((request) => (
                <tr
                  key={request.id}
                  className="
                    bg-white
                    transition-colors
                    hover:bg-slate-50
                  "
                >
                  {/* Staff */}
                  <Td>
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          flex h-10 w-10
                          shrink-0 items-center
                          justify-center
                          rounded-lg
                          bg-indigo-50
                          text-sm font-bold
                          text-indigo-700
                        "
                      >
                        {(request.staffName || 'S')
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          {request.staffName}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Leave applicant
                        </p>
                      </div>
                    </div>
                  </Td>

                  {/* Category */}
                  <Td>
                    <div>
                      <p className="font-medium text-slate-700">
                        {request.categoryName}
                      </p>

                      {!request.isPaid && (
                        <span
                          className="
                            mt-1 inline-flex
                            rounded-full
                            bg-amber-50
                            px-2 py-0.5
                            text-[11px]
                            font-semibold
                            text-amber-700
                          "
                        >
                          Unpaid
                        </span>
                      )}
                    </div>
                  </Td>

                  {/* From */}
                  <Td>
                    {fmtDate(
                      request.startDate
                    )}
                  </Td>

                  {/* To */}
                  <Td>
                    {fmtDate(
                      request.endDate
                    )}
                  </Td>

                  {/* Days */}
                  <Td
                    className="text-center"
                  >
                    <span
                      className="
                        inline-flex min-w-[38px]
                        items-center justify-center
                        rounded-lg
                        bg-slate-100
                        px-2.5 py-1.5
                        font-bold
                        text-slate-700
                      "
                    >
                      {request.totalDays}
                    </span>
                  </Td>

                  {/* Reason */}
                  <Td>
                    <div className="max-w-[250px]">
                      <p
                        className="truncate text-sm text-slate-600"
                        title={
                          request.reason
                        }
                      >
                        {request.reason}
                      </p>

                      {request.adminRemarks && (
                        <p
                          className="
                            mt-1 truncate
                            text-xs text-slate-400
                          "
                          title={
                            request.adminRemarks
                          }
                        >
                          Remarks:{' '}
                          {
                            request.adminRemarks
                          }
                        </p>
                      )}
                    </div>
                  </Td>

                  {/* Status */}
                  <Td>
                    <StatusBadge
                      state={request.status}
                    />
                  </Td>

                  {/* Actions */}
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {request.hasAttachment && (
                        <button
                          type="button"
                          onClick={() =>
                            viewAttachment(
                              request.id
                            )
                          }
                          className="
                            inline-flex h-9 w-9
                            items-center
                            justify-center
                            rounded-lg
                            border border-slate-200
                            bg-white
                            text-slate-500
                            transition
                            hover:border-blue-200
                            hover:bg-blue-50
                            hover:text-blue-700
                          "
                          title="View attachment"
                          aria-label="View attachment"
                        >
                          <Paperclip size={16} />
                        </button>
                      )}

                      {request.status ===
                        'Pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setRemarks('');
                              setDecide({
                                request,
                                decision:
                                  'Approved',
                              });
                            }}
                            className="
                              inline-flex
                              items-center gap-1.5
                              rounded-lg
                              border
                              border-emerald-200
                              bg-emerald-50
                              px-3 py-2
                              text-xs font-semibold
                              text-emerald-700
                              transition
                              hover:bg-emerald-100
                            "
                          >
                            <Check size={14} />
                            Accept
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRemarks('');
                              setDecide({
                                request,
                                decision:
                                  'Rejected',
                              });
                            }}
                            className="
                              inline-flex
                              items-center gap-1.5
                              rounded-lg
                              border
                              border-red-200
                              bg-red-50
                              px-3 py-2
                              text-xs font-semibold
                              text-red-600
                              transition
                              hover:bg-red-100
                            "
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            ) : (
              <EmptyRow
                colSpan={8}
                loading={loading}
                message={`No ${
                  status === 'All'
                    ? ''
                    : status.toLowerCase() + ' '
                }leave requests.`}
                icon={FileText}
              />
            )}
          </tbody>
        </TableWrapper>
      </Card>

      {/* ================================================================== */}
      {/* Decision Modal                                                      */}
      {/* ================================================================== */}

      <ModalShell
        open={!!decide}
        onClose={() =>
          !saving && setDecide(null)
        }
        title={
          decide
            ? `${
                decide.decision ===
                'Approved'
                  ? 'Accept'
                  : 'Reject'
              } leave request`
            : ''
        }
        subtitle="Review the request details before submitting your decision."
        maxWidth="max-w-lg"
        closeDisabled={saving}
      >
        {decide && (
          <div className="flex flex-col">
            <div className="space-y-5 p-5 sm:p-6">
              {/* Request summary */}
              <div
                className="
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  p-4
                "
              >
                <div className="flex items-start gap-3">
                  <div
                    className="
                      flex h-10 w-10
                      shrink-0
                      items-center justify-center
                      rounded-lg
                      bg-blue-50
                      text-blue-700
                    "
                  >
                    <CalendarDays size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {decide.request.staffName}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {
                        decide.request
                          .categoryName
                      }
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {fmtDate(
                        decide.request
                          .startDate
                      )}{' '}
                      →{' '}
                      {fmtDate(
                        decide.request
                          .endDate
                      )}{' '}
                      ·{' '}
                      {
                        decide.request
                          .totalDays
                      }{' '}
                      day
                      {decide.request
                        .totalDays > 1
                        ? 's'
                        : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <FormField
                label="Remarks"
                type="textarea"
                rows={4}
                value={remarks}
                onChange={(event) =>
                  setRemarks(
                    event.target.value.slice(
                      0,
                      500
                    )
                  )
                }
                placeholder="Add remarks for the staff member (optional)..."
                disabled={saving}
              />
            </div>

            {/* Footer */}
            <div
              className="
                flex shrink-0 justify-end gap-3
                border-t border-slate-200
                bg-slate-50
                px-5 py-4
                sm:px-6
              "
            >
              <button
                type="button"
                onClick={() =>
                  setDecide(null)
                }
                disabled={saving}
                className="
                  rounded-lg
                  border border-slate-300
                  bg-white
                  px-4 py-2.5
                  text-sm font-semibold
                  text-slate-700
                  shadow-sm transition
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className={`
                  inline-flex
                  items-center
                  justify-center
                  rounded-lg
                  px-4 py-2.5
                  text-sm font-semibold
                  text-white
                  shadow-sm transition
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  ${
                    decide.decision ===
                    'Approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }
                  focus:outline-none
                  focus:ring-2
                  focus:ring-offset-2
                `}
              >
                {saving
                  ? 'Saving…'
                  : decide.decision ===
                    'Approved'
                  ? 'Accept request'
                  : 'Reject request'}
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </>
  );
};

/* ========================================================================== */
/* Leave Categories                                                           */
/* ========================================================================== */

const emptyCat = {
  name: '',
  isPaid: true,
  annualQuotaDays: '',
  requiresDocument: false,
};

const LeaveCategories = ({
  showToast,
}) => {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [tick, setTick] = useState(0);

  const [edit, setEdit] =
    useState(null);

  const [error, setError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Load Categories                                                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    api
      .get('/leave/categories', {
        params: {
          includeInactive: true,
        },
      })
      .then((res) => {
        if (!alive) return;

        setCats(
          res.data.categories || []
        );

        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;

        setLoading(false);

        showToast(
          apiError(err),
          'error'
        );
      });

    return () => {
      alive = false;
    };
  }, [tick, showToast]);

  /* ------------------------------------------------------------------------ */
  /* Save Category                                                            */
  /* ------------------------------------------------------------------------ */

  const save = async (event) => {
    event.preventDefault();

    if (saving || !edit) return;

    if (
      edit.name.trim().length < 2
    ) {
      setError(
        'Name must be at least 2 characters.'
      );
      return;
    }

    const quota =
      edit.annualQuotaDays === ''
        ? null
        : Number(
            edit.annualQuotaDays
          );

    if (
      quota !== null &&
      (!Number.isInteger(quota) ||
        quota < 0 ||
        quota > 366)
    ) {
      setError(
        'Annual quota must be a whole number between 0 and 366.'
      );
      return;
    }

    setSaving(true);
    setError('');

    const body = {
      name: edit.name.trim(),
      isPaid: edit.isPaid,
      annualQuotaDays: quota,
      requiresDocument:
        edit.requiresDocument,
    };

    try {
      if (edit.id) {
        await api.patch(
          `/leave/categories/${edit.id}`,
          body
        );
      } else {
        await api.post(
          '/leave/categories',
          body
        );
      }

      setEdit(null);

      setTick((value) => value + 1);

      showToast(
        'Leave category saved.'
      );
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Toggle Active                                                            */
  /* ------------------------------------------------------------------------ */

  const toggle = async (category) => {
    try {
      await api.patch(
        `/leave/categories/${category.id}`,
        {
          isActive:
            !category.isActive,
        }
      );

      setTick((value) => value + 1);
    } catch (err) {
      showToast(
        apiError(err),
        'error'
      );
    }
  };

  return (
    <>
      <Card
        title="Leave categories & policy"
        subtitle="Configure paid leave, annual quotas and document requirements."
        actions={
          <button
            type="button"
            onClick={() => {
              setError('');
              setEdit({
                ...emptyCat,
              });
            }}
            className="
              inline-flex items-center gap-2
              rounded-lg  bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600
              px-4 py-2.5
              text-sm font-semibold
              text-white
              shadow-sm transition
              hover:bg-blue-700
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
              focus:ring-offset-2
            "
          >
            <Plus size={16} />
            Add category
          </button>
        }
      >
        {/* Categories Table */}
        <TableWrapper minWidth="950px">
          <TableHead>
            <Th>Category</Th>
            <Th>Type</Th>
            <Th>Annual quota</Th>
            <Th>Document required</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </TableHead>

          <tbody className="divide-y divide-slate-100">
            {cats.length > 0 ? (
              cats.map((category) => (
                <tr
                  key={category.id}
                  className="
                    bg-white
                    transition-colors
                    hover:bg-slate-50
                  "
                >
                  {/* Category */}
                  <Td>
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          flex h-10 w-10
                          shrink-0 items-center
                          justify-center
                          rounded-lg
                          bg-violet-50
                          text-violet-700
                        "
                      >
                        {(category.name || 'L')
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          {category.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Leave category
                        </p>
                      </div>
                    </div>
                  </Td>

                  {/* Type */}
                  <Td>
                    <span
                      className={`
                        inline-flex
                        rounded-full
                        px-2.5 py-1
                        text-xs font-semibold
                        ${
                          category.isPaid
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }
                      `}
                    >
                      {category.isPaid
                        ? 'Paid'
                        : 'Unpaid'}
                    </span>
                  </Td>

                  {/* Quota */}
                  <Td>
                    {category.annualQuotaDays !==
                    null ? (
                      <span className="font-semibold text-slate-800">
                        {
                          category.annualQuotaDays
                        }{' '}
                        days
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        No limit
                      </span>
                    )}
                  </Td>

                  {/* Document */}
                  <Td>
                    {category.requiresDocument ? (
                      <span className="
                        inline-flex items-center
                        gap-1.5
                        rounded-full
                        bg-blue-50
                        px-2.5 py-1
                        text-xs font-semibold
                        text-blue-700
                      ">
                        <Check size={13} />
                        Required
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Not required
                      </span>
                    )}
                  </Td>

                  {/* Status */}
                  <Td>
                    <StatusBadge
                      state={
                        category.isActive
                          ? 'Approved'
                          : 'Cancelled'
                      }
                      label={
                        category.isActive
                          ? 'Active'
                          : 'Inactive'
                      }
                    />
                  </Td>

                  {/* Actions */}
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError('');

                          setEdit({
                            id: category.id,
                            name: category.name,
                            isPaid:
                              category.isPaid,
                            annualQuotaDays:
                              category.annualQuotaDays ??
                              '',
                            requiresDocument:
                              category.requiresDocument,
                          });
                        }}
                        className="
                          inline-flex
                          items-center gap-1.5
                          rounded-lg
                          border border-slate-300
                          bg-white
                          px-3 py-2
                          text-xs font-semibold
                          text-slate-700
                          shadow-sm transition
                          hover:border-blue-300
                          hover:bg-blue-50
                          hover:text-blue-700
                        "
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggle(category)
                        }
                        className={`
                          rounded-lg
                          border px-3 py-2
                          text-xs font-semibold
                          transition
                          ${
                            category.isActive
                              ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }
                        `}
                      >
                        {category.isActive
                          ? 'Deactivate'
                          : 'Activate'}
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            ) : (
              <EmptyRow
                colSpan={6}
                loading={loading}
                message="No leave categories."
                icon={ClipboardList}
              />
            )}
          </tbody>
        </TableWrapper>
      </Card>

      {/* ================================================================== */}
      {/* Category Modal                                                      */}
      {/* ================================================================== */}

      <ModalShell
        open={!!edit}
        onClose={() =>
          !saving && setEdit(null)
        }
        title={
          edit?.id
            ? 'Edit leave category'
            : 'Add leave category'
        }
        subtitle="Configure the leave category policy."
        maxWidth="max-w-lg"
        closeDisabled={saving}
      >
        {edit && (
          <form
            onSubmit={save}
            className="flex flex-col"
            noValidate
          >
            <div className="space-y-5 p-5 sm:p-6">
              <FormField
                label="Name"
                required
                value={edit.name}
                onChange={(event) =>
                  setEdit({
                    ...edit,
                    name:
                      event.target.value,
                  })
                }
                placeholder="e.g. Annual Leave"
                disabled={saving}
              />

              <FormField
                label="Annual quota (days)"
                type="number"
                value={
                  edit.annualQuotaDays
                }
                onChange={(event) =>
                  setEdit({
                    ...edit,
                    annualQuotaDays:
                      event.target.value,
                  })
                }
                placeholder="Blank = no limit"
                disabled={saving}
              />

              {/* Paid Leave */}
              <label
                className="
                  flex cursor-pointer
                  items-start gap-3
                  rounded-lg
                  border border-slate-200
                  bg-slate-50
                  p-3.5
                  transition
                  hover:bg-slate-100
                "
              >
                <input
                  type="checkbox"
                  checked={edit.isPaid}
                  onChange={(event) =>
                    setEdit({
                      ...edit,
                      isPaid:
                        event.target.checked,
                    })
                  }
                  disabled={saving}
                  className="
                    mt-0.5 h-4 w-4
                    rounded border-slate-300
                    text-blue-600
                    focus:ring-blue-500
                  "
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-700">
                    Paid leave
                  </span>

                  <span className="mt-0.5 block text-xs text-slate-400">
                    This category counts as paid time off.
                  </span>
                </span>
              </label>

              {/* Document */}
              <label
                className="
                  flex cursor-pointer
                  items-start gap-3
                  rounded-lg
                  border border-slate-200
                  bg-slate-50
                  p-3.5
                  transition
                  hover:bg-slate-100
                "
              >
                <input
                  type="checkbox"
                  checked={
                    edit.requiresDocument
                  }
                  onChange={(event) =>
                    setEdit({
                      ...edit,
                      requiresDocument:
                        event.target
                          .checked,
                    })
                  }
                  disabled={saving}
                  className="
                    mt-0.5 h-4 w-4
                    rounded border-slate-300
                    text-blue-600
                    focus:ring-blue-500
                  "
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-700">
                    Supporting document required
                  </span>

                  <span className="mt-0.5 block text-xs text-slate-400">
                    Staff must attach supporting documentation.
                  </span>
                </span>
              </label>

              {/* Error */}
              {error && (
                <div
                  className="
                    rounded-lg
                    border border-red-200
                    bg-red-50
                    px-3.5 py-3
                    text-sm text-red-700
                  "
                  role="alert"
                >
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="
                flex shrink-0 justify-end gap-3
                border-t border-slate-200
                bg-slate-50
                px-5 py-4
                sm:px-6
              "
            >
              <button
                type="button"
                onClick={() =>
                  setEdit(null)
                }
                disabled={saving}
                className="
                  rounded-lg
                  border border-slate-300
                  bg-white
                  px-4 py-2.5
                  text-sm font-semibold
                  text-slate-700
                  shadow-sm transition
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="
                  inline-flex
                  min-w-[120px]
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-600
                  px-4 py-2.5
                  text-sm font-semibold
                  text-white
                  shadow-sm transition
                  hover:bg-blue-700
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:ring-offset-2
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {saving
                  ? 'Saving…'
                  : 'Save category'}
              </button>
            </div>
          </form>
        )}
      </ModalShell>
    </>
  );
};

/* ========================================================================== */
/* Main Page                                                                  */
/* ========================================================================== */

const AttendanceLeave = () => {
  const { currentUser } =
    useContext(AppContext);

  const [toast, showToast] =
    useToast();

  const [tab, setTab] =
    useState(0);

  const stableToast = useCallback(
    (message, type) =>
      showToast(message, type),
    [showToast]
  );

  /* ------------------------------------------------------------------------ */
  /* Auth                                                                     */
  /* ------------------------------------------------------------------------ */

  if (!currentUser) {
    return (
      <Navigate
        to="/login/org"
        replace
      />
    );
  }

  if (currentUser.role !== 'OrgAdmin') {
    return (
      <Navigate
        to="/staff/dashboard"
        replace
      />
    );
  }

  return (
    <DashboardLayout>
      <Toast toast={toast} />

      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}

      <div className="mb-7">
        <div className="flex items-start gap-3">
          <div
            className="
              hidden h-12 w-12
              shrink-0 items-center
              justify-center
              rounded-xl
              bg-blue-50
              text-blue-700
              sm:flex
            "
          >
            <ClipboardList size={22} />
          </div>

          <div>
            <h1
              className="
                text-2xl font-bold
                tracking-tight
                text-slate-900
                sm:text-3xl
              "
            >
              Attendance &amp; Leave
              Management
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review staff attendance,
              approve or reject leave
              requests and manage leave
              policies.
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Tabs                                                               */}
      {/* ================================================================== */}

      <div
        className="
          mb-6 flex gap-1
          overflow-x-auto
          border-b border-slate-200
        "
        role="tablist"
      >
        {TABS.map(
          (tabName, index) => (
            <button
              key={tabName}
              type="button"
              role="tab"
              aria-selected={
                tab === index
              }
              onClick={() =>
                setTab(index)
              }
              className={`
                -mb-px
                whitespace-nowrap
                border-b-2
                px-5 py-3
                text-sm font-semibold
                transition-colors
                ${
                  tab === index
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                }
              `}
            >
              {tabName}
            </button>
          )
        )}
      </div>

      {/* ================================================================== */}
      {/* Content                                                            */}
      {/* ================================================================== */}

      {tab === 0 && (
        <DailyAttendance
          showToast={stableToast}
        />
      )}

      {tab === 1 && (
        <LeaveRequests
          showToast={stableToast}
        />
      )}

      {tab === 2 && (
        <LeaveCategories
          showToast={stableToast}
        />
      )}
    </DashboardLayout>
  );
};

export default AttendanceLeave;
