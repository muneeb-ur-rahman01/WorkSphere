
import { useCallback, useEffect, useMemo, useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  History,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
  XCircle,
  Wallet,
} from 'lucide-react';

import api from '../../../Config/apiConfig';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { AppContext } from '../../../context/AppContext';

import {
  MONTH_NAMES,
  apiError,
  fmtDate,
  money,
  payrollCsvName,
  toneFor,
  useToast,
} from '../../../utils/hrFormat';

import { useLookups } from '../../../utils/moduleHooks';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const thisYear = new Date().getFullYear();

const YEARS = Array.from(
  { length: 8 },
  (_, i) => thisYear + 1 - i
);

const monthOpts = MONTH_NAMES.map((month, index) => ({
  value: index + 1,
  label: month,
}));

const yearOpts = YEARS.map((year) => ({
  value: year,
  label: year,
}));

const today = () => new Date().toISOString().slice(0, 10);

/* -------------------------------------------------------------------------- */
/* Tailwind styles                                                            */
/* -------------------------------------------------------------------------- */

const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const SELECT_CLASS =
  'w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const LABEL_CLASS =
  'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600';

const CARD_CLASS =
  'w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm';

const PRIMARY_BUTTON =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50';

const OUTLINE_BUTTON =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

const SUCCESS_BUTTON =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50';

const DANGER_BUTTON =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50';

const ICON_BUTTON =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40';

/* -------------------------------------------------------------------------- */
/* Employee Avatar                                                            */
/* -------------------------------------------------------------------------- */

const EmployeeAvatar = ({ name }) => {
  const initial =
    name?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700">
      {initial}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Toast                                                                      */
/* -------------------------------------------------------------------------- */

const LocalToast = ({ toast }) => {
  if (!toast) return null;

  const success = toast.type === 'success';

  return (
    <div
      className="fixed right-5 top-5 z-[99999]"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex w-[calc(100vw-2rem)] max-w-sm items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-2xl ${
          success ? 'border-emerald-200' : 'border-red-200'
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            success ? 'bg-emerald-50' : 'bg-red-50'
          }`}
        >
          {success ? (
            <CheckCircle2
              size={21}
              className="text-emerald-600"
            />
          ) : (
            <XCircle
              size={21}
              className="text-red-600"
            />
          )}
        </div>

        <p className="text-sm font-semibold text-slate-800">
          {toast.message}
        </p>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Pill                                                                       */
/* -------------------------------------------------------------------------- */

const Pill = ({ tone = 'slate', children }) => {
  const tones = {
    green:
      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    red:
      'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    amber:
      'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    orange:
      'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
    blue:
      'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    lime:
      'bg-lime-50 text-lime-700 ring-1 ring-inset ring-lime-200',
    slate:
      'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
        tones[tone] || tones.slate
      }`}
    >
      {children}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '720px',
}) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {title}
            </h3>

            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={ICON_BUTTON}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Form fields                                                                */
/* -------------------------------------------------------------------------- */

