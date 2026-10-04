
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import api from '../../Config/apiConfig';
import Button from '../Button/Button';
import Card from '../Card/Card';
import Table from '../Table/Table';
import { useConfirm } from '../ConfirmDialog/ConfirmDialog';
import { Toast } from '../HrUi/HrUi';
import { apiError, useToast } from '../../utils/hrFormat';

/* -------------------------------------------------------------------------- */
/* Pill                                                                       */
/* -------------------------------------------------------------------------- */

export const Pill = ({
  children,
  tone = 'slate',
}) => {
  const tones = {
    green:
      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    red:
      'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    amber:
      'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    blue:
      'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    slate:
      'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200',
    lime:
      'bg-lime-50 text-lime-800 ring-1 ring-inset ring-lime-200',
    orange:
      'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        whitespace-nowrap
        rounded-full
        px-2.5
        py-1
        text-xs
        font-semibold
        ${tones[tone] || tones.slate}
      `}
    >
      {children}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const resolveOptions = (
  f,
  lookups
) => {
  const raw =
    typeof f.options === 'string'
      ? lookups[f.options] || []
      : f.options || [];

  const opts = raw.map((o) =>
    typeof o === 'object'
      ? o
      : {
          value: o,
          label: o,
        }
  );

  return f.optional === false
    ? opts
    : [
        {
          value: '',
          label:
            f.emptyLabel ||
            '— Select —',
        },
        ...opts,
      ];
};

const initialForm = (
  fields,
  row,
  fixed
) => {
  const f = {};

  fields.forEach((x) => {
    if (row) {
      f[x.name] =
        row[x.name] ?? '';
    } else {
      f[x.name] =
        x.default !== undefined
          ? typeof x.default ===
            'function'
            ? x.default()
            : x.default
          : x.type === 'checkbox'
            ? false
            : x.type ===
                'multicheck'
              ? []
              : '';
    }
  });

  return {
    ...f,
    ...(row ? {} : fixed),
  };
};

/* -------------------------------------------------------------------------- */
/* Form UI                                                                    */
/* -------------------------------------------------------------------------- */

const FieldLabel = ({
  label,
  required,
}) => (
  <label className="mb-2 block">
    <span className="text-[13px] font-bold tracking-wide text-slate-700">
      {label}
    </span>

    {required && (
      <span className="ml-1 text-red-500">
        *
      </span>
    )}
  </label>
);

const fieldClass = `
  w-full
  rounded-xl
  border
  border-slate-200
  bg-white
  px-3.5
  py-3
  text-sm
  font-medium
  text-slate-900
  shadow-sm
  outline-none
  transition-all
  duration-200
  placeholder:text-slate-400
  hover:border-slate-300
  focus:border-blue-500
  focus:ring-4
  focus:ring-blue-50
  disabled:cursor-not-allowed
  disabled:bg-slate-50
  disabled:text-slate-400
`;

const FormField = ({
  label,
  required = false,
  value,
  onChange,
  type = 'text',
  options = [],
  disabled = false,
  step,
  min,
  rows = 5,
}) => {
  return (
    <div>
      <FieldLabel
        label={label}
        required={required}
      />

      {type === 'select' ? (
        <div className="relative">
          <select
            value={value ?? ''}
            onChange={onChange}
            disabled={disabled}
            className={`${fieldClass} appearance-none pr-10`}
          >
            {options.map((o) => (
              <option
                key={o.value}
                value={o.value}
              >
                {o.label}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      ) : type === 'textarea' ? (
        <textarea
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          rows={rows}
          className={`${fieldClass} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          step={step}
          min={min}
          className={fieldClass}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Professional Modal                                                         */
/* -------------------------------------------------------------------------- */

const FormModal = ({
  edit,
  title,
  addLabel,
  fields,
  lookups,
  error,
  saving,
  setF,
  save,
  closeForm,
}) => {
  if (!edit) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-slate-950/60
        p-4
        backdrop-blur-[3px]
      "
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Container */}
      <div
        className="
          relative
          flex
          max-h-[92vh]
          w-full
          max-w-[780px]
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_30px_80px_rgba(15,23,42,0.28)]
        "
      >
        {/* ================================================================ */}
        {/* HEADER                                                            */}
        {/* ================================================================ */}

        <div className="relative shrink-0 overflow-hidden border-b border-slate-200 bg-white px-6 py-5">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-blue-50 blur-2xl" />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-600
                  text-white
                  shadow-lg
                  shadow-blue-600/20
                "
              >
                {edit.row ? (
                  <Pencil className="h-5 w-5" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">
                <div className="mb-1">
                  <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-inset ring-blue-100">
                    {edit.row
                      ? 'Edit record'
                      : 'New record'}
                  </span>
                </div>

                <h2 className="truncate text-xl font-bold tracking-tight text-slate-950">
                  {edit.row
                    ? `Edit ${title}`
                    : addLabel}
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  {edit.row
                    ? 'Update the information below and save your changes.'
                    : 'Complete the information below to create a new record.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="
                shrink-0
                rounded-xl
                border
                border-slate-200
                bg-white
                p-2
                text-slate-400
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-700
                focus:outline-none
                focus:ring-4
                focus:ring-blue-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* FORM                                                              */}
        {/* ================================================================ */}

        <form
          onSubmit={save}
          noValidate
          className="flex min-h-0 flex-1 flex-col bg-white"
        >
          {/* Scroll Area */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-6">
            {/* Info Banner */}
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                <Check className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Form information
                </p>

                <p className="mt-0.5 text-sm text-slate-600">
                  Fields marked with{' '}
                  <span className="font-bold text-red-500">
                    *
                  </span>{' '}
                  are required.
                </p>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
              {fields
                .filter(
                  (f) =>
                    !f.show ||
                    f.show(edit.form)
                )
                .map((f) => {
                  /* -------------------------------------------------------- */
                  /* Checkbox                                                  */
                  /* -------------------------------------------------------- */

                  if (
                    f.type ===
                    'checkbox'
                  ) {
                    return (
                      <div
                        key={f.name}
                        className="sm:col-span-2"
                      >
                        <label
                          className="
                            group
                            flex
                            cursor-pointer
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-slate-200
                            bg-slate-50
                            px-4
                            py-3.5
                            transition
                            hover:border-blue-200
                            hover:bg-blue-50/40
                          "
                        >
                          <input
                            type="checkbox"
                            checked={
                              !!edit
                                .form[
                                f.name
                              ]
                            }
                            onChange={(
                              e
                            ) =>
                              setF(
                                f.name,
                                e.target
                                  .checked
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-100"
                          />

                          <span className="text-sm font-semibold text-slate-700">
                            {f.label}
                          </span>
                        </label>
                      </div>
                    );
                  }

                  /* -------------------------------------------------------- */
                  /* Multi Check                                               */
                  /* -------------------------------------------------------- */

                  if (
                    f.type ===
                    'multicheck'
                  ) {
                    return (
                      <fieldset
                        key={f.name}
                        className="sm:col-span-2"
                      >
                        <FieldLabel
                          label={
                            f.label
                          }
                          required={
                            f.required
                          }
                        />

                        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
                          {f.options.map(
                            (o) => {
                              const checked =
                                (
                                  edit
                                    .form[
                                    f.name
                                  ] ||
                                  []
                                ).includes(
                                  o
                                );

                              return (
                                <label
                                  key={o}
                                  className={`
                                    flex
                                    cursor-pointer
                                    items-center
                                    gap-3
                                    rounded-xl
                                    border
                                    px-3.5
                                    py-3
                                    text-sm
                                    transition-all
                                    ${
                                      checked
                                        ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                                        : 'border-transparent bg-white text-slate-700 hover:border-slate-200 hover:shadow-sm'
                                    }
                                  `}
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      checked
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      setF(
                                        f.name,
                                        e
                                          .target
                                          .checked
                                          ? [
                                              ...(edit
                                                .form[
                                                f.name
                                              ] ||
                                                []),
                                              o,
                                            ]
                                          : (
                                              edit
                                                .form[
                                                f.name
                                              ] ||
                                              []
                                            ).filter(
                                              (
                                                x
                                              ) =>
                                                x !==
                                                o
                                            )
                                      )
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />

                                  <span className="font-medium">
                                    {o}
                                  </span>
                                </label>
                              );
                            }
                          )}
                        </div>
                      </fieldset>
                    );
                  }

                  /* -------------------------------------------------------- */
                  /* Normal Field                                              */
                  /* -------------------------------------------------------- */

                  const disabled =
                    (edit.row &&
                      f.createOnly) ||
                    f.readOnly;

                  const wide =
                    f.type ===
                    'textarea';

                  return (
                    <div
                      key={f.name}
                      className={
                        wide
                          ? 'sm:col-span-2'
                          : ''
                      }
                    >
                      <FormField
                        label={
                          f.label
                        }
                        required={
                          f.required
                        }
                        value={
                          edit.form[
                            f.name
                          ] ?? ''
                        }
                        onChange={(
                          e
                        ) =>
                          setF(
                            f.name,
                            e.target
                              .value
                          )
                        }
                        disabled={
                          disabled
                        }
                        type={
                          f.type ||
                          'text'
                        }
                        step={
                          f.step
                        }
                        min={
                          f.min
                        }
                        options={
                          f.type ===
                          'select'
                            ? resolveOptions(
                                f,
                                lookups
                              )
                            : []
                        }
                      />

                      {f.readOnly &&
                        edit.row && (
                          <p className="mt-1.5 text-xs font-medium text-slate-400">
                            This field cannot be changed.
                          </p>
                        )}

                      {edit.row &&
                        f.createOnly && (
                          <p className="mt-1.5 text-xs font-medium text-slate-400">
                            Only available when creating a record.
                          </p>
                        )}
                    </div>
                  );
                })}
            </div>

            {/* Error */}
            {error && (
              <div
                className="
                  mt-6
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3.5
                "
                role="alert"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 shadow-sm">
                  <AlertCircle className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                    Unable to save
                  </p>

                  <p className="mt-0.5 text-sm font-medium leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* FOOTER                                                           */}
          {/* ================================================================ */}

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden text-xs font-medium text-slate-400 sm:block">
              Review the information before saving.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-slate-300
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-slate-700
                  shadow-sm
                  transition
                  hover:border-slate-400
                  hover:bg-slate-50
                  focus:outline-none
                  focus:ring-4
                  focus:ring-slate-100
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
                  min-w-[135px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  shadow-sm
                  shadow-blue-600/20
                  transition
                  hover:bg-blue-700
                  focus:outline-none
                  focus:ring-4
                  focus:ring-blue-100
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {edit.row
                      ? 'Save changes'
                      : 'Create record'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Module Table                                                               */
/* -------------------------------------------------------------------------- */

const ModuleTable = ({
  title,
  subtitle,
  base,
  query = {},
  columns,
  fields,
  fixed = {},
  lookups = {},
  addLabel = 'Add',
  canCreate = true,
  canEdit = true,
  canDelete = true,
  rowLocked,
  rowActions,
  toolbar,
  emptyText = 'Nothing here yet.',
  reloadKey = 0,
  onChanged,
  filters = [],
  deleteLabel = 'record',
}) => {
  const confirm =
    useConfirm();

  const [toast, showToast] =
    useToast();

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [tick, setTick] =
    useState(0);

  const [filterVals, setFilterVals] =
    useState({});

  const [edit, setEdit] =
    useState(null);

  const [error, setError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const reload = useCallback(
    () =>
      setTick(
        (t) => t + 1
      ),
    []
  );

  const queryKey =
    JSON.stringify({
      query,
      filterVals,
    });

  useEffect(() => {
    let alive = true;

    const params = {
      ...query,
    };

    Object.entries(
      filterVals
    ).forEach(
      ([k, v]) => {
        if (v) {
          params[k] = v;
        }
      }
    );

    api
      .get(base, { params })
      .then((r) => {
        if (alive) {
          setRows(
            r.data.rows
          );

          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setLoading(false);

          showToast(
            apiError(
              e,
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
    reloadKey,
  ]);

  const openForm = (
    row
  ) => {
    setError('');

    setEdit({
      row,
      form: initialForm(
        fields,
        row,
        fixed
      ),
    });
  };

  const setF = (
    name,
    value
  ) => {
    setEdit((e) => ({
      ...e,
      form: {
        ...e.form,
        [name]: value,
      },
    }));
  };

  const closeForm = () => {
    if (saving) return;

    setEdit(null);
    setError('');
  };

  const save = async (
    ev
  ) => {
    ev.preventDefault();

    if (saving) return;

    const editing =
      !!edit.row;

    const body = {};

    for (const f of fields) {
      if (
        f.show &&
        !f.show(edit.form)
      ) {
        continue;
      }

      if (
        editing &&
        f.createOnly
      ) {
        continue;
      }

      let v =
        edit.form[f.name];

      if (
        f.type ===
        'checkbox'
      ) {
        body[f.name] =
          !!v;

        continue;
      }

      if (
        f.type ===
        'multicheck'
      ) {
        if (!v?.length) {
          return setError(
            `Select at least one ${f.label.toLowerCase()}.`
          );
        }

        body[f.name] =
          v;

        continue;
      }

      if (
        v === '' ||
        v === undefined
      ) {
        if (
          f.required &&
          !f.readOnly
        ) {
          return setError(
            `${f.label} is required.`
          );
        }

        if (
          editing &&
          [
            'text',
            'textarea',
            'date',
            'email',
            'number',
          ].includes(f.type)
        ) {
          body[f.name] =
            null;
        }

        continue;
      }

      if (
        f.type ===
        'number'
      ) {
        v = Number(v);
      }

      body[f.name] =
        v;
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
          {
            ...fixed,
            ...body,
          }
        );
      }

      setEdit(null);

      reload();

      onChanged?.();

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

  const remove =
    async (row) => {
      const ok =
        await confirm({
          title: `Delete this ${deleteLabel}?`,
          message:
            'This cannot be undone.',
          confirmLabel:
            'Delete',
          variant:
            'danger',
        });

      if (!ok) return;

      try {
        await api.delete(
          `${base}/${row.id}`
        );

        reload();

        onChanged?.();

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

  const helpers =
    useMemo(
      () => ({
        reload,
        toast: showToast,
        rows,
      }),
      [
        reload,
        showToast,
        rows,
      ]
    );

  const headers = [
    ...columns.map(
      (c) => c.label
    ),
    '',
  ];

  return (
    <>
      <Toast
        toast={toast}
      />

      <Card
        title={title}
        subtitle={
          subtitle
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {filters.map(
              (f) => (
                <select
                  key={
                    f.name
                  }
                  value={
                    filterVals[
                      f.name
                    ] || ''
                  }
                  onChange={(
                    e
                  ) => {
                    setLoading(
                      true
                    );

                    setFilterVals(
                      (v) => ({
                        ...v,
                        [f.name]:
                          e.target
                            .value,
                      })
                    );
                  }}
                  className="
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2
                    text-sm
                    font-medium
                    text-slate-700
                    shadow-sm
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-50
                  "
                  aria-label={
                    f.label
                  }
                >
                  <option value="">
                    {f.label}: All
                  </option>

                  {resolveOptions(
                    {
                      ...f,
                      optional:
                        false,
                    },
                    lookups
                  ).map(
                    (o) => (
                      <option
                        key={
                          o.value
                        }
                        value={
                          o.value
                        }
                      >
                        {
                          o.label
                        }
                      </option>
                    )
                  )}
                </select>
              )
            )}

            {toolbar}

            {canCreate && (
              <Button
                size="small"
                onClick={() =>
                  openForm(
                    null
                  )
                }
              >
                <span className="inline-flex items-center gap-1">
                  <Plus
                    size={14}
                  />
                  {addLabel}
                </span>
              </Button>
            )}
          </div>
        }
      >
        <Table
          headers={headers}
          data={rows}
          emptyMessage={
            loading
              ? 'Loading…'
              : emptyText
          }
          renderRow={(
            row
          ) => {
            const locked =
              rowLocked?.(
                row
              );

            const actions =
              rowActions?.(
                row,
                helpers
              ) || [];

            return (
              <tr
                key={row.id}
              >
                {columns.map(
                  (c) => (
                    <td
                      key={
                        c.label
                      }
                      className={
                        c.className
                      }
                    >
                      {c.render
                        ? c.render(
                            row
                          )
                        : row[
                            c.key
                          ] ??
                          '—'}
                    </td>
                  )
                )}

                <td>
                  <div className="flex flex-wrap justify-end gap-2">
                    {actions
                      .filter(
                        (a) =>
                          !a.hidden
                      )
                      .map(
                        (a) => (
                          <Button
                            key={
                              a.label
                            }
                            size="small"
                            variant={
                              a.variant ||
                              'outline'
                            }
                            onClick={
                              a.onClick
                            }
                          >
                            {
                              a.label
                            }
                          </Button>
                        )
                      )}

                    {canEdit &&
                      !locked && (
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() =>
                            openForm(
                              row
                            )
                          }
                        >
                          <span className="inline-flex items-center gap-1">
                            <Pencil
                              size={
                                13
                              }
                            />
                            Edit
                          </span>
                        </Button>
                      )}

                    {canDelete &&
                      !locked && (
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() =>
                            remove(
                              row
                            )
                          }
                        >
                          <span className="inline-flex items-center gap-1">
                            <Trash2
                              size={
                                13
                              }
                            />
                            Delete
                          </span>
                        </Button>
                      )}
                  </div>
                </td>
              </tr>
            );
          }}
        />
      </Card>

      {/* ================================================================== */}
      {/* WHITE PROFESSIONAL FORM MODAL                                     */}
      {/* ================================================================== */}

      <FormModal
        edit={edit}
        title={title}
        addLabel={addLabel}
        fields={fields}
        lookups={lookups}
        error={error}
        saving={saving}
        setF={setF}
        save={save}
        closeForm={
          closeForm
        }
      />
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Tabbed Page                                                                */
/* -------------------------------------------------------------------------- */

export const TabbedPage = ({
  title,
  subtitle,
  tabs,
}) => {
  const [i, setI] =
    useState(0);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-2 text-gray-600">
            {subtitle}
          </p>
        )}
      </div>

      {tabs.length > 1 && (
        <div
          className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200"
          role="tablist"
        >
          {tabs.map(
            (t, idx) => (
              <button
                key={
                  t.label
                }
                role="tab"
                aria-selected={
                  i === idx
                }
                onClick={() =>
                  setI(
                    idx
                  )
                }
                className={`
                  -mb-px
                  whitespace-nowrap
                  border-b-2
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  transition
                  ${
                    i === idx
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }
                `}
              >
                {
                  t.label
                }
              </button>
            )
          )}
        </div>
      )}

      {
        tabs[i]
          .content
      }
    </>
  );
};

export default ModuleTable;
