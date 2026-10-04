import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import AdminPage from '../../../shared/ModuleKit/AdminPage';
import api from '../../../Config/apiConfig';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Toast } from '../../../shared/HrUi/HrUi';
import {
  apiError,
  fmtDate,
  toneFor,
  useToast,
} from '../../../utils/hrFormat';
import { useLookups } from '../../../utils/moduleHooks';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const resolveOptions = (field, lookups) => {
  const raw =
    typeof field.options === 'string'
      ? lookups[field.options] || []
      : field.options || [];

  const options = raw.map((option) =>
    typeof option === 'object'
      ? option
      : {
          value: option,
          label: option,
        }
  );

  return field.optional === false
    ? options
    : [
        {
          value: '',
          label: field.emptyLabel || '— Select —',
        },
        ...options,
      ];
};

const initialForm = (fields, row) => {
  const form = {};

  fields.forEach((field) => {
    if (row) {
      form[field.name] = row[field.name] ?? '';
    } else {
      form[field.name] =
        field.default !== undefined
          ? typeof field.default === 'function'
            ? field.default()
            : field.default
          : field.type === 'checkbox'
            ? false
            : '';
    }
  });

  return form;
};

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const StatusPill = ({ status }) => {
  const tone = toneFor(status);

  const styles = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    lime: 'border-lime-200 bg-lime-50 text-lime-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
        styles[tone] || styles.slate
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status || '—'}
    </span>
  );
};

