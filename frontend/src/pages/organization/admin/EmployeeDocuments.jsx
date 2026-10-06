
import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Eye,
  FileText,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';

import api from '../../../Config/apiConfig';
import AdminPage from '../../../shared/ModuleKit/AdminPage';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Toast } from '../../../shared/HrUi/HrUi';
import {
  apiError,
  fmtDate,
  useToast,
} from '../../../utils/hrFormat';
import { useLookups } from '../../../utils/moduleHooks';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const TYPES = [
  'Contract',
  'ID / Identity',
  'Certificate',
  'Resume / CV',
  'Medical',
  'Tax',
  'Other',
];

const kb = (n) =>
  n > 1048576
    ? `${(n / 1048576).toFixed(1)} MB`
    : `${Math.max(
        1,
        Math.round(n / 1024)
      )} KB`;

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

/* -------------------------------------------------------------------------- */
/* Status / Expiry Pill                                                       */
/* -------------------------------------------------------------------------- */

const ExpiryPill = ({
  expiryDate,
  today,
}) => {
  if (!expiryDate) {
    return (
      <span className="text-sm text-slate-400">
        —
      </span>
    );
  }

  const expired =
    expiryDate < today;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
        expired
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      <CalendarDays size={13} />

      {fmtDate(expiryDate)}

      {expired && (
        <>
          <span className="h-1 w-1 rounded-full bg-current" />
          expired
        </>
      )}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Employee Cell                                                              */
/* -------------------------------------------------------------------------- */

const EmployeeCell = ({
  name,
}) => {
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
/* Document Type Badge                                                        */
/* -------------------------------------------------------------------------- */

const DocumentType = ({
  type,
}) => (
  <span className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
    {type || 'Other'}
  </span>
);

/* -------------------------------------------------------------------------- */
/* Upload Modal                                                               */
/* -------------------------------------------------------------------------- */

const UploadModal = ({
  up,
  setUp,
  lookups,
  busy,
  err,
  setErr,
  onClose,
  onSubmit,
}) => {
  if (!up) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-document-title"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Upload size={20} />
            </div>

            <div>
              <h2
                id="upload-document-title"
                className="text-lg font-bold text-slate-900"
              >
                Upload employee document
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Add a private document to an employee profile.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto bg-white px-5 py-5 sm:px-6">
          {/* Info */}
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
              <FileText size={15} />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                Document information
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Supported files are PDF, JPG and PNG. Maximum file size is 10 MB.
              </p>
            </div>
          </div>

          <form
            id="employee-document-form"
            onSubmit={onSubmit}
            noValidate
            className="rounded-2xl border border-slate-200 bg-white"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                <UserRound size={15} />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  File details
                </p>

                <p className="text-[11px] text-slate-400">
                  Complete the required information
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* Employee */}
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-700">
                  Employee
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <select
                    value={
                      up.employeeId
                    }
                    onChange={(event) => {
                      setErr('');
                      setUp({
                        ...up,
                        employeeId:
                          event.target
                            .value,
                      });
                    }}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="">
                      — Select employee —
                    </option>

                    {(
                      lookups.employees ||
                      []
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
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-700">
                  Document title
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={up.title}
                  onChange={(event) => {
                    setErr('');
                    setUp({
                      ...up,
                      title:
                        event.target
                          .value,
                    });
                  }}
                  placeholder="e.g. Employment Contract"
                  className={inputClass}
                />
              </div>

              {/* Type + Expiry */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-700">
                    Document type
                  </label>

                  <div className="relative">
                    <select
                      value={
                        up.docType
                      }
                      onChange={(event) =>
                        setUp({
                          ...up,
                          docType:
                            event.target
                              .value,
                        })
                      }
                      className={`${inputClass} appearance-none pr-10`}
                    >
                      {TYPES.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-700">
                    Expiry date
                  </label>

                  <input
                    type="date"
                    value={
                      up.expiryDate
                    }
                    onChange={(event) =>
                      setUp({
                        ...up,
                        expiryDate:
                          event.target
                            .value,
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* File */}
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-slate-700">
                  File
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 transition hover:border-blue-300 hover:bg-blue-50/20">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                      <Upload size={18} />
                    </div>

                    <p className="text-sm font-semibold text-slate-700">
                      Choose a document
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      PDF, JPG or PNG · Up to 10 MB
                    </p>

                    <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                      <Upload size={14} />
                      Browse file

                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={(event) => {
                          setErr('');

                          setUp({
                            ...up,
                            file:
                              event
                                .target
                                .files?.[0] ||
                              null,
                          });
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {up.file && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText
                          size={15}
                          className="shrink-0 text-emerald-600"
                        />

                        <p className="truncate text-xs font-semibold text-emerald-700">
                          {up.file.name}
                        </p>
                      </div>

                      <span className="shrink-0 text-[11px] font-bold text-emerald-600">
                        {kb(up.file.size)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {err && (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-700"
                  role="alert"
                >
                  {err}
                </div>
              )}
            </div>
          </form>
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
              disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <X size={15} />
              Cancel
            </button>

            <button
              type="submit"
              form="employee-document-form"
              disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:via-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={15} />

              {busy
                ? 'Uploading…'
                : 'Upload document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

const EmployeeDocuments = () => {
  const lookups =
    useLookups(['employees']);

  const confirm = useConfirm();

  const [toast, showToast] =
    useToast();

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [emp, setEmp] =
    useState('');

  const [tick, setTick] =
    useState(0);

  const [up, setUp] =
    useState(null);

  const [err, setErr] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const reload = useCallback(
    () =>
      setTick(
        (value) => value + 1
      ),
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Load Documents                                                           */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    setLoading(true);

    api
      .get('/hrm/documents', {
        params: emp
          ? {
              employeeId: emp,
            }
          : {},
      })
      .then((response) => {
        if (!alive) return;

        setRows(
          response.data.documents ||
            []
        );

        setLoading(false);
      })
      .catch((error) => {
        if (!alive) return;

        setLoading(false);

        showToast(
          apiError(
            error,
            'Could not load documents.'
          ),
          'error'
        );
      });

    return () => {
      alive = false;
    };
  }, [
    emp,
    tick,
    showToast,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Upload                                                                   */
  /* ------------------------------------------------------------------------ */

  const submit = async (event) => {
    event.preventDefault();

    if (busy) return;

    if (!up.employeeId) {
      setErr(
        'Select an employee.'
      );
      return;
    }

    if (
      up.title.trim().length < 2
    ) {
      setErr(
        'Enter a title.'
      );
      return;
    }

    if (!up.file) {
      setErr(
        'Choose a file.'
      );
      return;
    }

    if (
      up.file.size >
      10 * 1024 * 1024
    ) {
      setErr(
        'File must be 10 MB or smaller.'
      );
      return;
    }

    const fd =
      new FormData();

    fd.append(
      'employeeId',
      up.employeeId
    );

    fd.append(
      'title',
      up.title.trim()
    );

    fd.append(
      'docType',
      up.docType
    );

    if (up.expiryDate) {
      fd.append(
        'expiryDate',
        up.expiryDate
      );
    }

    fd.append(
      'file',
      up.file
    );

    setBusy(true);
    setErr('');

    try {
      await api.post(
        '/hrm/documents',
        fd,
        {
          headers: {
            'Content-Type':
              undefined,
          },
          timeout: 120000,
        }
      );

      setUp(null);
      reload();

      showToast(
        'Document uploaded.'
      );
    } catch (error) {
      setErr(
        apiError(error)
      );
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* View                                                                     */
  /* ------------------------------------------------------------------------ */

  const view = async (id) => {
    try {
      const response =
        await api.get(
          `/hrm/documents/${id}/url`
        );

      window.open(
        response.data.url,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      showToast(
        apiError(error),
        'error'
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Delete                                                                   */
  /* ------------------------------------------------------------------------ */

  const remove = async (document) => {
    const ok =
      await confirm({
        title:
          'Delete document?',
        message: `“${document.title}” will be permanently deleted.`,
        confirmLabel:
          'Delete',
        variant: 'danger',
      });

    if (!ok) return;

    try {
      await api.delete(
        `/hrm/documents/${document.id}`
      );

      reload();

      showToast(
        'Document deleted.'
      );
    } catch (error) {
      showToast(
        apiError(error),
        'error'
      );
    }
  };

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  return (
    <AdminPage>
      <Toast toast={toast} />

      <div className="w-full">
        {/* Page Header */}
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Employee Records
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Employee Documents
          </h1>

          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
            Securely manage employee documents,
            certificates, identity files and other
            important records.
          </p>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Card Header */}
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <FileText size={19} />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Documents
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    View, upload and manage employee files.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Employee Filter */}
                <div className="relative">
                  <select
                    value={emp}
                    onChange={(event) => {
                      setLoading(true);
                      setEmp(
                        event.target
                          .value
                      );
                    }}
                    aria-label="Employee"
                    className="h-10 min-w-[190px] appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-10 text-sm font-medium text-slate-600 shadow-sm outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">
                      All employees
                    </option>

                    {(
                      lookups.employees ||
                      []
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
                    size={15}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => {
                    setErr('');

                    setUp({
                      employeeId: emp,
                      title: '',
                      docType:
                        'Other',
                      expiryDate:
                        '',
                      file: null,
                    });
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:via-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <Upload size={15} />
                  Upload document
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Employee
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Document
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Type
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Size
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Expiry
                  </th>

                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Uploaded
                  </th>

                  <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center"
                    >
                      <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                        Loading documents…
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                          <FileText size={21} />
                        </div>

                        <p className="text-sm font-semibold text-slate-700">
                          No documents found
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Upload an employee document to get started.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setErr('');

                            setUp({
                              employeeId:
                                emp,
                              title:
                                '',
                              docType:
                                'Other',
                              expiryDate:
                                '',
                              file: null,
                            });
                          }}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:via-indigo-600 hover:to-purple-700"
                        >
                          <Upload size={14} />
                          Upload document
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((document) => (
                    <tr
                      key={document.id}
                      className="group transition-colors hover:bg-slate-50/60"
                    >
                      {/* Employee */}
                      <td className="px-5 py-4 align-middle">
                        <EmployeeCell
                          name={
                            document.employeeName
                          }
                        />
                      </td>

                      {/* Document */}
                      <td className="px-5 py-4 align-middle">
                        <div className="flex min-w-[220px] items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                            <FileText
                              size={16}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {document.title ||
                                'Untitled document'}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              Private document
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4 align-middle">
                        <DocumentType
                          type={
                            document.docType
                          }
                        />
                      </td>

                      {/* Size */}
                      <td className="px-5 py-4 align-middle">
                        <span className="text-sm font-medium text-slate-600">
                          {kb(
                            document.sizeBytes
                          )}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="px-5 py-4 align-middle">
                        <ExpiryPill
                          expiryDate={
                            document.expiryDate
                          }
                          today={today}
                        />
                      </td>

                      {/* Uploaded */}
                      <td className="px-5 py-4 align-middle">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                          <CalendarDays
                            size={13}
                          />
                          {fmtDate(
                            String(
                              document.createdAt
                            ).slice(
                              0,
                              10
                            )
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 align-middle">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              view(
                                document.id
                              )
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye size={13} />
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              remove(
                                document
                              )
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                          >
                            <Trash2
                              size={13}
                            />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Note */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6">
            <div className="flex items-start gap-2">
              <FileText
                size={14}
                className="mt-0.5 shrink-0 text-slate-400"
              />

              <p className="text-xs leading-5 text-slate-500">
                Files are stored privately. Document links are generated on demand and expire after two minutes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        up={up}
        setUp={setUp}
        lookups={lookups}
        busy={busy}
        err={err}
        setErr={setErr}
        onClose={() => {
          if (!busy) {
            setUp(null);
            setErr('');
          }
        }}
        onSubmit={submit}
      />
    </AdminPage>
  );
};

export default EmployeeDocuments;
