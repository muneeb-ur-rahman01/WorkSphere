
import { useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  LockKeyhole,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import api from '../../../Config/apiConfig';
import { STAFF_ROLES } from '../../../Config/constant';
import AdminPage from '../../../shared/ModuleKit/AdminPage';
import ModuleTable, {
  Pill,
  TabbedPage,
} from '../../../shared/ModuleKit/ModuleKit';
import { Toast } from '../../../shared/HrUi/HrUi';
import {
  apiError,
  fmtDate,
  toneFor,
  useToast,
} from '../../../utils/hrFormat';
import { useLookups } from '../../../utils/moduleHooks';

const APPLICANT_STATUSES = [
  'Applied',
  'Screening',
  'Interview',
  'Offered',
  'Rejected',
];

const EMP_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Intern',
  'Volunteer',
];

/* -------------------------------------------------------------------------- */
/* Professional Tailwind Form UI                                             */
/* -------------------------------------------------------------------------- */

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const labelClass =
  'mb-2 block text-[13px] font-bold tracking-wide text-slate-700';

const PrimaryButton = ({
  children,
  type = 'button',
  onClick,
  disabled = false,
  className = '',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {children}
  </button>
);

const OutlineButton = ({
  children,
  type = 'button',
  onClick,
  disabled = false,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {children}
  </button>
);

const Field = ({
  label,
  required = false,
  type = 'text',
  value,
  onChange,
  placeholder,
  min,
  options = [],
  rows = 4,
  disabled = false,
}) => (
  <div>
    <label className={labelClass}>
      {label}

      {required && (
        <span className="ml-1 text-red-500">
          *
        </span>
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
    ) : type === 'select' ? (
      <div className="relative">
        <select
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          className={`${inputClass} appearance-none pr-10`}
        >
          {options.map((option) => {
            const item =
              typeof option === 'string'
                ? {
                    value: option,
                    label: option,
                  }
                : option;

            return (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            );
          })}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    ) : (
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        disabled={disabled}
        className={inputClass}
      />
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Modal Shell                                                                */
/* -------------------------------------------------------------------------- */

const ModalShell = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '720px',
  disableClose = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget &&
          !disableClose
        ) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruitment-modal-title"
    >
      <div
        className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ maxWidth }}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/50 px-6 py-6">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-100/50 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <UserPlus className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="mb-1.5">
                  <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-inset ring-blue-100">
                    Employee onboarding
                  </span>
                </div>

                <h2
                  id="recruitment-modal-title"
                  className="text-xl font-bold tracking-tight text-slate-950"
                >
                  {title}
                </h2>

                {subtitle && (
                  <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                !disableClose && onClose()
              }
              disabled={disableClose}
              aria-label="Close"
              className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-400 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[80vh] overflow-y-auto bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Small UI Helpers                                                           */
/* -------------------------------------------------------------------------- */

const Avatar = ({ name }) => {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
      {initials}
    </div>
  );
};

const SectionHeader = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
      <Icon className="h-5 w-5" />
    </div>

    <div>
      <h3 className="text-sm font-bold text-slate-900">
        {title}
      </h3>

      {description && (
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Job Openings                                                               */
/* -------------------------------------------------------------------------- */

const Openings = ({ lookups }) => (
  <ModuleTable
    title="Job openings"
    subtitle="Create and manage vacancies across your organization."
    base="/hrm/job-openings"
    addLabel="Add job opening"
    deleteLabel="job opening"
    lookups={lookups}
    filters={[
      {
        name: 'status',
        label: 'Status',
        options: [
          'Draft',
          'Open',
          'Closed',
        ],
      },
    ]}
    toolbar={
      <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 sm:flex">
        <BriefcaseBusiness className="h-4 w-4 text-blue-500" />
        Recruitment pipeline
      </div>
    }
    columns={[
      {
        label: 'Title',
        render: (r) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                {r.title}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                Job opening
              </p>
            </div>
          </div>
        ),
      },
      {
        label: 'Department',
        render: (r) => (
          <span className="font-medium text-slate-600">
            {r.departmentName ||
              '—'}
          </span>
        ),
      },
      {
        label: 'Positions',
        render: (r) => (
          <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700">
            {r.positions}
          </span>
        ),
      },
      {
        label: 'Closing',
        render: (r) => (
          <div className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {fmtDate(r.closingDate)}
          </div>
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
        name: 'title',
        label: 'Title',
        required: true,
      },
      {
        name: 'departmentId',
        label: 'Department',
        type: 'select',
        options: 'departments',
      },
      {
        name: 'designationId',
        label: 'Designation',
        type: 'select',
        options: 'designations',
      },
      {
        name: 'positions',
        label: 'Positions',
        type: 'number',
        default: 1,
        min: 1,
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          'Draft',
          'Open',
          'Closed',
        ],
        optional: false,
        default: 'Draft',
      },
      {
        name: 'closingDate',
        label: 'Closing date',
        type: 'date',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
      },
    ]}
  />
);

/* -------------------------------------------------------------------------- */
/* Convert Applicant Modal                                                    */
/* -------------------------------------------------------------------------- */

const ConvertModal = ({
  applicant,
  onClose,
  onDone,
  lookups,
}) => {
  const [f, setF] = useState({
    role: 'Employee',
    password: '',
    joiningDate: new Date()
      .toISOString()
      .slice(0, 10),
    departmentId: '',
    designationId: '',
    employmentType: 'Full-time',
  });

  const [err, setErr] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const updateField = (key) => (e) => {
    const value = e.target.value;

    setF((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (busy) return;

    if (f.password.length < 8) {
      return setErr(
        'Temporary password must be at least 8 characters.'
      );
    }

    setBusy(true);
    setErr('');

    try {
      const res = await api.post(
        `/hrm/applicants/${applicant.id}/convert`,
        {
          ...f,
          departmentId:
            f.departmentId ||
            undefined,
          designationId:
            f.designationId ||
            undefined,
        }
      );

      onDone(
        `${applicant.fullName} is now employee ${res.data.employee.employeeCode}. ${res.data.onboardingTasks} onboarding tasks created.`
      );
    } catch (x) {
      setErr(apiError(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title={`Convert ${applicant.fullName}`}
      subtitle="Create the employee account and configure their initial employment details."
      maxWidth="720px"
      disableClose={busy}
    >
      <form
        onSubmit={submit}
        noValidate
      >
        {/* Candidate Summary */}
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <Avatar
              name={applicant.fullName}
            />

            <div className="min-w-0">
              <p className="font-bold text-slate-900">
                {applicant.fullName}
              </p>

              <p className="mt-0.5 truncate text-sm text-slate-500">
                {applicant.email}
              </p>

              <div className="mt-2">
                <Pill tone="blue">
                  Offered candidate
                </Pill>
              </div>
            </div>

            <div className="ml-auto hidden text-right sm:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Recruitment status
              </p>

              <p className="mt-1 text-sm font-bold text-blue-700">
                Ready to convert
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-6 px-6 py-6">
          {/* Account Section */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
              <SectionHeader
                icon={ShieldCheck}
                title="Employee account"
                description="Configure the employee's login access."
              />
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <Field
                label="Login role"
                required
                type="select"
                value={f.role}
                onChange={updateField(
                  'role'
                )}
                options={STAFF_ROLES.map(
                  (r) => ({
                    value: r.value,
                    label: r.label,
                  })
                )}
              />

              <Field
                label="Temporary password"
                required
                type="password"
                value={f.password}
                onChange={updateField(
                  'password'
                )}
                placeholder="Minimum 8 characters"
              />

              <div className="sm:col-span-2">
                <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                  <p className="text-xs font-medium leading-5 text-amber-800">
                    The temporary password should be shared securely
                    with the employee and changed after first login.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Employment Section */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
              <SectionHeader
                icon={BriefcaseBusiness}
                title="Employment details"
                description="Set the employee's initial organizational placement."
              />
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <Field
                label="Joining date"
                type="date"
                value={f.joiningDate}
                onChange={updateField(
                  'joiningDate'
                )}
              />

              <Field
                label="Employment type"
                type="select"
                value={
                  f.employmentType
                }
                onChange={updateField(
                  'employmentType'
                )}
                options={EMP_TYPES}
              />

              <Field
                label="Department"
                type="select"
                value={
                  f.departmentId
                }
                onChange={updateField(
                  'departmentId'
                )}
                options={[
                  {
                    value: '',
                    label: '— None —',
                  },
                  ...(lookups.departments ||
                    []),
                ]}
              />

              <Field
                label="Designation"
                type="select"
                value={
                  f.designationId
                }
                onChange={updateField(
                  'designationId'
                )}
                options={[
                  {
                    value: '',
                    label: '— None —',
                  },
                  ...(lookups.designations ||
                    []),
                ]}
              />
            </div>
          </section>

          {/* Onboarding Notice */}
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-bold text-emerald-900">
                Automatic onboarding setup
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Converting this candidate will create the employee
                record and generate the default onboarding checklist
                automatically.
              </p>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 shadow-sm">
                  <X className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                    Unable to convert
                  </p>

                  <p className="mt-1 text-sm font-medium leading-5 text-red-700">
                    {err}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden text-xs font-medium text-slate-400 sm:block">
            Review the employment details before creating the employee.
          </p>

          <div className="flex justify-end gap-3">
            <OutlineButton
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </OutlineButton>

            <PrimaryButton
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Converting…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Convert to employee
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

/* -------------------------------------------------------------------------- */
/* Applicants                                                                 */
/* -------------------------------------------------------------------------- */

const Applicants = ({ lookups }) => {
  const [toast, showToast] =
    useToast();

  const [conv, setConv] =
    useState(null);

  const [tick, setTick] =
    useState(0);

  return (
    <>
      <Toast toast={toast} />

      <ModuleTable
        title="Applicants"
        subtitle="Track candidates through the hiring pipeline and convert offered candidates into employees."
        base="/hrm/applicants"
        addLabel="Add applicant"
        deleteLabel="applicant"
        lookups={lookups}
        reloadKey={tick}
        filters={[
          {
            name: 'jobId',
            label: 'Job',
            options: 'jobs',
          },
          {
            name: 'status',
            label: 'Status',
            options: [
              ...APPLICANT_STATUSES,
              'Hired',
            ],
          },
        ]}
        rowLocked={(r) =>
          !!r.convertedEmployeeId
        }
        rowActions={(r) => [
          {
            label:
              'Convert to employee',
            variant: 'success',
            hidden:
              r.status !==
                'Offered' ||
              !!r.convertedEmployeeId,
            onClick: () =>
              setConv(r),
          },
        ]}
        columns={[
          {
            label: 'Applicant',
            render: (r) => (
              <div className="flex items-center gap-3">
                <Avatar
                  name={
                    r.fullName
                  }
                />

                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {r.fullName}
                  </p>

                  <p className="truncate text-xs text-slate-400">
                    {r.email}
                  </p>
                </div>
              </div>
            ),
          },
          {
            label: 'Phone',
            render: (r) => (
              <span className="font-medium text-slate-600">
                {r.phone || '—'}
              </span>
            ),
          },
          {
            label: 'Job',
            render: (r) => (
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4 text-slate-400" />

                <span className="font-medium text-slate-600">
                  {r.jobName ||
                    '—'}
                </span>
              </div>
            ),
          },
          {
            label: 'Status',
            render: (r) => (
              <Pill
                tone={toneFor(
                  r.status
                )}
              >
                {r.status}
              </Pill>
            ),
          },
        ]}
        fields={[
          {
            name: 'jobId',
            label: 'Job opening',
            type: 'select',
            options: 'jobs',
            required: true,
            createOnly: true,
            optional: false,
          },
          {
            name: 'fullName',
            label: 'Full name',
            required: true,
          },
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            required: true,
          },
          {
            name: 'phone',
            label: 'Phone',
          },
          {
            name: 'source',
            label: 'Source',
          },
          {
            name: 'status',
            label: 'Status',
            type: 'select',
            options:
              APPLICANT_STATUSES,
            optional: false,
            default: 'Applied',
          },
          {
            name: 'notes',
            label: 'Notes',
            type: 'textarea',
          },
        ]}
      />

      {conv && (
        <ConvertModal
          applicant={conv}
          lookups={lookups}
          onClose={() =>
            setConv(null)
          }
          onDone={(message) => {
            setConv(null);
            setTick(
              (t) => t + 1
            );
            showToast(message);
          }}
        />
      )}
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Onboarding                                                                 */
/* -------------------------------------------------------------------------- */

const Onboarding = ({
  lookups,
}) => {
  const [emp, setEmp] =
    useState('');

  const [tick, setTick] =
    useState(0);

  const [toast, showToast] =
    useToast();

  const addDefaults =
    async () => {
      try {
        await api.post(
          '/hrm/onboarding-tasks/defaults',
          {
            employeeId: emp,
          }
        );

        setTick(
          (t) => t + 1
        );

        showToast(
          'Default checklist added.'
        );
      } catch (e) {
        showToast(
          apiError(e),
          'error'
        );
      }
    };

  return (
    <>
      <Toast toast={toast} />

      <ModuleTable
        title="Onboarding tasks"
        subtitle="Track new-hire tasks from assignment through completion."
        base="/hrm/onboarding-tasks"
        addLabel="Add task"
        deleteLabel="task"
        lookups={lookups}
        reloadKey={tick}
        query={
          emp
            ? {
                employeeId: emp,
              }
            : {}
        }
        fixed={
          emp
            ? {
                employeeId: emp,
              }
            : {}
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                value={emp}
                onChange={(e) =>
                  setEmp(
                    e.target.value
                  )
                }
                className="min-w-[210px] appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                aria-label="Employee"
              >
                <option value="">
                  All employees
                </option>

                {(
                  lookups.employees ||
                  []
                ).map((o) => (
                  <option
                    key={
                      o.value
                    }
                    value={
                      o.value
                    }
                  >
                    {o.label}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 text-slate-400" />
            </div>

            {emp && (
              <PrimaryButton
                onClick={
                  addDefaults
                }
              >
                <Plus className="h-4 w-4" />
                Add default checklist
              </PrimaryButton>
            )}
          </div>
        }
        rowActions={(r, h) => [
          {
            label:
              r.status ===
              'Pending'
                ? 'Mark done'
                : 'Reopen',
            variant:
              r.status ===
              'Pending'
                ? 'success'
                : 'outline',
            onClick:
              async () => {
                try {
                  await api.patch(
                    `/hrm/onboarding-tasks/${r.id}`,
                    {
                      status:
                        r.status ===
                        'Pending'
                          ? 'Completed'
                          : 'Pending',
                    }
                  );

                  h.reload();
                } catch (e) {
                  h.toast(
                    apiError(e),
                    'error'
                  );
                }
              },
          },
        ]}
        columns={[
          {
            label: 'Employee',
            render: (r) => (
              <div className="flex items-center gap-3">
                <Avatar
                  name={
                    r.employeeName
                  }
                />

                <span className="font-semibold text-slate-900">
                  {r.employeeName ||
                    '—'}
                </span>
              </div>
            ),
          },
          {
            label: 'Task',
            render: (r) => (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <ClipboardCheck className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {r.title}
                  </p>

                  {r.description && (
                    <p
                      className="mt-0.5 max-w-[300px] truncate text-xs text-slate-400"
                      title={
                        r.description
                      }
                    >
                      {
                        r.description
                      }
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            label: 'Due',
            render: (r) => (
              <div className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-600">
                <CalendarDays className="h-4 w-4 text-slate-400" />

                {fmtDate(
                  r.dueDate
                )}
              </div>
            ),
          },
          {
            label: 'Status',
            render: (r) => (
              <Pill
                tone={
                  r.status ===
                  'Completed'
                    ? 'green'
                    : 'amber'
                }
              >
                <span className="inline-flex items-center gap-1">
                  {r.status ===
                    'Completed' && (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}

                  {r.status}
                </span>
              </Pill>
            ),
          },
        ]}
        fields={[
          {
            name: 'employeeId',
            label: 'Employee',
            type: 'select',
            options: 'employees',
            required: true,
            createOnly: true,
            optional: false,
          },
          {
            name: 'title',
            label: 'Task',
            required: true,
          },
          {
            name: 'dueDate',
            label: 'Due date',
            type: 'date',
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

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

const RecruitmentOnboarding =
  () => {
    const lookups =
      useLookups([
        'employees',
        'departments',
        'designations',
        'jobs',
      ]);

    return (
      <AdminPage>
        <TabbedPage
          title="Recruitment & Onboarding"
          subtitle="Manage openings, applicants and the onboarding of new hires."
          tabs={[
            {
              label: 'Job Openings',
              content: (
                <Openings
                  lookups={
                    lookups
                  }
                />
              ),
            },
            {
              label: 'Applicants',
              content: (
                <Applicants
                  lookups={
                    lookups
                  }
                />
              ),
            },
            {
              label: 'Onboarding',
              content: (
                <Onboarding
                  lookups={
                    lookups
                  }
                />
              ),
            },
          ]}
        />
      </AdminPage>
    );
  };

export default RecruitmentOnboarding;
