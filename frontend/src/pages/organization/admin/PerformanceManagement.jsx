import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  MessageSquareText,
  Pencil,
  Plus,
  Save,
  Star,
  Target,
  Trash2,
  UserRound,
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

const initialForm = (fields, row, fixed = {}) => {
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
            : field.type === 'multicheck'
              ? []
              : '';
    }
  });

  return {
    ...form,
    ...(row ? {} : fixed),
  };
};

/* -------------------------------------------------------------------------- */
/* Employee Avatar                                                            */
/* -------------------------------------------------------------------------- */

const EmployeeAvatar = ({ name }) => {
  const initial =
    String(name || '?')
      .trim()
      .charAt(0)
      .toUpperCase() || '?';

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700 shadow-sm ring-2 ring-white">
      {initial}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Employee Cell                                                              */
/* -------------------------------------------------------------------------- */

const EmployeeCell = ({ name }) => (
  <div className="flex min-w-[190px] items-center gap-3">
    <EmployeeAvatar name={name} />

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

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

const StatusPill = ({ status }) => {
  const tone = toneFor(status);

  const styles = {
    green:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    red:
      'border-red-200 bg-red-50 text-red-700',
    amber:
      'border-amber-200 bg-amber-50 text-amber-700',
    blue:
      'border-blue-200 bg-blue-50 text-blue-700',
    lime:
      'border-lime-200 bg-lime-50 text-lime-700',
    orange:
      'border-orange-200 bg-orange-50 text-orange-700',
    slate:
      'border-slate-200 bg-slate-50 text-slate-600',
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

/* -------------------------------------------------------------------------- */
/* Rating                                                                      */
/* -------------------------------------------------------------------------- */

const RatingBadge = ({ rating }) => {
  if (!rating) {
    return (
      <span className="text-sm font-medium text-slate-400">
        Not rated
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 shadow-sm">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={
              star <= Number(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-300'
            }
          />
        ))}
      </div>

      <span className="h-4 w-px bg-amber-200" />

      <span className="text-xs font-bold text-amber-700">
        {rating}/5
      </span>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

const ProgressBar = ({ progress = 0 }) => {
  const value = Math.min(
    100,
    Math.max(0, Number(progress) || 0)
  );

  return (
    <div className="w-40">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">
          Completion
        </span>

        <span className="text-xs font-bold text-slate-700">
          {value}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Form Label                                                                  */
/* -------------------------------------------------------------------------- */

const FormLabel = ({ children, required }) => (
  <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-700">
    {children}

    {required && (
      <span className="ml-1 text-red-500">
        *
      </span>
    )}
  </label>
);

/* -------------------------------------------------------------------------- */
/* Form Control                                                                */
/* -------------------------------------------------------------------------- */

const controlClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const FormField = ({
  field,
  edit,
  lookups,
  setF,
}) => {
  if (
    field.show &&
    !field.show(edit.form)
  ) {
    return null;
  }

  const disabled =
    (edit.row && field.createOnly) ||
    field.readOnly;

  const value =
    edit.form[field.name] ?? '';

  if (field.type === 'checkbox') {
    return (
      <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/20">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(event) =>
            setF(
              field.name,
              event.target.checked
            )
          }
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
        />

        <span className="text-sm font-semibold text-slate-700">
          {field.label}

          {field.required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </span>
      </label>
    );
  }

  if (field.type === 'multicheck') {
    return (
      <fieldset className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <legend className="px-1 text-xs font-bold tracking-wide text-slate-700">
          {field.label}

          {field.required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </legend>

        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-3">
          {field.options.map(
            (option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600"
              >
                <input
                  type="checkbox"
                  checked={(
                    edit.form[
                      field.name
                    ] || []
                  ).includes(option)}
                  onChange={(event) =>
                    setF(
                      field.name,
                      event.target
                        .checked
                        ? [
                            ...(edit.form[
                              field.name
                            ] || []),
                            option,
                          ]
                        : (
                            edit.form[
                              field.name
                            ] || []
                          ).filter(
                            (item) =>
                              item !==
                              option
                          )
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
                />

                {option}
              </label>
            )
          )}
        </div>
      </fieldset>
    );
  }

  const wide =
    field.type === 'textarea'
      ? 'sm:col-span-2'
      : '';

  return (
    <div className={wide}>
      <FormLabel
        required={field.required}
      >
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
            className={`${controlClass} appearance-none pr-10`}
          >
            {resolveOptions(
              field,
              lookups
            ).map((option) => (
              <option
                key={option.value}
                value={
                  option.value
                }
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
      ) : field.type ===
        'textarea' ? (
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
          className={`${controlClass} resize-none leading-6`}
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
          step={field.step}
          min={field.min}
          placeholder={
            field.placeholder ||
            `Enter ${field.label.toLowerCase()}...`
          }
          className={controlClass}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Pure Tailwind Modal                                                         */
/* -------------------------------------------------------------------------- */

const PerformanceFormModal = ({
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
      aria-labelledby="performance-modal-title"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          if (!saving) {
            onClose();
          }
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Icon size={20} />
            </div>

            <div className="min-w-0">
              <h2
                id="performance-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                {title}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                {edit.row
                  ? 'Update the information below.'
                  : 'Add a new performance record.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto bg-white px-5 py-5 sm:px-6">
          {/* Intro */}
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

          {/* Form */}
          <form
            id="performance-form"
            onSubmit={onSave}
            noValidate
            className="rounded-2xl border border-slate-200 bg-white"
          >
            {/* Form heading */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                <UserRound size={15} />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Details
                </p>

                <p className="text-[11px] text-slate-400">
                  Fill in the required information
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-white p-5 sm:grid-cols-2">
              {fields.map(
                (field) => (
                  <FormField
                    key={
                      field.name
                    }
                    field={field}
                    edit={edit}
                    lookups={
                      lookups
                    }
                    setF={setF}
                  />
                )
              )}
            </div>
          </form>

          {/* Error */}
          {error && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              role="alert"
            >
              <X
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span className="leading-5">
                {error}
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <p className="hidden text-xs text-slate-400 sm:block">
            Fields marked with * are required
          </p>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={15} />
              Cancel
            </button>

            <button
              type="submit"
              form="performance-form"
              disabled={saving}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
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
/* Performance Table                                                           */
/* -------------------------------------------------------------------------- */

const PerformanceTable = ({
  title,
  subtitle,
  icon: Icon,
  base,
  addLabel,
  deleteLabel,
  lookups,
  filters = [],
  columns,
  fields,
  rowLocked,
  formDescription,
}) => {
  const confirm = useConfirm();
  const [toast, showToast] =
    useToast();

  const [rows, setRows] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [filterVals, setFilterVals] =
    useState({});
  const [edit, setEdit] =
    useState(null);
  const [error, setError] =
    useState('');
  const [saving, setSaving] =
    useState(false);
  const [tick, setTick] =
    useState(0);

  const reload = useCallback(
    () =>
      setTick(
        (value) => value + 1
      ),
    []
  );

  const queryKey =
    JSON.stringify({
      filterVals,
    });

  useEffect(() => {
    let alive = true;

    const params = {};

    Object.entries(
      filterVals
    ).forEach(
      ([key, value]) => {
        if (value) {
          params[key] =
            value;
        }
      }
    );

    setLoading(true);

    api
      .get(base, { params })
      .then((response) => {
        if (alive) {
          setRows(
            response.data
              .rows || []
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        if (alive) {
          setLoading(false);

          showToast(
            apiError(
              err,
              'Could not load records.'
            ),
            'error'
          );
        }
      });

    return () => {
      alive = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    base,
    queryKey,
    tick,
  ]);

  const openForm = (
    row = null
  ) => {
    setError('');

    setEdit({
      row,
      form: initialForm(
        fields,
        row,
        {}
      ),
    });
  };

  const setF = (
    name,
    value
  ) => {
    setEdit((current) => ({
      ...current,
      form: {
        ...current.form,
        [name]: value,
      },
    }));
  };

  const save = async (
    event
  ) => {
    event.preventDefault();

    if (saving) return;

    const editing =
      !!edit.row;
    const body = {};

    for (const field of fields) {
      if (
        field.show &&
        !field.show(edit.form)
      ) {
        continue;
      }

      if (
        editing &&
        field.createOnly
      ) {
        continue;
      }

      let value =
        edit.form[field.name];

      if (
        field.type ===
        'checkbox'
      ) {
        body[field.name] =
          !!value;
        continue;
      }

      if (
        field.type ===
        'multicheck'
      ) {
        if (!value?.length) {
          setError(
            `Select at least one ${field.label.toLowerCase()}.`
          );
          return;
        }

        body[field.name] =
          value;
        continue;
      }

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

        if (
          editing &&
          [
            'text',
            'textarea',
            'date',
            'email',
            'number',
          ].includes(
            field.type
          )
        ) {
          body[field.name] =
            null;
        }

        continue;
      }

      if (
        field.type ===
        'number'
      ) {
        value = Number(value);
      }

      body[field.name] =
        value;
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
        await api.post(
          base,
          body
        );
      }

      setEdit(null);
      reload();

      showToast(
        editing
          ? 'Saved.'
          : 'Created.'
      );
    } catch (err) {
      setError(
        apiError(err)
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (
    row
  ) => {
    const ok =
      await confirm({
        title: `Delete this ${deleteLabel}?`,
        message:
          'This cannot be undone.',
        confirmLabel:
          'Delete',
        variant: 'danger',
      });

    if (!ok) return;

    try {
      await api.delete(
        `${base}/${row.id}`
      );

      reload();

      showToast(
        'Deleted.'
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
      <Toast toast={toast} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
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
              {filters.map(
                (filter) => (
                  <div
                    key={
                      filter.name
                    }
                    className="relative"
                  >
                    <select
                      value={
                        filterVals[
                          filter.name
                        ] || ''
                      }
                      onChange={(
                        event
                      ) =>
                        setFilterVals(
                          (
                            current
                          ) => ({
                            ...current,
                            [filter.name]:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      aria-label={
                        filter.label
                      }
                      className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-9 text-sm font-medium text-slate-600 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        {filter.label}
                        : All
                      </option>

                      {resolveOptions(
                        {
                          ...filter,
                          optional:
                            false,
                        },
                        lookups
                      ).map(
                        (
                          option
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                )
              )}

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
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {columns.map(
                  (column) => (
                    <th
                      key={
                        column.label
                      }
                      className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {
                        column.label
                      }
                    </th>
                  )
                )}

                <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={
                      columns.length +
                      1
                    }
                    className="px-5 py-14 text-center"
                  >
                    <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                      Loading records…
                    </div>
                  </td>
                </tr>
              ) : rows.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={
                      columns.length +
                      1
                    }
                    className="px-5 py-14 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                        <Icon size={21} />
                      </div>

                      <p className="text-sm font-semibold text-slate-700">
                        Nothing here yet
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Add a new
                        record to
                        get started.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(
                  (row) => {
                    const locked =
                      rowLocked?.(
                        row
                      );

                    return (
                      <tr
                        key={
                          row.id
                        }
                        className="group transition-colors hover:bg-slate-50/60"
                      >
                        {columns.map(
                          (
                            column
                          ) => (
                            <td
                              key={
                                column.label
                              }
                              className={`px-5 py-4 align-middle text-sm ${
                                column.className ||
                                ''
                              }`}
                            >
                              {column.render
                                ? column.render(
                                    row
                                  )
                                : row[
                                      column
                                        .key
                                    ] ??
                                  '—'}
                            </td>
                          )
                        )}

                        <td className="px-5 py-4 align-middle">
                          <div className="flex justify-end gap-1.5">
                            {!locked && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openForm(
                                      row
                                    )
                                  }
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <Pencil
                                    size={
                                      13
                                    }
                                  />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    remove(
                                      row
                                    )
                                  }
                                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                                >
                                  <Trash2
                                    size={
                                      13
                                    }
                                  />
                                  Delete
                                </button>
                              </>
                            )}

                            {locked && (
                              <span className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-400">
                                Locked
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PerformanceFormModal
        edit={edit}
        fields={fields}
        lookups={lookups}
        saving={saving}
        error={error}
        setF={setF}
        onClose={() =>
          setEdit(null)
        }
        onSave={save}
        title={`${edit?.row ? 'Edit' : addLabel}`}
        description={
          formDescription
        }
        icon={Icon}
      />
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Performance Management                                                      */
/* -------------------------------------------------------------------------- */

const PerformanceManagement =
  () => {
    const lookups =
      useLookups([
        'employees',
      ]);

    const emp = {
      name: 'employeeId',
      label: 'Employee',
      type: 'select',
      options: 'employees',
      required: true,
      createOnly: true,
      optional: false,
    };

    const empFilter = [
      {
        name: 'employeeId',
        label: 'Employee',
        options:
          'employees',
      },
    ];

    const [
      activeTab,
      setActiveTab,
    ] = useState('Reviews');

    const tabs = [
      {
        label: 'Reviews',
        icon: CalendarDays,
      },
      {
        label: 'Goals',
        icon: Target,
      },
      {
        label: 'Feedback',
        icon: MessageSquareText,
      },
    ];

    return (
      <AdminPage>
        <div className="w-full">
          {/* Page Header */}
          <div className="mb-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Employee Performance
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Performance
              Management
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
              Reviews, goals and
              feedback for your
              employees.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-5 overflow-x-auto">
            <div
              className="inline-flex min-w-full border-b border-slate-200"
              role="tablist"
            >
              {tabs.map(
                (tab) => {
                  const TabIcon =
                    tab.icon;

                  const active =
                    activeTab ===
                    tab.label;

                  return (
                    <button
                      key={
                        tab.label
                      }
                      type="button"
                      role="tab"
                      aria-selected={
                        active
                      }
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
                      <TabIcon
                        size={
                          16
                        }
                      />

                      {
                        tab.label
                      }

                      {active && (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Reviews */}
          {activeTab ===
            'Reviews' && (
            <PerformanceTable
              title="Performance reviews"
              subtitle="Submitted reviews are locked and the employee is notified."
              icon={CalendarDays}
              base="/hrm/performance-reviews"
              addLabel="New review"
              deleteLabel="review"
              lookups={lookups}
              formDescription="Create a structured performance review for an employee and record their overall rating."
              filters={[
                ...empFilter,
                {
                  name: 'status',
                  label: 'Status',
                  options: [
                    'Draft',
                    'Submitted',
                    'Acknowledged',
                  ],
                },
              ]}
              rowLocked={(row) =>
                row.status !==
                'Draft'
              }
              columns={[
                {
                  label: 'Employee',
                  render: (
                    row
                  ) => (
                    <EmployeeCell
                      name={
                        row.employeeName
                      }
                    />
                  ),
                },
                {
                  label: 'Period',
                  render: (
                    row
                  ) => (
                    <span className="font-semibold text-slate-700">
                      {row.periodLabel ||
                        '—'}
                    </span>
                  ),
                },
                {
                  label: 'Rating',
                  render: (
                    row
                  ) => (
                    <RatingBadge
                      rating={
                        row.rating
                      }
                    />
                  ),
                },
                {
                  label: 'Status',
                  render: (
                    row
                  ) => (
                    <StatusPill
                      status={
                        row.status
                      }
                    />
                  ),
                },
              ]}
              fields={[
                emp,
                {
                  name: 'periodLabel',
                  label:
                    'Review period (e.g. Q3 2026)',
                  required: true,
                },
                {
                  name: 'rating',
                  label: 'Rating',
                  type: 'select',
                  options: [
                    1,
                    2,
                    3,
                    4,
                    5,
                  ].map(
                    (
                      number
                    ) => ({
                      value:
                        number,
                      label: `${number} / 5`,
                    })
                  ),
                },
                {
                  name: 'strengths',
                  label:
                    'Strengths',
                  type: 'textarea',
                },
                {
                  name: 'improvements',
                  label:
                    'Areas to improve',
                  type: 'textarea',
                },
                {
                  name: 'status',
                  label:
                    'Status',
                  type: 'select',
                  options: [
                    'Draft',
                    'Submitted',
                  ],
                  optional: false,
                  default:
                    'Draft',
                },
              ]}
            />
          )}

          {/* Goals */}
          {activeTab ===
            'Goals' && (
            <PerformanceTable
              title="Goals"
              subtitle="You set the goal; the employee updates status and progress from their dashboard."
              icon={Target}
              base="/hrm/performance-goals"
              addLabel="New goal"
              deleteLabel="goal"
              lookups={lookups}
              formDescription="Set a clear performance goal, define its deadline and provide supporting details."
              filters={[
                ...empFilter,
                {
                  name: 'status',
                  label: 'Status',
                  options: [
                    'Not Started',
                    'In Progress',
                    'Completed',
                    'Cancelled',
                  ],
                },
              ]}
              columns={[
                {
                  label: 'Employee',
                  render: (
                    row
                  ) => (
                    <EmployeeCell
                      name={
                        row.employeeName
                      }
                    />
                  ),
                },
                {
                  label: 'Goal',
                  render: (
                    row
                  ) => (
                    <div className="max-w-sm">
                      <p className="truncate font-semibold text-slate-800">
                        {row.title ||
                          '—'}
                      </p>

                      {row.description && (
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {
                            row.description
                          }
                        </p>
                      )}
                    </div>
                  ),
                },
                {
                  label: 'Due',
                  render: (
                    row
                  ) => (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                      <CalendarDays
                        size={
                          13
                        }
                      />
                      {fmtDate(
                        row.dueDate
                      )}
                    </span>
                  ),
                },
                {
                  label:
                    'Progress',
                  render: (
                    row
                  ) => (
                    <ProgressBar
                      progress={
                        row.progress
                      }
                    />
                  ),
                },
                {
                  label: 'Status',
                  render: (
                    row
                  ) => (
                    <StatusPill
                      status={
                        row.status
                      }
                    />
                  ),
                },
              ]}
              fields={[
                emp,
                {
                  name: 'title',
                  label:
                    'Goal title',
                  required: true,
                },
                {
                  name: 'dueDate',
                  label:
                    'Due date',
                  type: 'date',
                },
                {
                  name: 'description',
                  label:
                    'Description',
                  type: 'textarea',
                },
              ]}
            />
          )}

          {/* Feedback */}
          {activeTab ===
            'Feedback' && (
            <PerformanceTable
              title="Feedback"
              subtitle="Share clear, constructive feedback with your employees."
              icon={
                MessageSquareText
              }
              base="/hrm/performance-feedback"
              addLabel="Give feedback"
              deleteLabel="feedback"
              lookups={lookups}
              formDescription="Write clear and constructive feedback that can help the employee understand their performance."
              filters={
                empFilter
              }
              columns={[
                {
                  label: 'Employee',
                  render: (
                    row
                  ) => (
                    <EmployeeCell
                      name={
                        row.employeeName
                      }
                    />
                  ),
                },
                {
                  label:
                    'Feedback',
                  render: (
                    row
                  ) => (
                    <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                          <MessageSquareText
                            size={
                              14
                            }
                          />
                        </div>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Employee
                          feedback
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {row.message ||
                          '—'}
                      </p>
                    </div>
                  ),
                },
                {
                  label: 'Date',
                  render: (
                    row
                  ) => (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                      <CalendarDays
                        size={
                          13
                        }
                      />
                      {fmtDate(
                        String(
                          row.createdAt
                        ).slice(
                          0,
                          10
                        )
                      )}
                    </span>
                  ),
                },
              ]}
              fields={[
                emp,
                {
                  name: 'message',
                  label:
                    'Feedback',
                  type: 'textarea',
                  required: true,
                },
              ]}
            />
          )}
        </div>
      </AdminPage>
    );
  };

export default PerformanceManagement;
