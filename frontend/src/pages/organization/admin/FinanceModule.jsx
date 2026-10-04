
import { useCallback, useEffect, useState } from 'react';
import api from '../../../Config/apiConfig';
import AdminPage from '../../../shared/ModuleKit/AdminPage';
import ModuleTable, { Pill, TabbedPage } from '../../../shared/ModuleKit/ModuleKit';
import Button from '../../../shared/Button/Button';
import { Toast } from '../../../shared/HrUi/HrUi';
import { apiError, fmtDate, money, toneFor, useToast } from '../../../utils/hrFormat';
import { useLookups } from '../../../utils/moduleHooks';

const METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Card', 'Online', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);
const CATEGORIES = ['Account', 'Asset', 'Liability', 'Equity', 'Income', 'Expense'].slice(1);

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

const labelClass =
  'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600';

const textareaClass =
  'w-full min-h-[110px] resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

const Stat = ({ label, value, tone = 'text-slate-950' }) => (
  <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl ${tone}`}>
      {value}
    </p>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  options = [],
  required = false,
  placeholder = '',
  disabled = false,
  min,
  step,
}) => (
  <div>
    <label className={labelClass}>
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>

    {type === 'textarea' ? (
      <textarea
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={textareaClass}
      />
    ) : type === 'select' ? (
      <select
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className={selectClass}
      >
        {options.map((option) => {
          const item =
            typeof option === 'object'
              ? option
              : { value: option, label: option };

          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    ) : (
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        step={step}
        className={inputClass}
      />
    )}
  </div>
);

const LocalTable = ({
  headers,
  data = [],
  emptyMessage = 'No records found.',
  renderRow,
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead className="border-b border-slate-200 bg-slate-50/90">
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:px-5"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {data.length > 0 ? (
            data.map((row, index) => renderRow(row, index))
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="px-5 py-12 text-center text-sm font-medium text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const PaymentModal = ({ kind, doc, onClose, onDone }) => {
  const outstanding = Number(doc.amount) - Number(doc.amountPaid || 0);

  const [f, setF] = useState({
    amount: outstanding.toFixed(2),
    paidOn: today(),
    method: 'Bank Transfer',
    reference: '',
  });

  const [hist, setHist] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const base = kind === 'invoice' ? 'invoices' : 'bills';

  useEffect(() => {
    api
      .get(`/finance/${base}/${doc.id}/payments`)
      .then((r) => setHist(r.data.payments))
      .catch(() => {});
  }, [base, doc.id]);

  const submit = async (e) => {
    e.preventDefault();

    if (busy) return;

    const n = Number(f.amount);

    if (!(n > 0)) {
      return setErr('Enter a payment amount.');
    }

    if (n > outstanding + 0.005) {
      return setErr('Payment exceeds the outstanding balance.');
    }

    setBusy(true);
    setErr('');

    try {
      await api.post(`/finance/${base}/${doc.id}/payments`, {
        amount: n,
        paidOn: f.paidOn,
        method: f.method,
        reference: f.reference || undefined,
      });

      onDone('Payment recorded and posted to the ledger.');
    } catch (x) {
      setErr(apiError(x));
    } finally {
      setBusy(false);
    }
  };

  const label = kind === 'invoice' ? doc.invoiceNumber : doc.billNumber;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[3px]">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <span className="text-lg font-bold">$</span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Record payment
              </p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-950">
                Payments — {label}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto bg-white px-5 py-5 sm:px-6">
          {/* Summary */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Total</p>
              <p className="mt-1 text-base font-bold text-slate-950">
                {money(doc.amount)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Paid</p>
              <p className="mt-1 text-base font-bold text-emerald-700">
                {money(doc.amountPaid)}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-xs font-semibold text-blue-600">
                Outstanding
              </p>
              <p className="mt-1 text-base font-bold text-blue-700">
                {money(outstanding)}
              </p>
            </div>
          </div>

          {/* Payment history */}
          {hist.length > 0 && (
            <div className="mb-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-950">
                    Payment history
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Previous payments recorded against this document.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {hist.length} record{hist.length !== 1 ? 's' : ''}
                </span>
              </div>

              <LocalTable
                headers={['Date', 'Amount', 'Method', 'Reference']}
                data={hist}
                emptyMessage=""
                renderRow={(p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {fmtDate(p.paidOn)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-950">
                      {money(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {p.method || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {p.reference || '—'}
                    </td>
                  </tr>
                )}
              />
            </div>
          )}

          {outstanding > 0.004 &&
          ['Sent', 'Partially Paid', 'Unpaid'].includes(doc.status) ? (
            <form onSubmit={submit} noValidate>
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                <p className="text-sm font-semibold text-blue-900">
                  Recording a payment
                </p>
                <p className="mt-0.5 text-xs leading-5 text-blue-700">
                  Enter the amount received and payment details below.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Amount"
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={f.amount}
                  onChange={(e) =>
                    setF({ ...f, amount: e.target.value })
                  }
                />

                <Field
                  label="Payment date"
                  type="date"
                  value={f.paidOn}
                  onChange={(e) =>
                    setF({ ...f, paidOn: e.target.value })
                  }
                />

                <Field
                  label="Method"
                  type="select"
                  options={METHODS}
                  value={f.method}
                  onChange={(e) =>
                    setF({ ...f, method: e.target.value })
                  }
                />

                <Field
                  label="Reference"
                  placeholder="Transaction / cheque reference"
                  value={f.reference}
                  onChange={(e) =>
                    setF({ ...f, reference: e.target.value })
                  }
                />
              </div>

              {err && (
                <div
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  role="alert"
                >
                  {err}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={busy}
                >
                  Close
                </Button>

                <Button
                  type="submit"
                  variant="success"
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Record payment'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-medium text-slate-600">
                {doc.status === 'Draft'
                  ? 'Send the invoice before recording payments.'
                  : 'Nothing outstanding on this document.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ sections
const ChartOfAccounts = () => (
  <ModuleTable
    title="Chart of accounts"
    subtitle="System accounts (lock icon rules) cannot be deleted; accounts in use can only be deactivated."
    base="/finance/chart-of-accounts"
    addLabel="Add account"
    deleteLabel="account"
    filters={[
      {
        name: 'category',
        label: 'Category',
        options: CATEGORIES,
      },
      {
        name: 'status',
        label: 'Status',
        options: ['Active', 'Inactive'],
      },
    ]}
    rowLocked={() => false}
    columns={[
      {
        label: 'Code',
        render: (r) => (
          <span className="font-mono text-sm font-semibold text-slate-700">
            {r.code}
          </span>
        ),
      },
      {
        label: 'Name',
        render: (r) => (
          <span className="font-semibold text-slate-900">{r.name}</span>
        ),
      },
      {
        label: 'Category',
        render: (r) => (
          <Pill
            tone={
              {
                Asset: 'blue',
                Liability: 'orange',
                Equity: 'slate',
                Income: 'green',
                Expense: 'red',
              }[r.category]
            }
          >
            {r.category}
          </Pill>
        ),
      },
      {
        label: 'Description',
        render: (r) => (
          <span className="text-slate-600">
            {r.description || '—'}
          </span>
        ),
      },
      {
        label: 'Status',
        render: (r) => (
          <Pill tone={toneFor(r.status)}>{r.status}</Pill>
        ),
      },
    ]}
    fields={[
      { name: 'code', label: 'Code', required: true },
      { name: 'name', label: 'Name', required: true },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: CATEGORIES,
        optional: false,
        required: true,
        default: 'Income',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ['Active', 'Inactive'],
        optional: false,
        default: 'Active',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
      },
    ]}
  />
);

const IncomeRevenue = ({ lookups }) => {
  const [sum, setSum] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api
      .get('/finance/summary')
      .then((r) => setSum(r.data))
      .catch(() => {});
  }, [tick]);

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total income"
          value={money(sum?.income)}
          tone="text-emerald-700"
        />
        <Stat
          label="Total expenses"
          value={money(sum?.expense)}
          tone="text-red-700"
        />
        <Stat label="Net" value={money(sum?.net)} />
        <Stat
          label="Payroll expense posted"
          value={money(sum?.payrollExpense)}
        />
      </div>

      <ModuleTable
        title="Income & revenue"
        subtitle="Donations, grants and other income. Entries created by payments, donations and payroll are system-generated and read-only."
        base="/finance/transactions"
        query={{ type: 'Income' }}
        fixed={{ type: 'Income' }}
        addLabel="Record income"
        deleteLabel="income entry"
        lookups={lookups}
        onChanged={() => setTick((t) => t + 1)}
        rowLocked={(r) => !!r.sourceType}
        filters={[
          {
            name: 'category',
            label: 'Category',
            options: [
              'Donation',
              'Grant',
              'Membership',
              'Service Fee',
              'Other',
            ],
          },
        ]}
        columns={[
          {
            label: 'Date',
            render: (r) => fmtDate(r.txnDate),
          },
          {
            label: 'Account',
            render: (r) => r.accountName,
          },
          {
            label: 'Category',
            render: (r) => r.category,
          },
          {
            label: 'Amount',
            render: (r) => (
              <span className="font-bold text-emerald-700">
                {money(r.amount)}
              </span>
            ),
          },
          {
            label: 'Method',
            render: (r) => r.paymentMethod || '—',
          },
          {
            label: 'Reference',
            render: (r) => r.reference || '—',
          },
          {
            label: 'Source',
            render: (r) =>
              r.sourceType ? (
                <Pill tone="blue">
                  {r.sourceType.replace(/_/g, ' ')}
                </Pill>
              ) : (
                'Manual'
              ),
          },
        ]}
        fields={[
          {
            name: 'txnDate',
            label: 'Date',
            type: 'date',
            required: true,
            default: today,
          },
          {
            name: 'accountId',
            label: 'Income account',
            type: 'select',
            options: 'incomeAccounts',
            required: true,
            optional: false,
          },
          {
            name: 'category',
            label: 'Category',
            type: 'select',
            options: [
              'Donation',
              'Grant',
              'Membership',
              'Service Fee',
              'Other',
            ],
            optional: false,
            default: 'Donation',
          },
          {
            name: 'amount',
            label: 'Amount',
            type: 'number',
            step: '0.01',
            min: 0.01,
            required: true,
          },
          {
            name: 'paymentMethod',
            label: 'Payment method',
            type: 'select',
            options: METHODS,
          },
          {
            name: 'reference',
            label: 'Reference',
          },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
          },
        ]}
      />
    </>
  );
};

const Invoices = ({ lookups }) => {
  const [pay, setPay] = useState(null);
  const [tick, setTick] = useState(0);
  const [toast, showToast] = useToast();

  return (
    <>
      <Toast toast={toast} />

      <ModuleTable
        title="Invoices & payments"
        subtitle="Draft → Sent → Paid. Payments post to the ledger automatically."
        base="/finance/invoices"
        addLabel="Create invoice"
        deleteLabel="invoice"
        lookups={lookups}
        reloadKey={tick}
        filters={[
          {
            name: 'status',
            label: 'Status',
            options: [
              'Draft',
              'Sent',
              'Partially Paid',
              'Paid',
              'Void',
            ],
          },
        ]}
        rowLocked={(r) => r.status !== 'Draft'}
        rowActions={(r, h) => [
          {
            label: 'Send',
            variant: 'success',
            hidden: r.status !== 'Draft',
            onClick: async () => {
              try {
                await api.patch(`/finance/invoices/${r.id}`, {
                  status: 'Sent',
                });
                h.reload();
                h.toast('Invoice marked as sent.');
              } catch (e) {
                h.toast(apiError(e), 'error');
              }
            },
          },
          {
            label: 'Payments',
            hidden: r.status === 'Draft' || r.status === 'Void',
            onClick: () => setPay(r),
          },
          {
            label: 'Void',
            variant: 'danger',
            hidden:
              !['Sent'].includes(r.status) ||
              Number(r.amountPaid) > 0,
            onClick: async () => {
              try {
                await api.patch(`/finance/invoices/${r.id}`, {
                  status: 'Void',
                });
                h.reload();
              } catch (e) {
                h.toast(apiError(e), 'error');
              }
            },
          },
        ]}
        columns={[
          {
            label: 'Invoice',
            render: (r) => (
              <span className="font-mono text-sm font-semibold text-slate-700">
                {r.invoiceNumber}
              </span>
            ),
          },
          {
            label: 'Customer / donor',
            render: (r) => (
              <span className="font-semibold text-slate-900">
                {r.partyName}
              </span>
            ),
          },
          {
            label: 'Due',
            render: (r) => fmtDate(r.dueDate),
          },
          {
            label: 'Amount',
            render: (r) => money(r.amount),
          },
          {
            label: 'Paid',
            render: (r) => (
              <span className="font-semibold text-emerald-700">
                {money(r.amountPaid)}
              </span>
            ),
          },
          {
            label: 'Status',
            render: (r) => (
              <Pill tone={toneFor(r.status)}>{r.status}</Pill>
            ),
          },
        ]}
        fields={[
          {
            name: 'invoiceNumber',
            label: 'Invoice number (blank = auto)',
            createOnly: true,
          },
          {
            name: 'partyName',
            label: 'Customer / donor name',
            required: true,
          },
          {
            name: 'partyEmail',
            label: 'Email',
            type: 'email',
          },
          {
            name: 'issueDate',
            label: 'Issue date',
            type: 'date',
            default: today,
          },
          {
            name: 'dueDate',
            label: 'Due date',
            type: 'date',
            required: true,
          },
          {
            name: 'amount',
            label: 'Amount',
            type: 'number',
            step: '0.01',
            min: 0.01,
            required: true,
          },
          {
            name: 'accountId',
            label: 'Income account',
            type: 'select',
            options: 'incomeAccounts',
          },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
          },
        ]}
      />

      {pay && (
        <PaymentModal
          kind="invoice"
          doc={pay}
          onClose={() => setPay(null)}
          onDone={(m) => {
            setPay(null);
            setTick((t) => t + 1);
            showToast(m);
          }}
        />
      )}
    </>
  );
};

const AgingReport = ({ kind }) => {
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0);
  const [pay, setPay] = useState(null);
  const [toast, showToast] = useToast();

  const ar = kind === 'invoice';

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let alive = true;

    api
      .get(ar ? '/finance/receivables' : '/finance/payables')
      .then((r) => {
        if (alive) setData(r.data);
      })
      .catch((e) => showToast(apiError(e), 'error'));

    return () => {
      alive = false;
    };
  }, [ar, tick, showToast]);

  const aging = data?.aging || {};

  return (
    <>
      <Toast toast={toast} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={ar ? 'Total receivable' : 'Total payable'}
          value={money(data?.totals.outstanding)}
        />

        <Stat
          label="Overdue"
          value={money(data?.totals.overdue)}
          tone="text-red-700"
        />

        <Stat
          label="Open documents"
          value={data?.totals.count ?? '—'}
        />

        <Stat
          label={ar ? 'Payments received' : 'Payments made'}
          value={money(ar ? data?.received : data?.paid)}
          tone="text-emerald-700"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {['Current', '1-30', '31-60', '61-90', '90+'].map((b) => (
          <span
            key={b}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm"
          >
            {b === 'Current' ? 'Not yet due' : `${b} days`}:{' '}
            <b className="text-slate-900">{money(aging[b] || 0)}</b>
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-bold tracking-tight text-slate-950">
            {ar
              ? 'Accounts receivable — outstanding invoices'
              : 'Accounts payable — unpaid bills'}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {ar
              ? 'Review outstanding customer balances and collect payments.'
              : 'Review unpaid vendor balances and settle outstanding bills.'}
          </p>
        </div>

        <LocalTable
          headers={[
            ar ? 'Invoice' : 'Bill',
            ar ? 'Customer' : 'Vendor',
            'Due',
            'Amount',
            'Paid',
            'Outstanding',
            'Aging',
            '',
          ]}
          data={data?.rows || []}
          emptyMessage={
            data ? 'Nothing outstanding.' : 'Loading…'
          }
          renderRow={(r) => (
            <tr
              key={r.id}
              className="transition-colors hover:bg-slate-50/70"
            >
              <td className="px-4 py-3.5 font-mono text-sm font-semibold text-slate-700 sm:px-5">
                {ar ? r.invoiceNumber : r.billNumber}
              </td>

              <td className="px-4 py-3.5 text-sm font-semibold text-slate-900 sm:px-5">
                {ar ? r.partyName : r.vendorName}
              </td>

              <td className="px-4 py-3.5 text-sm text-slate-600 sm:px-5">
                {fmtDate(r.dueDate)}
              </td>

              <td className="px-4 py-3.5 text-sm text-slate-700 sm:px-5">
                {money(r.amount)}
              </td>

              <td className="px-4 py-3.5 text-sm font-semibold text-emerald-700 sm:px-5">
                {money(r.amountPaid)}
              </td>

              <td className="px-4 py-3.5 text-sm font-bold text-slate-950 sm:px-5">
                {money(r.outstanding)}
              </td>

              <td className="px-4 py-3.5 sm:px-5">
                {r.overdue ? (
                  <Pill tone="red">{r.daysOverdue}d overdue</Pill>
                ) : (
                  <Pill tone="slate">Not yet due</Pill>
                )}
              </td>

              <td className="px-4 py-3.5 text-right sm:px-5">
                <Button
                  size="small"
                  variant="success"
                  onClick={() => setPay(r)}
                >
                  {ar ? 'Receive payment' : 'Pay bill'}
                </Button>
              </td>
            </tr>
          )}
        />
      </div>

      {pay && (
        <PaymentModal
          kind={kind}
          doc={pay}
          onClose={() => setPay(null)}
          onDone={(m) => {
            setPay(null);
            reload();
            showToast(m);
          }}
        />
      )}
    </>
  );
};

const AccountsPayable = ({ lookups }) => {
  const [pay, setPay] = useState(null);
  const [tick, setTick] = useState(0);
  const [toast, showToast] = useToast();

  return (
    <TabbedPage
      title=""
      tabs={[
        {
          label: 'Vendor Bills',
          content: (
            <>
              <Toast toast={toast} />

              <ModuleTable
                title="Vendor bills"
                subtitle="Track expenses payable, due dates and payment status."
                base="/finance/bills"
                addLabel="Add bill"
                deleteLabel="bill"
                lookups={lookups}
                reloadKey={tick}
                filters={[
                  {
                    name: 'status',
                    label: 'Status',
                    options: [
                      'Unpaid',
                      'Partially Paid',
                      'Paid',
                      'Void',
                    ],
                  },
                ]}
                rowLocked={(r) =>
                  Number(r.amountPaid) > 0 ||
                  r.status === 'Void'
                }
                rowActions={(r, h) => [
                  {
                    label: 'Pay',
                    variant: 'success',
                    hidden: !['Unpaid', 'Partially Paid'].includes(
                      r.status
                    ),
                    onClick: () => setPay(r),
                  },
                  {
                    label: 'Void',
                    variant: 'danger',
                    hidden: r.status !== 'Unpaid',
                    onClick: async () => {
                      try {
                        await api.patch(`/finance/bills/${r.id}`, {
                          status: 'Void',
                        });
                        h.reload();
                      } catch (e) {
                        h.toast(apiError(e), 'error');
                      }
                    },
                  },
                ]}
                columns={[
                  {
                    label: 'Bill',
                    render: (r) => (
                      <span className="font-mono text-sm font-semibold text-slate-700">
                        {r.billNumber}
                      </span>
                    ),
                  },
                  {
                    label: 'Vendor',
                    render: (r) => (
                      <span className="font-semibold text-slate-900">
                        {r.vendorName}
                      </span>
                    ),
                  },
                  {
                    label: 'Due',
                    render: (r) => fmtDate(r.dueDate),
                  },
                  {
                    label: 'Amount',
                    render: (r) => money(r.amount),
                  },
                  {
                    label: 'Paid',
                    render: (r) => (
                      <span className="font-semibold text-emerald-700">
                        {money(r.amountPaid)}
                      </span>
                    ),
                  },
                  {
                    label: 'Status',
                    render: (r) => (
                      <Pill tone={toneFor(r.status)}>
                        {r.status}
                      </Pill>
                    ),
                  },
                ]}
                fields={[
                  {
                    name: 'billNumber',
                    label: 'Bill number',
                    required: true,
                  },
                  {
                    name: 'vendorName',
                    label: 'Vendor',
                    required: true,
                  },
                  {
                    name: 'billDate',
                    label: 'Bill date',
                    type: 'date',
                    default: today,
                  },
                  {
                    name: 'dueDate',
                    label: 'Due date',
                    type: 'date',
                    required: true,
                  },
                  {
                    name: 'amount',
                    label: 'Amount',
                    type: 'number',
                    step: '0.01',
                    min: 0.01,
                    required: true,
                  },
                  {
                    name: 'accountId',
                    label: 'Expense account',
                    type: 'select',
                    options: 'expenseAccounts',
                  },
                  {
                    name: 'description',
                    label: 'Description',
                    type: 'textarea',
                  },
                ]}
              />

              {pay && (
                <PaymentModal
                  kind="bill"
                  doc={pay}
                  onClose={() => setPay(null)}
                  onDone={(m) => {
                    setPay(null);
                    setTick((t) => t + 1);
                    showToast(m);
                  }}
                />
              )}
            </>
          ),
        },
        {
          label: 'Aging & Overdue',
          content: <AgingReport kind="bill" />,
        },
      ]}
    />
  );
};

const PayrollIntegration = () => {
  const [data, setData] = useState(null);
  const [tick, setTick] = useState(0);
  const [toast, showToast] = useToast();

  useEffect(() => {
    let a = true;

    api
      .get('/finance/payroll-integration')
      .then((r) => {
        if (a) setData(r.data);
      })
      .catch((e) => showToast(apiError(e), 'error'));

    return () => {
      a = false;
    };
  }, [tick, showToast]);

  const sync = async (id) => {
    try {
      await api.post(`/payroll/runs/${id}/sync`);
      setTick((t) => t + 1);
      showToast('Posted to finance.');
    } catch (e) {
      showToast(apiError(e), 'error');
    }
  };

  return (
    <>
      <Toast toast={toast} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Payroll expense posted to ledger"
          value={money(data?.totals.payrollExpensePosted)}
        />

        <Stat
          label="Processed runs not yet posted"
          value={data?.totals.unsynced ?? '—'}
          tone={
            data?.totals.unsynced
              ? 'text-amber-700'
              : 'text-slate-950'
          }
        />

        <Stat
          label="Runs with a ledger mismatch"
          value={data?.totals.inconsistent ?? '—'}
          tone={
            data?.totals.inconsistent
              ? 'text-red-700'
              : 'text-slate-950'
          }
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h3 className="text-base font-bold tracking-tight text-slate-950">
            Payroll → finance reconciliation
          </h3>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Each processed payroll run posts one expense (gross payroll)
            to Salaries & Wages. Re-posting updates that entry — it never
            duplicates it.
          </p>
        </div>

        <LocalTable
          headers={[
            'Period',
            'Status',
            'Payroll gross',
            'Ledger amount',
            'Reconciliation',
            '',
          ]}
          data={data?.runs || []}
          emptyMessage={
            data ? 'No payroll runs yet.' : 'Loading…'
          }
          renderRow={(r) => (
            <tr
              key={r.id}
              className="transition-colors hover:bg-slate-50/70"
            >
              <td className="px-4 py-4 text-sm font-semibold text-slate-900 sm:px-5">
                {r.period}
              </td>

              <td className="px-4 py-4 sm:px-5">
                <Pill tone={toneFor(r.status)}>
                  {r.status}
                </Pill>
              </td>

              <td className="px-4 py-4 text-sm text-slate-700 sm:px-5">
                {money(r.totalGross)}
              </td>

              <td className="px-4 py-4 text-sm font-semibold text-slate-900 sm:px-5">
                {r.synced ? money(r.ledgerAmount) : '—'}
              </td>

              <td className="px-4 py-4 sm:px-5">
                {r.status === 'Draft' ? (
                  <Pill tone="slate">Draft</Pill>
                ) : !r.synced ? (
                  <Pill tone="amber">Not posted</Pill>
                ) : r.consistent ? (
                  <Pill tone="green">Consistent</Pill>
                ) : (
                  <Pill tone="red">Mismatch</Pill>
                )}
              </td>

              <td className="px-4 py-4 text-right sm:px-5">
                {r.status !== 'Draft' &&
                  (!r.synced || r.consistent === false) && (
                    <Button
                      size="small"
                      onClick={() => sync(r.id)}
                    >
                      {r.synced ? 'Re-post' : 'Post to finance'}
                    </Button>
                  )}
              </td>
            </tr>
          )}
        />
      </div>
    </>
  );
};

const META = {
  'chart-of-accounts': [
    'Chart of Accounts',
    'Financial accounts by category.',
  ],
  income: [
    'Income & Revenue Management',
    'Donations, grants and other revenue.',
  ],
  invoices: [
    'Invoices & Payments',
    'Create invoices and track their payments.',
  ],
  payable: [
    'Accounts Payable',
    'Vendor bills and what you owe.',
  ],
  receivable: [
    'Accounts Receivable',
    'Outstanding invoices and balances.',
  ],
  'payroll-integration': [
    'Payroll Integration',
    'How payroll flows into your financial records.',
  ],
};

const FinanceModule = ({ section }) => {
  const lookups = useLookups([
    'incomeAccounts',
    'expenseAccounts',
  ]);

  const [title, subtitle] = META[section];

  return (
    <AdminPage>
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
              Finance Management
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {section === 'chart-of-accounts' && <ChartOfAccounts />}

      {section === 'income' && (
        <IncomeRevenue lookups={lookups} />
      )}

      {section === 'invoices' && (
        <Invoices lookups={lookups} />
      )}

      {section === 'payable' && (
        <AccountsPayable lookups={lookups} />
      )}

      {section === 'receivable' && (
        <AgingReport kind="invoice" />
      )}

      {section === 'payroll-integration' && (
        <PayrollIntegration />
      )}
    </AdminPage>
  );
};

export default FinanceModule;