const Field = ({
  label,
  type = 'text',
  value,
  onChange,
  options = [],
  placeholder,
  required = false,
  min,
  max,
  step,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className={LABEL_CLASS}>
          {label}
          {required && (
            <span className="ml-1 text-red-500">*</span>
          )}
        </label>
      )}

      {type === 'select' ? (
        <div className="relative">
          <select
            value={value ?? ''}
            onChange={onChange}
            disabled={disabled}
            className={SELECT_CLASS}
          >
            {options.map((option, index) => {
              const item =
                typeof option === 'object'
                  ? option
                  : {
                      value: option,
                      label: option,
                    };

              return (
                <option
                  key={`${item.value}-${index}`}
                  value={item.value}
                >
                  {item.label}
                </option>
              );
            })}
          </select>

          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

const Card = ({
  title,
  subtitle,
  actions,
  children,
}) => {
  return (
    <section className={CARD_CLASS}>
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {children}
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Table                                                                      */
/* -------------------------------------------------------------------------- */

const Table = ({
  headers = [],
  data = [],
  renderRow,
  emptyMessage = 'No records found.',
}) => {
  return (
    <div className="w-full overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="whitespace-nowrap px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 first:pl-6 last:pr-6"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? (
              data.map((item, index) =>
                renderRow(item, index)
              )
            ) : (
              <tr>
                <td
                  colSpan={headers.length || 1}
                  className="px-6 py-0 text-center"
                >
                  <div className="flex min-h-[220px] flex-col items-center justify-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                      <FileText size={22} />
                    </div>

                    <p className="text-sm font-bold text-slate-800">
                      {emptyMessage}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      There are no records available to
                      display.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Salary Structures                                                          */
/* -------------------------------------------------------------------------- */

const Structures = ({ toast }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [form, setForm] = useState(null);
  const [history, setHistory] = useState(null);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;

    api
      .get('/payroll/overview')
      .then((response) => {
        if (!alive) return;

        setRows(response.data.rows || []);
        setLoading(false);
      })
      .catch((error) => {
        if (!alive) return;

        setLoading(false);
        toast(apiError(error), 'error');
      });

    return () => {
      alive = false;
    };
  }, [tick, toast]);

  const openSalaryForm = (row) => {
    setError('');

    setForm({
      employeeId: row.employeeId,
      name: row.fullName,
      basicSalary: row.basicSalary ?? '',
      effectiveFrom: today(),
      note: '',
    });
  };

  const saveSalary = async (event) => {
    event.preventDefault();

    if (saving || !form) return;

    if (
      form.basicSalary === '' ||
      Number.isNaN(Number(form.basicSalary)) ||
      Number(form.basicSalary) < 0
    ) {
      setError('Please enter a valid basic salary.');
      return;
    }

    if (!form.effectiveFrom) {
      setError('Please select an effective date.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.post('/payroll/salaries', {
        employeeId: form.employeeId,
        basicSalary: Number(form.basicSalary),
        effectiveFrom: form.effectiveFrom,
        note: form.note || undefined,
      });

      setForm(null);
      setTick((value) => value + 1);

      toast('Salary saved successfully.');
    } catch (error) {
      setError(apiError(error));
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (row) => {
    try {
      const response = await api.get('/payroll/salaries', {
        params: {
          employeeId: row.employeeId,
        },
      });

      setHistory({
        row,
        rows: response.data.salaries || [],
      });
    } catch (error) {
      toast(apiError(error), 'error');
    }
  };

  return (
    <>
      <Card
        title="Salary structures"
        subtitle="Current basic salary, recurring allowances and deductions."
      >
        <Table
          headers={[
            'Employee',
            'Department',
            'Basic salary',
            'Allowances',
            'Deductions',
            'Est. net',
            '',
          ]}
          data={rows}
          emptyMessage={
            loading
              ? 'Loading…'
              : 'No employees yet.'
          }
          renderRow={(row) => (
            <tr
              key={row.employeeId}
              className="transition hover:bg-slate-50/80"
            >
              <td className="px-5 py-4 pl-6">
                <div className="flex items-center gap-3">
                  <EmployeeAvatar
                    name={row.fullName}
                  />

                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      {row.fullName}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {row.employeeCode} ·{' '}
                      {row.designation || '—'}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 text-slate-600">
                {row.department || '—'}
              </td>

              <td className="px-5 py-4 font-medium text-slate-800">
                {row.basicSalary === null ? (
                  <Pill tone="amber">Not set</Pill>
                ) : (
                  money(row.basicSalary)
                )}
              </td>

              <td className="px-5 py-4 text-slate-600">
                {money(row.allowances)}
              </td>

              <td className="px-5 py-4 text-slate-600">
                {money(row.deductions)}
              </td>

              <td className="px-5 py-4 font-bold text-slate-900">
                {money(row.net)}
              </td>

              <td className="px-5 py-4 pr-6">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={PRIMARY_BUTTON}
                    onClick={() => openSalaryForm(row)}
                  >
                    <Pencil size={15} />

                    {row.basicSalary === null
                      ? 'Set salary'
                      : 'Revise'}
                  </button>

                  <button
                    type="button"
                    className={OUTLINE_BUTTON}
                    onClick={() => openHistory(row)}
                  >
                    <History size={15} />
                    History
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      </Card>

      <Modal
        isOpen={!!form}
        onClose={() => !saving && setForm(null)}
        title={
          form ? `Salary — ${form.name}` : ''
        }
        subtitle="Update the employee's monthly basic salary."
        maxWidth="500px"
      >
        {form && (
          <form
            onSubmit={saveSalary}
            className="space-y-4"
          >
            <Field
              label="Basic salary (monthly)"
              type="number"
              min="0"
              step="0.01"
              value={form.basicSalary}
              onChange={(event) =>
                setForm({
                  ...form,
                  basicSalary: event.target.value,
                })
              }
              required
            />

            <Field
              label="Effective from"
              type="date"
              value={form.effectiveFrom}
              onChange={(event) =>
                setForm({
                  ...form,
                  effectiveFrom:
                    event.target.value,
                })
              }
              required
            />

            <Field
              label="Note"
              value={form.note}
              onChange={(event) =>
                setForm({
                  ...form,
                  note: event.target.value,
                })
              }
              placeholder="Optional note..."
            />

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs leading-5 text-blue-700">
                Each salary change is kept as history.
                Payroll uses the salary effective in the
                selected payroll month.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className={OUTLINE_BUTTON}
                onClick={() => setForm(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={PRIMARY_BUTTON}
                disabled={saving}
              >
                {saving && (
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                )}

                {saving ? 'Saving…' : 'Save salary'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!history}
        onClose={() => setHistory(null)}
        title={
          history
            ? `Salary history — ${history.row.fullName}`
            : ''
        }
        subtitle="Previous salary changes for this employee."
        maxWidth="700px"
      >
        {history && (
          <Table
            headers={[
              'Effective from',
              'Basic salary',
              'Note',
            ]}
            data={history.rows}
            emptyMessage="No salary history."
            renderRow={(salary) => (
              <tr
                key={salary.id}
                className="hover:bg-slate-50"
              >
                <td className="px-5 py-4">
                  {fmtDate(salary.effectiveFrom)}
                </td>

                <td className="px-5 py-4 font-semibold">
                  {money(salary.basicSalary)}
                </td>

                <td className="px-5 py-4 text-slate-500">
                  {salary.note || '—'}
                </td>
              </tr>
            )}
          />
        )}
      </Modal>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Payroll Runs                                                               */
/* -------------------------------------------------------------------------- */

const Runs = ({ toast }) => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [createForm, setCreateForm] = useState(null);
  const [openRun, setOpenRun] = useState(null);
  const [paymentForm, setPaymentForm] = useState(null);

  const [adjustment, setAdjustment] = useState(null);
  const [deleteRun, setDeleteRun] = useState(null);

  const [busy, setBusy] = useState('');

  const reload = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    let alive = true;

    api
      .get('/payroll/runs')
      .then((response) => {
        if (!alive) return;

        setRuns(response.data.runs || []);
        setLoading(false);
      })
      .catch((error) => {
        if (!alive) return;

        setLoading(false);
        toast(apiError(error), 'error');
      });

    return () => {
      alive = false;
    };
  }, [tick, toast]);

  const action = async (
    key,
    request,
    successMessage
  ) => {
    if (busy) return null;

    setBusy(key);

    try {
      const response = await request();

      reload();

      if (successMessage) {
        toast(
          typeof successMessage === 'function'
            ? successMessage(response)
            : successMessage
        );
      }

      return response;
    } catch (error) {
      toast(apiError(error), 'error');
      return null;
    } finally {
      setBusy('');
    }
  };

  const openRecords = async (run) => {
    try {
      const response = await api.get(
        `/payroll/runs/${run.id}/records`
      );

      setOpenRun({
        run,
        records: response.data.records || [],
      });
    } catch (error) {
      toast(apiError(error), 'error');
    }
  };

  const saveAdjustment = async () => {
    if (!adjustment) return;

    setBusy('adjust');

    try {
      await api.patch(
        `/payroll/records/${adjustment.record.id}`,
        {
          allowances: Number(
            adjustment.allowances
          ),
          deductions: Number(
            adjustment.deductions
          ),
        }
      );

      toast('Payroll record adjusted.');

      const response = await api.get(
        `/payroll/runs/${openRun.run.id}/records`
      );

      setOpenRun({
        ...openRun,
        records: response.data.records || [],
      });

      setAdjustment(null);
      reload();
    } catch (error) {
      toast(apiError(error), 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <Card
        title="Monthly payroll runs"
        subtitle="Draft → Processed → Paid."
        actions={
          <button
            type="button"
            className={PRIMARY_BUTTON}
            onClick={() =>
              setCreateForm({
                month:
                  new Date().getMonth() + 1,
                year: thisYear,
              })
            }
          >
            <Plus size={16} />
            New payroll run
          </button>
        }
      >
        <Table
          headers={[
            'Period',
            'Status',
            'Gross',
            'Deductions',
            'Net payable',
            'Finance',
            '',
          ]}
          data={runs}
          emptyMessage={
            loading
              ? 'Loading…'
              : 'No payroll runs yet.'
          }
          renderRow={(run) => (
            <tr
              key={run.id}
              className="transition hover:bg-slate-50/80"
            >
              <td className="px-5 py-4 pl-6 font-semibold text-slate-800">
                {run.period}
              </td>

              <td className="px-5 py-4">
                <Pill tone={toneFor(run.status)}>
                  {run.status}
                </Pill>
              </td>

              <td className="px-5 py-4 text-slate-600">
                {money(run.totalGross)}
              </td>

              <td className="px-5 py-4 text-slate-600">
                {money(run.totalDeductions)}
              </td>

              <td className="px-5 py-4 font-bold text-slate-900">
                {money(run.totalNet)}
              </td>

              <td className="px-5 py-4">
                {run.status === 'Draft' ? (
                  <span className="text-slate-400">
                    —
                  </span>
                ) : run.synced ? (
                  <Pill
                    tone={
                      run.consistent
                        ? 'green'
                        : 'red'
                    }
                  >
                    {run.consistent
                      ? 'Posted'
                      : 'Mismatch'}
                  </Pill>
                ) : (
                  <Pill tone="amber">
                    Not posted
                  </Pill>
                )}
              </td>

              <td className="px-5 py-4 pr-6">
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className={OUTLINE_BUTTON}
                    onClick={() =>
                      openRecords(run)
                    }
                  >
                    <FileText size={15} />
                    Records
                  </button>

                  {run.status === 'Draft' && (
                    <>
                      <button
                        type="button"
                        className={OUTLINE_BUTTON}
                        disabled={!!busy}
                        onClick={() =>
                          action(
                            `regenerate-${run.id}`,
                            () =>
                              api.post(
                                `/payroll/runs/${run.id}/regenerate`
                              ),
                            'Payroll regenerated from current salaries.'
                          )
                        }
                      >
                        <RefreshCw size={15} />
                        Regenerate
                      </button>

                      <button
                        type="button"
                        className={SUCCESS_BUTTON}
                        disabled={!!busy}
                        onClick={() =>
                          action(
                            `process-${run.id}`,
                            () =>
                              api.post(
                                `/payroll/runs/${run.id}/process`
                              ),
                            'Payroll processed and posted to finance.'
                          )
                        }
                      >
                        <CheckCircle2 size={15} />
                        Process
                      </button>

                      <button
                        type="button"
                        className={`${ICON_BUTTON} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
                        disabled={!!busy}
                        onClick={() =>
                          setDeleteRun(run)
                        }
                        title="Delete draft"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}

                  {run.status === 'Processed' && (
                    <button
                      type="button"
                      className={SUCCESS_BUTTON}
                      onClick={() =>
                        setPaymentForm({
                          run,
                          recordIds:
                            undefined,
                          date: today(),
                          ref: '',
                        })
                      }
                    >
                      <Wallet size={15} />
                      Mark all paid
                    </button>
                  )}

                  {run.status !== 'Draft' &&
                    !run.synced && (
                      <button
                        type="button"
                        className={OUTLINE_BUTTON}
                        disabled={!!busy}
                        onClick={() =>
                          action(
                            `sync-${run.id}`,
                            () =>
                              api.post(
                                `/payroll/runs/${run.id}/sync`
                              ),
                            'Posted to finance.'
                          )
                        }
                      >
                        <RefreshCw size={15} />
                        Post to finance
                      </button>
                    )}
                </div>
              </td>
            </tr>
          )}
        />
      </Card>

      <Modal
        isOpen={!!createForm}
        onClose={() => setCreateForm(null)}
        title="New payroll run"
        subtitle="Generate a draft payroll for the selected period."
        maxWidth="500px"
      >
        {createForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Month"
                type="select"
                value={createForm.month}
                onChange={(event) =>
                  setCreateForm({
                    ...createForm,
                    month: Number(
                      event.target.value
                    ),
                  })
                }
                options={monthOpts}
              />

              <Field
                label="Year"
                type="select"
                value={createForm.year}
                onChange={(event) =>
                  setCreateForm({
                    ...createForm,
                    year: Number(
                      event.target.value
                    ),
                  })
                }
                options={yearOpts}
              />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs leading-5 text-blue-700">
                Generates a draft for every payable
                employee who has a salary. Allowances
                and deductions are calculated from
                active components.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className={OUTLINE_BUTTON}
                onClick={() =>
                  setCreateForm(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={PRIMARY_BUTTON}
                disabled={!!busy}
                onClick={async () => {
                  const response =
                    await action(
                      'create-run',
                      () =>
                        api.post(
                          '/payroll/runs',
                          createForm
                        ),
                      (result) =>
                        `Draft created for ${
                          result.data.count
                        } employees${
                          result.data.skipped
                            ?.length
                            ? ` (${result.data.skipped.length} skipped: no salary)`
                            : ''
                        }.`
                    );

                  if (response) {
                    setCreateForm(null);
                  }
                }}
              >
                {busy === 'create-run' && (
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                )}

                Generate draft
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteRun}
        onClose={() => setDeleteRun(null)}
        title="Delete payroll draft?"
        subtitle="This action cannot be undone."
        maxWidth="430px"
      >
        {deleteRun && (
          <div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm leading-6 text-red-800">
                Are you sure you want to delete the
                payroll draft for{' '}
                <strong>{deleteRun.period}</strong>?
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={OUTLINE_BUTTON}
                onClick={() => setDeleteRun(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={DANGER_BUTTON}
                disabled={!!busy}
                onClick={async () => {
                  const response =
                    await action(
                      `delete-${deleteRun.id}`,
                      () =>
                        api.delete(
                          `/payroll/runs/${deleteRun.id}`
                        ),
                      'Draft deleted.'
                    );

                  if (response) {
                    setDeleteRun(null);
                  }
                }}
              >
                <Trash2 size={15} />
                Delete draft
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!paymentForm}
        onClose={() => setPaymentForm(null)}
        title="Record payment"
        subtitle="Record payment against this payroll."
        maxWidth="500px"
      >
        {paymentForm && (
          <div className="space-y-4">
            <Field
              label="Payment date"
              type="date"
              value={paymentForm.date}
              onChange={(event) =>
                setPaymentForm({
                  ...paymentForm,
                  date: event.target.value,
                })
              }
              required
            />

            <Field
              label="Transaction reference"
              value={paymentForm.ref}
              onChange={(event) =>
                setPaymentForm({
                  ...paymentForm,
                  ref: event.target.value,
                })
              }
              placeholder="Optional transaction reference"
            />

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className={OUTLINE_BUTTON}
                onClick={() =>
                  setPaymentForm(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={SUCCESS_BUTTON}
                disabled={!!busy}
                onClick={async () => {
                  const response =
                    await action(
                      'pay',
                      () =>
                        api.post(
                          `/payroll/runs/${paymentForm.run.id}/pay`,
                          {
                            recordIds:
                              paymentForm.recordIds,
                            paymentDate:
                              paymentForm.date,
                            transactionReference:
                              paymentForm.ref ||
                              undefined,
                          }
                        ),
                      (result) =>
                        `${result.data.updated} payment(s) recorded.`
                    );

                  if (response) {
                    setPaymentForm(null);
                  }
                }}
              >
                <CheckCircle2 size={15} />
                Confirm paid
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!openRun}
        onClose={() => setOpenRun(null)}
        title={
          openRun
            ? `Payroll records — ${openRun.run.period}`
            : ''
        }
        subtitle="Review and manage individual payroll records."
        maxWidth="1250px"
      >
        {openRun && (
          <Table
            headers={[
              'Employee',
              'Basic',
              'Allowances',
              'Deductions',
              'Gross',
              'Net',
              'Payment',
              '',
            ]}
            data={openRun.records}
            emptyMessage="No records."
            renderRow={(record) => (
              <tr
                key={record.id}
                className="transition hover:bg-slate-50/80"
              >
                <td className="px-5 py-4 pl-6">
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar
                      name={record.employeeName}
                    />

                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        {record.employeeName}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {record.employeeCode}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4">
                  {money(record.basicSalary)}
                </td>

                <td className="px-5 py-4">
                  {money(record.allowances)}
                </td>

                <td className="px-5 py-4">
                  {money(record.deductions)}
                </td>

                <td className="px-5 py-4">
                  {money(record.grossSalary)}
                </td>

                <td className="px-5 py-4 font-bold text-slate-900">
                  {money(record.netSalary)}
                </td>

                <td className="px-5 py-4">
                  {record.paymentStatus ===
                  'Paid' ? (
                    <div>
                      <Pill tone="green">
                        Paid
                      </Pill>

                      <span className="mt-1 block whitespace-nowrap text-xs text-slate-400">
                        {fmtDate(
                          record.paymentDate
                        )}

                        {record.transactionReference
                          ? ` · ${record.transactionReference}`
                          : ''}
                      </span>
                    </div>
                  ) : (
                    <Pill
                      tone={toneFor(
                        record.paymentStatus
                      )}
                    >
                      {record.paymentStatus}
                    </Pill>
                  )}
                </td>

                <td className="px-5 py-4 pr-6">
                  <div className="flex justify-end gap-2">
                    {openRun.run.status ===
                      'Draft' && (
                      <button
                        type="button"
                        className={OUTLINE_BUTTON}
                        onClick={() =>
                          setAdjustment({
                            record,
                            allowances:
                              record.allowances ??
                              0,
                            deductions:
                              record.deductions ??
                              0,
                          })
                        }
                      >
                        <Pencil size={15} />
                        Adjust
                      </button>
                    )}

                    {openRun.run.status !==
                      'Draft' &&
                      record.paymentStatus !==
                        'Paid' && (
                        <button
                          type="button"
                          className={SUCCESS_BUTTON}
                          onClick={() =>
                            setPaymentForm({
                              run: openRun.run,
                              recordIds: [
                                record.id,
                              ],
                              date: today(),
                              ref: '',
                            })
                          }
                        >
                          <Wallet size={15} />
                          Mark paid
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            )}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!adjustment}
        onClose={() => setAdjustment(null)}
        title="Adjust payroll record"
        subtitle={
          adjustment
            ? adjustment.record.employeeName
            : ''
        }
        maxWidth="520px"
      >
        {adjustment && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {adjustment.record.employeeName}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {adjustment.record.employeeCode}
                  </p>
                </div>

                <Pill tone="blue">
                  Draft payroll
                </Pill>
              </div>
            </div>

            <Field
              label="Allowances"
              type="number"
              min="0"
              step="0.01"
              value={adjustment.allowances}
              onChange={(event) =>
                setAdjustment({
                  ...adjustment,
                  allowances:
                    event.target.value,
                })
              }
            />

            <Field
              label="Deductions"
              type="number"
              min="0"
              step="0.01"
              value={adjustment.deductions}
              onChange={(event) =>
                setAdjustment({
                  ...adjustment,
                  deductions:
                    event.target.value,
                })
              }
            />

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className={OUTLINE_BUTTON}
                onClick={() =>
                  setAdjustment(null)
                }
                disabled={busy === 'adjust'}
              >
                Cancel
              </button>

              <button
                type="button"
                className={PRIMARY_BUTTON}
                disabled={busy === 'adjust'}
                onClick={saveAdjustment}
              >
                {busy === 'adjust' && (
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                )}

                Save adjustment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Payroll Records                                                            */
/* -------------------------------------------------------------------------- */

const Records = ({ toast, lookups }) => {
  const [filters, setFilters] = useState({
    month: '',
    year: '',
    departmentId: '',
    employeeId: '',
    paymentStatus: '',
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== ''
        )
      ),
    [filters]
  );

  useEffect(() => {
    let alive = true;

    setLoading(true);

    api
      .get('/payroll/records', {
        params,
      })
      .then((response) => {
        if (!alive) return;

        setRows(response.data.records || []);
        setLoading(false);
      })
      .catch((error) => {
        if (!alive) return;

        setLoading(false);
        toast(apiError(error), 'error');
      });

    return () => {
      alive = false;
    };
  }, [params, toast]);

  const totals = rows.reduce(
    (total, row) => ({
      gross:
        total.gross +
        Number(row.grossSalary || 0),
      net:
        total.net +
        Number(row.netSalary || 0),
    }),
    {
      gross: 0,
      net: 0,
    }
  );

  const exportCsv = async () => {
    if (exporting) return;

    setExporting(true);

    try {
      const response = await api.get(
        '/payroll/export.csv',
        {
          params,
          responseType: 'blob',
          timeout: 300000,
        }
      );

      const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8',
      });

      const url = URL.createObjectURL(blob);

      const anchor =
        document.createElement('a');

      anchor.href = url;
      anchor.download = payrollCsvName({
        month: Number(filters.month) || '',
        year: Number(filters.year) || '',
      });

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 5000);

      toast('Payroll CSV downloaded.');
    } catch (error) {
      let message = apiError(
        error,
        'Could not export payroll.'
      );

      const responseData = error?.response?.data;

      if (responseData instanceof Blob) {
        try {
          const text =
            await responseData.text();

          message =
            JSON.parse(text).error || message;
        } catch {
          // Keep default error.
        }
      }

      toast(message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const FilterSelect = ({
    value,
    onChange,
    options,
    label,
  }) => (
    <div className="relative min-w-[175px]">
      <select
        value={value}
        onChange={onChange}
        aria-label={label}
        className={SELECT_CLASS}
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

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );

  return (
    <Card
      title="Payroll records & export"
      subtitle="Export exactly the records matching your selected filters."
      actions={
        <button
          type="button"
          className={SUCCESS_BUTTON}
          onClick={exportCsv}
          disabled={exporting}
        >
          {exporting ? (
            <RefreshCw
              size={15}
              className="animate-spin"
            />
          ) : (
            <Download size={15} />
          )}

          {exporting
            ? 'Exporting…'
            : 'Export CSV'}
        </button>
      }
    >
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            value={filters.month}
            onChange={(event) =>
              setFilters({
                ...filters,
                month: event.target.value,
              })
            }
            label="Month"
            options={[
              {
                value: '',
                label: 'All months',
              },
              ...monthOpts,
            ]}
          />

          <FilterSelect
            value={filters.year}
            onChange={(event) =>
              setFilters({
                ...filters,
                year: event.target.value,
              })
            }
            label="Year"
            options={[
              {
                value: '',
                label: 'All years',
              },
              ...yearOpts,
            ]}
          />

          <FilterSelect
            value={filters.departmentId}
            onChange={(event) =>
              setFilters({
                ...filters,
                departmentId:
                  event.target.value,
              })
            }
            label="Department"
            options={[
              {
                value: '',
                label: 'All departments',
              },
              ...(lookups.departments || []),
            ]}
          />

          <FilterSelect
            value={filters.employeeId}
            onChange={(event) =>
              setFilters({
                ...filters,
                employeeId:
                  event.target.value,
              })
            }
            label="Employee"
            options={[
              {
                value: '',
                label: 'All employees',
              },
              ...(lookups.employees || []),
            ]}
          />

          <FilterSelect
            value={filters.paymentStatus}
            onChange={(event) =>
              setFilters({
                ...filters,
                paymentStatus:
                  event.target.value,
              })
            }
            label="Payment status"
            options={[
              {
                value: '',
                label:
                  'All payment statuses',
              },
              {
                value: 'Pending',
                label: 'Pending',
              },
              {
                value: 'Paid',
                label: 'Paid',
              },
              {
                value: 'Failed',
                label: 'Failed',
              },
            ]}
          />
        </div>
      </div>

      <Table
        headers={[
          'Employee',
          'Department',
          'Period',
          'Basic',
          'Allow.',
          'Deduct.',
          'Gross',
          'Net',
          'Payment',
        ]}
        data={rows}
        emptyMessage={
          loading
            ? 'Loading…'
            : 'No payroll records match these filters.'
        }
        renderRow={(row) => (
          <tr
            key={row.id}
            className="transition hover:bg-slate-50/80"
          >
            <td className="px-5 py-4 pl-6">
              <div className="flex items-center gap-3">
                <EmployeeAvatar
                  name={row.employeeName}
                />

                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {row.employeeName}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    {row.employeeCode}
                  </p>
                </div>
              </div>
            </td>

            <td className="px-5 py-4 text-slate-600">
              {row.departmentName || '—'}
            </td>

            <td className="px-5 py-4 text-slate-600">
              {MONTH_NAMES[row.payrollMonth - 1]}{' '}
              {row.payrollYear}
            </td>

            <td className="px-5 py-4">
              {money(row.basicSalary)}
            </td>

            <td className="px-5 py-4">
              {money(row.allowances)}
            </td>

            <td className="px-5 py-4">
              {money(row.deductions)}
            </td>

            <td className="px-5 py-4">
              {money(row.grossSalary)}
            </td>

            <td className="px-5 py-4 font-bold text-slate-900">
              {money(row.netSalary)}
            </td>

            <td className="px-5 py-4 pr-6">
              <Pill
                tone={toneFor(
                  row.paymentStatus
                )}
              >
                {row.paymentStatus}
              </Pill>
            </td>
          </tr>
        )}
      />

      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <span>
            <strong className="text-slate-900">
              {rows.length}
            </strong>{' '}
            record(s)
          </span>

          <span className="text-slate-300">
            ·
          </span>

          <span>
            Gross{' '}
            <strong className="text-slate-900">
              {money(totals.gross)}
            </strong>
          </span>

          <span className="text-slate-300">
            ·
          </span>

          <span>
            Net{' '}
            <strong className="text-slate-900">
              {money(totals.net)}
            </strong>
          </span>
        </div>
      </div>
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/* Salary Components                                                          */
/* -------------------------------------------------------------------------- */

const SalaryComponents = ({
  lookups,
  toast,
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [filters, setFilters] = useState({
    employeeId: '',
    kind: '',
  });

  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] =
    useState(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== ''
        )
      );

      const response = await api.get(
        '/hrm/salary-components',
        { params }
      );

      setRows(response.data.rows || []);
    } catch (error) {
      toast(apiError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    load();
  }, [load, tick]);

  const openCreate = () => {
    setEditing(null);
    setError('');

    setForm({
      employeeId: '',
      kind: 'Allowance',
      name: '',
      amount: '',
      isActive: true,
    });
  };

  const openEdit = (row) => {
    setEditing(row);
    setError('');

    setForm({
      employeeId: row.employeeId ?? '',
      kind: row.kind ?? 'Allowance',
      name: row.name ?? '',
      amount: row.amount ?? '',
      isActive: !!row.isActive,
    });
  };

  const save = async (event) => {
    event.preventDefault();

    if (saving || !form) return;

    if (!form.employeeId) {
      setError('Please select an employee.');
      return;
    }

    if (!form.name.trim()) {
      setError('Please enter a component name.');
      return;
    }

    if (
      form.amount === '' ||
      Number.isNaN(Number(form.amount)) ||
      Number(form.amount) <= 0
    ) {
      setError(
        'Enter a valid amount greater than zero.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        employeeId: form.employeeId,
        kind: form.kind,
        name: form.name.trim(),
        amount: Number(form.amount),
        isActive: !!form.isActive,
      };

      if (editing) {
        await api.patch(
          `/hrm/salary-components/${editing.id}`,
          payload
        );

        toast('Component updated successfully.');
      } else {
        await api.post(
          '/hrm/salary-components',
          payload
        );

        toast('Component added successfully.');
      }

      setForm(null);
      setEditing(null);
      setTick((value) => value + 1);
    } catch (error) {
      setError(apiError(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteComponent = async () => {
    if (!confirmDelete) return;

    try {
      await api.delete(
        `/hrm/salary-components/${confirmDelete.id}`
      );

      toast('Component deleted successfully.');

      setConfirmDelete(null);
      setTick((value) => value + 1);
    } catch (error) {
      toast(apiError(error), 'error');
    }
  };

  return (
    <>
      <Card
        title="Recurring allowances & deductions"
        subtitle="Manage monthly salary components for employees."
        actions={
          <button
            type="button"
            className={PRIMARY_BUTTON}
            onClick={openCreate}
          >
            <Plus size={16} />
            Add component
          </button>
        }
      >
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="relative min-w-[220px]">
            <select
              value={filters.employeeId}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  employeeId:
                    event.target.value,
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">
                All employees
              </option>

              {(lookups.employees || []).map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="relative min-w-[180px]">
            <select
              value={filters.kind}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  kind: event.target.value,
                })
              }
              className={SELECT_CLASS}
            >
              <option value="">
                All types
              </option>

              <option value="Allowance">
                Allowance
              </option>

              <option value="Deduction">
                Deduction
              </option>
            </select>

            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>

        <Table
          headers={[
            'Employee',
            'Type',
            'Name',
            'Amount / month',
            'Active',
            '',
          ]}
          data={rows}
          emptyMessage={
            loading
              ? 'Loading…'
              : 'No salary components found.'
          }
          renderRow={(row) => (
            <tr
              key={row.id}
              className="transition hover:bg-slate-50/80"
            >
              <td className="px-5 py-4 pl-6">
                <div className="flex items-center gap-3">
                  <EmployeeAvatar
                    name={row.employeeName}
                  />

                  <span className="font-semibold text-slate-800">
                    {row.employeeName || '—'}
                  </span>
                </div>
              </td>

              <td className="px-5 py-4">
                <Pill
                  tone={
                    row.kind === 'Allowance'
                      ? 'green'
                      : 'orange'
                  }
                >
                  {row.kind}
                </Pill>
              </td>

              <td className="px-5 py-4 text-slate-700">
                {row.name}
              </td>

              <td className="px-5 py-4 font-semibold text-slate-800">
                {money(row.amount)}
              </td>

              <td className="px-5 py-4">
                {row.isActive ? (
                  <Pill tone="green">
                    Active
                  </Pill>
                ) : (
                  <Pill tone="slate">
                    Inactive
                  </Pill>
                )}
              </td>

              <td className="px-5 py-4 pr-6">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    onClick={() =>
                      openEdit(row)
                    }
                    title="Edit component"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    className={`${ICON_BUTTON} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
                    onClick={() =>
                      setConfirmDelete(row)
                    }
                    title="Delete component"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      </Card>

      <Modal
        isOpen={!!form}
        onClose={() =>
          !saving && setForm(null)
        }
        title={
          editing
            ? 'Edit salary component'
            : 'Add salary component'
        }
        subtitle="Configure a recurring monthly allowance or deduction."
        maxWidth="600px"
      >
        {form && (
          <form
            onSubmit={save}
            className="space-y-4"
          >
            <Field
              label="Employee"
              type="select"
              value={form.employeeId}
              onChange={(event) =>
                setForm({
                  ...form,
                  employeeId:
                    event.target.value,
                })
              }
              options={[
                {
                  value: '',
                  label: 'Select employee',
                },
                ...(lookups.employees || []),
              ]}
              disabled={!!editing}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Type"
                type="select"
                value={form.kind}
                onChange={(event) =>
                  setForm({
                    ...form,
                    kind: event.target.value,
                  })
                }
                options={[
                  {
                    value: 'Allowance',
                    label: 'Allowance',
                  },
                  {
                    value: 'Deduction',
                    label: 'Deduction',
                  },
                ]}
                required
              />

              <Field
                label="Amount per month"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm({
                    ...form,
                    amount:
                      event.target.value,
                  })
                }
                required
              />
            </div>

            <Field
              label="Name"
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                })
              }
              placeholder="e.g. House Rent, Tax, Transport"
              required
            />

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(event) =>
                  setForm({
                    ...form,
                    isActive:
                      event.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Active component
                </span>

                <span className="block text-xs text-slate-500">
                  Include this component in payroll
                  calculations.
                </span>
              </span>
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className={OUTLINE_BUTTON}
                onClick={() => setForm(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={PRIMARY_BUTTON}
                disabled={saving}
              >
                {saving && (
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                )}

                {saving
                  ? 'Saving…'
                  : editing
                    ? 'Update component'
                    : 'Add component'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!confirmDelete}
        onClose={() =>
          setConfirmDelete(null)
        }
        title="Delete component?"
        subtitle="This action cannot be undone."
        maxWidth="430px"
      >
        {confirmDelete && (
          <div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm leading-6 text-red-800">
                Are you sure you want to delete{' '}
                <strong>
                  {confirmDelete.name}
                </strong>
                ?
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={OUTLINE_BUTTON}
                onClick={() =>
                  setConfirmDelete(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={DANGER_BUTTON}
                onClick={deleteComponent}
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Tabs                                                                       */
/* -------------------------------------------------------------------------- */

const PayrollTabs = ({ tabs }) => {
  const [activeTab, setActiveTab] =
    useState(0);

  return (
    <div className="w-full">
      <div className="mb-5 w-full overflow-x-auto">
        <div className="flex w-full min-w-max rounded-2xl border border-slate-200 bg-slate-100 p-1">
          {tabs.map((tab, index) => {
            const active =
              activeTab === index;

            return (
              <button
                key={tab.label}
                type="button"
                onClick={() =>
                  setActiveTab(index)
                }
                className={`flex-1 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

const PayrollSalary = () => {
  const { currentUser } =
    useContext(AppContext);

  const lookups = useLookups([
    'employees',
    'departments',
  ]);

  const [toast, showToast] = useToast();

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
      <LocalToast toast={toast} />

      <div className="w-full space-y-5">
        <div className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <Lock size={12} />
                Confidential
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Payroll & Salary Management
              </h1>

              <p className="mt-1 max-w-none text-sm text-slate-500">
                Manage salary structures, allowances,
                deductions, monthly payroll and finance
                exports.
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-3 sm:flex">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Wallet size={18} />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Module
                  </p>

                  <p className="text-sm font-semibold text-slate-700">
                    Payroll
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PayrollTabs
          tabs={[
            {
              label: 'Salary Structures',
              content: (
                <Structures
                  toast={showToast}
                />
              ),
            },
            {
              label:
                'Allowances & Deductions',
              content: (
                <SalaryComponents
                  lookups={lookups}
                  toast={showToast}
                />
              ),
            },
            {
              label: 'Monthly Payroll',
              content: (
                <Runs toast={showToast} />
              ),
            },
            {
              label:
                'Records & CSV Export',
              content: (
                <Records
                  toast={showToast}
                  lookups={lookups}
                />
              ),
            },
          ]}
        />
      </div>
    </DashboardLayout>
  );
};

export default PayrollSalary;