const EmployeeCell = ({ name }) => {
  const initial =
    String(name || '?')
      .trim()
      .charAt(0)
      .toUpperCase() || '?';

  return (
    <div className="flex min-w-[190px] items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700 ring-2 ring-white">
        {initial}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">
          {name || '—'}
        </p>

        <p className="mt-0.5 text-xs text-slate-400">
          Employee
        </p>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Form Field                                                                 */
/* -------------------------------------------------------------------------- */

const FormLabel = ({ children, required }) => (
  <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-700">
    {children}

    {required && (
      <span className="ml-1 text-red-500">*</span>
    )}
  </label>
);

const FormField = ({
  field,
  edit,
  lookups,
  setF,
}) => {
  const disabled =
    (edit.row && field.createOnly) ||
    field.readOnly;

  const value = edit.form[field.name] ?? '';

  const wide =
    field.type === 'textarea'
      ? 'sm:col-span-2'
      : '';

  return (
    <div className={wide}>
      <FormLabel required={field.required}>
        {field.label}
      </FormLabel>

      {field.type === 'select' ? (
        <div className="relative">
          <select
            value={value}
            onChange={(event) =>
              setF(
                field.name,
                event.target.value
              )
            }
            disabled={disabled}
            className={`${inputClass} appearance-none pr-10`}
          >
            {resolveOptions(
              field,
              lookups
            ).map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      ) : field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) =>
            setF(
              field.name,
              event.target.value
            )
          }
          disabled={disabled}
          rows={5}
          placeholder={
            field.placeholder ||
            `Enter ${field.label.toLowerCase()}...`
          }
          className={`${inputClass} resize-none leading-6`}
        />
      ) : (
        <input
          type={field.type || 'text'}
          value={value}
          onChange={(event) =>
            setF(
              field.name,
              event.target.value
            )
          }
          disabled={disabled}
          min={field.min}
          step={field.step}
          placeholder={
            field.placeholder ||
            `Enter ${field.label.toLowerCase()}...`
          }
          className={inputClass}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

const TrainingModal = ({
  edit,
  fields,
  lookups,
  saving,
  error,
  setF,
  onClose,
  onSave,
  title,
  description,
  icon: Icon,
}) => {
  if (!edit) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Icon size={20} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {title}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                {edit.row
                  ? 'Update the information below.'
                  : 'Add a new training record.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto bg-white px-5 py-5 sm:px-6">
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
              <Icon size={15} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                {edit.row
                  ? 'Update record'
                  : 'Create new record'}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
              </p>
            </div>
          </div>

          <form
            id="training-form"
            onSubmit={onSave}
            noValidate
            className="rounded-2xl border border-slate-200 bg-white"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                <BookOpen size={15} />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Training details
                </p>

                <p className="text-[11px] text-slate-400">
                  Complete the required information
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-white p-5 sm:grid-cols-2">
              {fields.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  edit={edit}
                  lookups={lookups}
                  setF={setF}
                />
              ))}
            </div>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <p className="hidden text-xs text-slate-400 sm:block">
            Fields marked with * are required
          </p>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <X size={15} />
              Cancel
            </button>

            <button
              type="submit"
              form="training-form"
              disabled={saving}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
            >
              <Save size={15} />
              {saving
                ? 'Saving…'
                : edit.row
                  ? 'Save changes'
                  : 'Create record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Training Table                                                             */
/* -------------------------------------------------------------------------- */

const TrainingTable = ({
  title,
  subtitle,
  icon: Icon,
  base,
  addLabel = 'Add',
  deleteLabel,
  lookups,
  filters = [],
  columns,
  fields,
  canCreate = true,
  canEdit = true,
  formDescription,
}) => {
  const confirm = useConfirm();
  const [toast, showToast] = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterVals, setFilterVals] = useState({});
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const reload = useCallback(
    () => setTick((value) => value + 1),
    []
  );

  const queryKey = JSON.stringify({
    filterVals,
  });

  useEffect(() => {
    let alive = true;

    const params = {};

    Object.entries(filterVals).forEach(
      ([key, value]) => {
        if (value) {
          params[key] = value;
        }
      }
    );

    setLoading(true);

    api
      .get(base, { params })
      .then((response) => {
        if (!alive) return;

        setRows(response.data.rows || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;

        setLoading(false);

        showToast(
          apiError(
            err,
            'Could not load records.'
          ),
          'error'
        );
      });

    return () => {
      alive = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, queryKey, tick]);

  const openForm = (row = null) => {
    setError('');

    setEdit({
      row,
      form: initialForm(fields, row),
    });
  };

  const setF = (name, value) => {
    setEdit((current) => ({
      ...current,
      form: {
        ...current.form,
        [name]: value,
      },
    }));
  };

  const save = async (event) => {
    event.preventDefault();

    if (saving) return;

    const editing = !!edit.row;
    const body = {};

    for (const field of fields) {
      if (
        editing &&
        field.createOnly
      ) {
        continue;
      }

      let value = edit.form[field.name];

      if (
        value === '' ||
        value === undefined
      ) {
        if (
          field.required &&
          !field.readOnly
        ) {
          setError(
            `${field.label} is required.`
          );
          return;
        }

        if (editing) {
          body[field.name] = null;
        }

        continue;
      }

      if (field.type === 'number') {
        value = Number(value);
      }

      body[field.name] = value;
    }

    setSaving(true);
    setError('');

    try {
      if (editing) {
        await api.patch(
          `${base}/${edit.row.id}`,
          body
        );
      } else {
        await api.post(base, body);
      }

      setEdit(null);
      reload();

      showToast(
        editing
          ? 'Saved.'
          : 'Created.'
      );
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const ok = await confirm({
      title: `Delete this ${deleteLabel}?`,
      message:
        'This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await api.delete(
        `${base}/${row.id}`
      );

      reload();
      showToast('Deleted.');
    } catch (err) {
      showToast(
        apiError(err),
        'error'
      );
    }
  };

  return (
    <>
      <Toast toast={toast} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Table Header */}
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Icon size={19} />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {title}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filters.map((filter) => (
                <div
                  key={filter.name}
                  className="relative"
                >
                  <select
                    value={
                      filterVals[
                        filter.name
                      ] || ''
                    }
                    onChange={(event) =>
                      setFilterVals(
                        (current) => ({
                          ...current,
                          [filter.name]:
                            event.target
                              .value,
                        })
                      )
                    }
                    aria-label={filter.label}
                    className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-9 text-sm font-medium text-slate-600 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      {filter.label}: All
                    </option>

                    {resolveOptions(
                      {
                        ...filter,
                        optional: false,
                      },
                      lookups
                    ).map((option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              ))}

              {canCreate && (
                <button
                  type="button"
                  onClick={() =>
                    openForm(null)
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <Plus size={15} />
                  {addLabel}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {columns.map((column) => (
                  <th
                    key={column.label}
                    className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    {column.label}
                  </th>
                ))}

                {(canEdit || deleteLabel) && (
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={
                      columns.length +
                      (canEdit || deleteLabel
                        ? 1
                        : 0)
                    }
                    className="px-5 py-14 text-center"
                  >
                    <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                      Loading records…
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      columns.length +
                      (canEdit || deleteLabel
                        ? 1
                        : 0)
                    }
                    className="px-5 py-14 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                        <Icon size={21} />
                      </div>

                      <p className="text-sm font-semibold text-slate-700">
                        No records found
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {canCreate
                          ? 'Add a new record to get started.'
                          : 'There are no records matching the selected filters.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group transition-colors hover:bg-slate-50/60"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.label}
                        className="px-5 py-4 align-middle text-sm text-slate-600"
                      >
                        {column.render
                          ? column.render(row)
                          : row[
                              column.key
                            ] ?? '—'}
                      </td>
                    ))}

                    {(canEdit || deleteLabel) && (
                      <td className="px-5 py-4 align-middle">
                        <div className="flex justify-end gap-1.5">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                openForm(
                                  row
                                )
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>
                          )}

                          {deleteLabel && (
                            <button
                              type="button"
                              onClick={() =>
                                remove(row)
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TrainingModal
        edit={edit}
        fields={fields}
        lookups={lookups}
        saving={saving}
        error={error}
        setF={setF}
        onClose={() => setEdit(null)}
        onSave={save}
        title={`${edit?.row ? 'Edit' : addLabel}`}
        description={formDescription}
        icon={Icon}
      />
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

const TrainingDevelopment = () => {
  const lookups = useLookups([
    'employees',
    'programs',
  ]);

  const [activeTab, setActiveTab] =
    useState('Programs');

  const tabs = [
    {
      label: 'Programs',
      icon: BookOpen,
    },
    {
      label: 'Interested Staff',
      icon: Users,
    },
    {
      label: 'Participation & Completion',
      icon: GraduationCap,
    },
  ];

  return (
    <AdminPage>
      <div className="w-full">
        {/* Page Header */}
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Learning & Growth
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Training & Development
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Training programs, participation and
            completion records.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-5 overflow-x-auto">
          <div
            className="inline-flex min-w-full border-b border-slate-200"
            role="tablist"
          >
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const active =
                activeTab === tab.label;

              return (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() =>
                    setActiveTab(
                      tab.label
                    )
                  }
                  className={`relative inline-flex items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-semibold transition ${
                    active
                      ? 'text-blue-700'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TabIcon size={16} />
                  {tab.label}

                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Programs */}
        {activeTab === 'Programs' && (
          <TrainingTable
            title="Training programs"
            subtitle="Create and manage employee learning programs, schedules and capacity."
            icon={BookOpen}
            base="/hrm/training-programs"
            addLabel="Add program"
            deleteLabel="program"
            lookups={lookups}
            formDescription="Create a training program with its provider, schedule, capacity and current status."
            filters={[
              {
                name: 'status',
                label: 'Status',
                options: [
                  'Planned',
                  'Ongoing',
                  'Completed',
                  'Cancelled',
                ],
              },
            ]}
            columns={[
              {
                label: 'Program',
                render: (row) => (
                  <div className="min-w-[220px]">
                    <p className="font-semibold text-slate-800">
                      {row.title || '—'}
                    </p>

                    {row.description && (
                      <p className="mt-1 max-w-md truncate text-xs text-slate-400">
                        {row.description}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                label: 'Provider',
                render: (row) => (
                  <span className="font-medium text-slate-600">
                    {row.provider || '—'}
                  </span>
                ),
              },
              {
                label: 'Dates',
                render: (row) => (
                  <div className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <CalendarDays size={13} />
                    {fmtDate(row.startDate)} →{' '}
                    {fmtDate(row.endDate)}
                  </div>
                ),
              },
              {
                label: 'Enrolled',
                render: (row) => (
                  <div className="inline-flex items-center gap-1.5">
                    <Users
                      size={14}
                      className="text-slate-400"
                    />

                    <span className="font-semibold text-slate-700">
                      {row.enrolledCount ?? 0}
                    </span>

                    {row.capacity && (
                      <span className="text-xs text-slate-400">
                        / {row.capacity}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                label: 'Interested',
                render: (row) => (
                  <span className="font-semibold text-slate-700">
                    {row.interestedCount ?? 0}
                  </span>
                ),
              },
              {
                label: 'Status',
                render: (row) => (
                  <StatusPill
                    status={row.status}
                  />
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
                name: 'provider',
                label: 'Provider / trainer',
              },
              {
                name: 'startDate',
                label: 'Start date',
                type: 'date',
              },
              {
                name: 'endDate',
                label: 'End date',
                type: 'date',
              },
              {
                name: 'capacity',
                label: 'Capacity',
                type: 'number',
                min: 1,
              },
              {
                name: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  'Planned',
                  'Ongoing',
                  'Completed',
                  'Cancelled',
                ],
                optional: false,
                default: 'Planned',
              },
              {
                name: 'description',
                label: 'Description',
                type: 'textarea',
              },
            ]}
          />
        )}

        {/* Interested Staff */}
        {activeTab === 'Interested Staff' && (
          <TrainingTable
            title="Interested staff"
            subtitle="Employees who showed interest from their dashboard. Enroll them from the Participation tab."
            icon={Users}
            base="/hrm/training-interests"
            deleteLabel="interest"
            lookups={lookups}
            canCreate={false}
            canEdit={false}
            filters={[
              {
                name: 'programId',
                label: 'Program',
                options: 'programs',
              },
              {
                name: 'employeeId',
                label: 'Employee',
                options: 'employees',
              },
            ]}
            columns={[
              {
                label: 'Employee',
                render: (row) => (
                  <EmployeeCell
                    name={row.employeeName}
                  />
                ),
              },
              {
                label: 'Program',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                      <BookOpen size={14} />
                    </div>

                    <span className="font-semibold text-slate-700">
                      {row.programName || '—'}
                    </span>
                  </div>
                ),
              },
              {
                label: 'Date',
                render: (row) => (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                    <CalendarDays size={13} />
                    {fmtDate(
                      String(
                        row.createdAt
                      ).slice(0, 10)
                    )}
                  </span>
                ),
              },
            ]}
            fields={[]}
          />
        )}

        {/* Participation */}
        {activeTab ===
          'Participation & Completion' && (
          <TrainingTable
            title="Enrollments"
            subtitle="Enroll employees into training programs and track their progress and completion."
            icon={GraduationCap}
            base="/hrm/training-enrollments"
            addLabel="Enroll employee"
            deleteLabel="enrollment"
            lookups={lookups}
            formDescription="Enroll an employee into a training program and maintain their participation status and score."
            filters={[
              {
                name: 'programId',
                label: 'Program',
                options: 'programs',
              },
              {
                name: 'employeeId',
                label: 'Employee',
                options: 'employees',
              },
              {
                name: 'status',
                label: 'Status',
                options: [
                  'Enrolled',
                  'In Progress',
                  'Completed',
                  'Dropped',
                ],
              },
            ]}
            columns={[
              {
                label: 'Employee',
                render: (row) => (
                  <EmployeeCell
                    name={row.employeeName}
                  />
                ),
              },
              {
                label: 'Program',
                render: (row) => (
                  <span className="font-semibold text-slate-700">
                    {row.programName || '—'}
                  </span>
                ),
              },
              {
                label: 'Status',
                render: (row) => (
                  <StatusPill
                    status={row.status}
                  />
                ),
              },
              {
                label: 'Score',
                render: (row) =>
                  row.score === null ||
                  row.score === undefined ? (
                    <span className="text-slate-400">
                      —
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700">
                      {row.score}/100
                    </span>
                  ),
              },
              {
                label: 'Completed',
                render: (row) =>
                  row.completedAt ? (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={13} />
                      {fmtDate(
                        String(
                          row.completedAt
                        ).slice(0, 10)
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">
                      —
                    </span>
                  ),
              },
            ]}
            fields={[
              {
                name: 'programId',
                label: 'Program',
                type: 'select',
                options: 'programs',
                required: true,
                createOnly: true,
                optional: false,
              },
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
                name: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  'Enrolled',
                  'In Progress',
                  'Completed',
                  'Dropped',
                ],
                optional: false,
                default: 'Enrolled',
              },
              {
                name: 'score',
                label: 'Score (0-100)',
                type: 'number',
                min: 0,
                step: '0.1',
              },
            ]}
          />
        )}
      </div>
    </AdminPage>
  );
};

export default TrainingDevelopment;
