
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Plus, ShieldCheck, X, Building2, BriefcaseBusiness } from 'lucide-react';

import api from '../../../Config/apiConfig';
import { AppContext } from '../../../context/AppContext';
import { STAFF_ROLES } from '../../../Config/constant';
import DashboardLayout from '../../../layouts/DashboardLayout';
import Card from '../../../shared/Card/Card';
import { StatusBadge, Toast } from '../../../shared/HrUi/HrUi';
import { apiError, useToast } from '../../../utils/hrFormat';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';

const TABS = ['Departments', 'Designations', 'Roles'];

/* -------------------------------------------------------------------------- */
/* Reusable Form Field                                                        */
/* -------------------------------------------------------------------------- */

const Field = ({
  label,
  required = false,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  rows = 4,
  disabled = false,
}) => {
  const inputClassName = `
    w-full rounded-lg border border-slate-300 bg-white
    px-3.5 py-2.5 text-sm text-slate-900
    placeholder:text-slate-400
    shadow-sm outline-none transition
    focus:border-blue-500 focus:ring-2 focus:ring-blue-100
    disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500
  `;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={`${inputClassName} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Select Field                                                               */
/* -------------------------------------------------------------------------- */

const SelectField = ({
  label,
  required = false,
  value,
  onChange,
  options = [],
  disabled = false,
}) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <select
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className="
          w-full rounded-lg border border-slate-300 bg-white
          px-3.5 py-2.5 text-sm text-slate-900
          shadow-sm outline-none transition
          focus:border-blue-500 focus:ring-2 focus:ring-blue-100
          disabled:cursor-not-allowed disabled:bg-slate-100
          disabled:text-slate-500
        "
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Section Header                                                             */
/* -------------------------------------------------------------------------- */

const SectionHeader = ({ title, description }) => (
  <div className="mb-5 border-b border-slate-200 pb-3">
    <h3 className="text-base font-bold text-slate-900">{title}</h3>

    {description && (
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Empty Table State                                                          */
/* -------------------------------------------------------------------------- */

const EmptyTableState = ({ loading, type }) => (
  <tr>
    <td colSpan={6} className="px-6 py-16 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          {type === 'department' ? (
            <Building2 size={24} className="text-slate-400" />
          ) : (
            <BriefcaseBusiness size={24} className="text-slate-400" />
          )}
        </div>

        <p className="text-sm font-semibold text-slate-700">
          {loading
            ? `Loading ${type}s...`
            : `No ${type}s found`}
        </p>

        {!loading && (
          <p className="mt-1 text-xs text-slate-400">
            Create your first {type} to get started.
          </p>
        )}
      </div>
    </td>
  </tr>
);

/* -------------------------------------------------------------------------- */
/* Main Component                                                             */
/* -------------------------------------------------------------------------- */

const OrgStructure = () => {
  const { currentUser } = useContext(AppContext);
  const [toast, showToast] = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState(0);

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Reload                                                                   */
  /* ------------------------------------------------------------------------ */

  const reload = useCallback(() => {
    setTick((current) => current + 1);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Load Data                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let alive = true;

    setLoading(true);

    Promise.all([
      api.get('/hr/departments'),
      api.get('/hr/designations'),
      api.get('/hr/employees'),
    ])
      .then(([departmentResponse, designationResponse, employeeResponse]) => {
        if (!alive) return;

        setDepartments(
          departmentResponse.data?.departments || []
        );

        setDesignations(
          designationResponse.data?.designations || []
        );

        setEmployees(
          employeeResponse.data?.employees || []
        );

        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;

        setLoading(false);

        showToast(
          apiError(
            err,
            'Could not load organization structure.'
          ),
          'error'
        );
      });

    return () => {
      alive = false;
    };
  }, [tick, showToast]);

  /* ------------------------------------------------------------------------ */
  /* Department Map                                                           */
  /* ------------------------------------------------------------------------ */

  const deptName = useMemo(
    () =>
      new Map(
        departments.map((department) => [
          department.id,
          department.name,
        ])
      ),
    [departments]
  );

  /* ------------------------------------------------------------------------ */
  /* Role Counts                                                              */
  /* ------------------------------------------------------------------------ */

  const roleCounts = useMemo(() => {
    const counts = {};

    employees.forEach((employee) => {
      counts[employee.role] =
        (counts[employee.role] || 0) + 1;
    });

    return counts;
  }, [employees]);

  /* ------------------------------------------------------------------------ */
  /* Open Department                                                          */
  /* ------------------------------------------------------------------------ */

  const openDept = (department = null) => {
    setError('');

    setEdit({
      kind: 'dept',
      id: department?.id,
      name: department?.name || '',
      description: department?.description || '',
      status: department?.status || 'Active',
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Open Designation                                                         */
  /* ------------------------------------------------------------------------ */

  const openDesig = (designation = null) => {
    setError('');

    setEdit({
      kind: 'desig',
      id: designation?.id,
      title: designation?.title || '',
      description: designation?.description || '',
      departmentId: designation?.departmentId || '',
      status: designation?.status || 'Active',
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Close Modal                                                              */
  /* ------------------------------------------------------------------------ */

  const closeEdit = () => {
    if (saving) return;

    setError('');
    setEdit(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Form Field Update                                                        */
  /* ------------------------------------------------------------------------ */

  const setF = (key) => (event) => {
    const value = event.target.value;

    setEdit((current) => {
      if (!current) return current;

      return {
        ...current,
        [key]: value,
      };
    });
  };

  /* ------------------------------------------------------------------------ */
  /* Save Department / Designation                                            */
  /* ------------------------------------------------------------------------ */

  const save = async (event) => {
    event.preventDefault();

    if (saving || !edit) return;

    const isDept = edit.kind === 'dept';

    const label = isDept
      ? edit.name
      : edit.title;

    if (!label || label.trim().length < 2) {
      setError(
        `${isDept ? 'Name' : 'Title'} must be at least 2 characters.`
      );

      return;
    }

    setSaving(true);
    setError('');

    const base = isDept
      ? '/hr/departments'
      : '/hr/designations';

    const body = isDept
      ? {
          name: edit.name.trim(),
          description:
            edit.description?.trim() || null,
          status: edit.status,
        }
      : {
          title: edit.title.trim(),
          description:
            edit.description?.trim() || null,
          departmentId:
            edit.departmentId || null,
          status: edit.status,
        };

    try {
      if (edit.id) {
        await api.patch(
          `${base}/${edit.id}`,
          body
        );
      } else {
        await api.post(base, body);
      }

      setEdit(null);

      reload();

      showToast(
        `${isDept ? 'Department' : 'Designation'} saved successfully.`
      );
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Delete                                                                   */
  /* ------------------------------------------------------------------------ */

  const remove = async (kind, item) => {
    const itemName = item.name || item.title;

    const ok = await confirm({
      title: `Delete ${
        kind === 'dept'
          ? 'department'
          : 'designation'
      }?`,
      message: `“${itemName}” will be permanently removed.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!ok) return;

    try {
      await api.delete(
        `${
          kind === 'dept'
            ? '/hr/departments'
            : '/hr/designations'
        }/${item.id}`
      );

      reload();

      showToast('Deleted successfully.');
    } catch (err) {
      showToast(apiError(err), 'error');
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Escape Key                                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!edit) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) {
        setEdit(null);
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
  }, [edit, saving]);

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

  /* ------------------------------------------------------------------------ */
  /* Status Badge                                                             */
  /* ------------------------------------------------------------------------ */

  const statusBadge = (status) => (
    <StatusBadge
      state={
        status === 'Active'
          ? 'Approved'
          : 'Cancelled'
      }
      label={status}
    />
  );

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <DashboardLayout>
      <Toast toast={toast} />

      {/* ------------------------------------------------------------------ */}
      {/* Page Header                                                         */}
      {/* ------------------------------------------------------------------ */}

      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Roles, Departments &amp; Designations
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Define how your organization is structured.
          Assign employees from Employee Profiles &amp;
          Records.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Tabs                                                               */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200"
        role="tablist"
      >
        {TABS.map((tabName, index) => (
          <button
            key={tabName}
            type="button"
            role="tab"
            aria-selected={tab === index}
            onClick={() => setTab(index)}
            className={`
              whitespace-nowrap border-b-2 px-5 py-3
              text-sm font-semibold transition-colors
              ${
                tab === index
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }
            `}
          >
            {tabName}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* DEPARTMENTS                                                        */}
      {/* ================================================================== */}

      {tab === 0 && (
        <Card
          title="Departments"
          actions={
            <button
              type="button"
              onClick={() => openDept()}
              className="
                inline-flex items-center gap-2
                rounded-lg  bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600
                px-4 py-2.5
                text-sm font-semibold text-white
                shadow-sm transition
                hover:bg-blue-700
                focus:outline-none
                focus:ring-2 focus:ring-blue-500
                focus:ring-offset-2
              "
            >
              <Plus size={16} />
              Add department
            </button>
          }
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Department
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Description
                    </th>

                    <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      Employees
                    </th>

                    <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      Designations
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {departments.length > 0 ? (
                    departments.map((department) => (
                      <tr
                        key={department.id}
                        className="group transition-colors hover:bg-slate-50"
                      >
                        {/* Department */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="
                              flex h-10 w-10 shrink-0
                              items-center justify-center
                              rounded-lg bg-blue-50
                              text-sm font-bold text-blue-700
                            ">
                              {(department.name || 'D')
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {department.name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                Department
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="px-5 py-4">
                          <p
                            className="max-w-[280px] truncate text-sm text-slate-600"
                            title={
                              department.description || ''
                            }
                          >
                            {department.description ||
                              'No description provided'}
                          </p>
                        </td>

                        {/* Employees */}
                        <td className="px-5 py-4 text-center">
                          <span className="
                            inline-flex min-w-[40px]
                            items-center justify-center
                            rounded-lg bg-slate-100
                            px-2.5 py-1.5
                            text-sm font-bold text-slate-700
                          ">
                            {department.employeeCount ?? 0}
                          </span>
                        </td>

                        {/* Designations */}
                        <td className="px-5 py-4 text-center">
                          <span className="
                            inline-flex min-w-[40px]
                            items-center justify-center
                            rounded-lg bg-slate-100
                            px-2.5 py-1.5
                            text-sm font-bold text-slate-700
                          ">
                            {department.designationCount ?? 0}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {statusBadge(
                            department.status
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openDept(department)
                              }
                              className="
                                rounded-lg
                                border border-slate-300
                                bg-white
                                px-3.5 py-2
                                text-sm font-semibold
                                text-slate-700
                                shadow-sm transition
                                hover:border-blue-300
                                hover:bg-blue-50
                                hover:text-blue-700
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                              "
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                remove(
                                  'dept',
                                  department
                                )
                              }
                              className="
                                rounded-lg
                                border border-red-200
                                bg-red-50
                                px-3.5 py-2
                                text-sm font-semibold
                                text-red-600
                                transition
                                hover:border-red-300
                                hover:bg-red-100
                                focus:outline-none
                                focus:ring-2
                                focus:ring-red-500
                              "
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableState
                      loading={loading}
                      type="department"
                    />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* ================================================================== */}
      {/* DESIGNATIONS                                                       */}
      {/* ================================================================== */}

      {tab === 1 && (
        <Card
          title="Designations"
          actions={
            <button
              type="button"
              onClick={() => openDesig()}
              className="
                inline-flex items-center gap-2
                rounded-lg bg-blue-600
                px-4 py-2.5
                text-sm font-semibold text-white
                shadow-sm transition
                hover:bg-blue-700
                focus:outline-none
                focus:ring-2 focus:ring-blue-500
                focus:ring-offset-2
              "
            >
              <Plus size={16} />
              Add designation
            </button>
          }
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Designation
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Department
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Description
                    </th>

                    <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                      Employees
                    </th>

                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {designations.length > 0 ? (
                    designations.map((designation) => (
                      <tr
                        key={designation.id}
                        className="group transition-colors hover:bg-slate-50"
                      >
                        {/* Designation */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="
                              flex h-10 w-10 shrink-0
                              items-center justify-center
                              rounded-lg bg-indigo-50
                              text-sm font-bold text-indigo-700
                            ">
                              {(designation.title || 'D')
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {designation.title}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                Designation
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-4">
                          {designation.departmentId &&
                          deptName.get(
                            designation.departmentId
                          ) ? (
                            <span className="
                              inline-flex items-center
                              rounded-lg bg-slate-100
                              px-3 py-1.5
                              text-xs font-semibold
                              text-slate-700
                            ">
                              {deptName.get(
                                designation.departmentId
                              )}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Any department
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="px-5 py-4">
                          <p
                            className="max-w-[280px] truncate text-sm text-slate-600"
                            title={
                              designation.description || ''
                            }
                          >
                            {designation.description ||
                              'No description provided'}
                          </p>
                        </td>

                        {/* Employees */}
                        <td className="px-5 py-4 text-center">
                          <span className="
                            inline-flex min-w-[40px]
                            items-center justify-center
                            rounded-lg bg-slate-100
                            px-2.5 py-1.5
                            text-sm font-bold text-slate-700
                          ">
                            {designation.employeeCount ?? 0}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {statusBadge(
                            designation.status
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openDesig(designation)
                              }
                              className="
                                rounded-lg
                                border border-slate-300
                                bg-white
                                px-3.5 py-2
                                text-sm font-semibold
                                text-slate-700
                                shadow-sm transition
                                hover:border-blue-300
                                hover:bg-blue-50
                                hover:text-blue-700
                                focus:outline-none
                                focus:ring-2
                                focus:ring-blue-500
                              "
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                remove(
                                  'desig',
                                  designation
                                )
                              }
                              className="
                                rounded-lg
                                border border-red-200
                                bg-red-50
                                px-3.5 py-2
                                text-sm font-semibold
                                text-red-600
                                transition
                                hover:border-red-300
                                hover:bg-red-100
                                focus:outline-none
                                focus:ring-2
                                focus:ring-red-500
                              "
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableState
                      loading={loading}
                      type="designation"
                    />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* ================================================================== */}
      {/* ROLES                                                              */}
      {/* ================================================================== */}

      {tab === 2 && (
        <Card
          title="Roles"
          subtitle="Login roles decide what each account can access. They are managed with the existing permission system."
        >
          <div className="
            mb-6 grid grid-cols-1 gap-4
            sm:grid-cols-2 md:grid-cols-3
            lg:grid-cols-5
          ">
            {STAFF_ROLES.map((role) => (
              <div
                key={role.value}
                className="
                  rounded-xl border border-slate-200
                  bg-white p-5
                  shadow-sm transition
                  hover:border-blue-200
                  hover:shadow-md
                "
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-lg bg-blue-50
                    text-blue-700
                  ">
                    <ShieldCheck size={19} />
                  </div>

                  <span className="
                    rounded-full bg-slate-100
                    px-2.5 py-1
                    text-xs font-semibold
                    text-slate-500
                  ">
                    Role
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-600">
                  {role.label}
                </p>

                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {roleCounts[role.value] || 0}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {role.description}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Manage permissions
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/org-admin/users"
                className="
                  inline-flex items-center gap-2
                  rounded-lg border border-blue-200
                  bg-blue-50 px-4 py-2.5
                  text-sm font-semibold text-blue-700
                  transition hover:bg-blue-100
                "
              >
                <ShieldCheck size={16} />
                Change a login role
              </Link>

              <Link
                to="/org-admin/accessibility"
                className="
                  inline-flex items-center gap-2
                  rounded-lg border border-slate-200
                  bg-white px-4 py-2.5
                  text-sm font-semibold text-slate-700
                  shadow-sm transition
                  hover:bg-slate-50
                "
              >
                <ShieldCheck size={16} />
                Section permissions
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              Counts reflect employees that have an HR record.
            </p>
          </div>
        </Card>
      )}

      {/* ================================================================== */}
      {/* CUSTOM MODAL                                                       */}
      {/* ================================================================== */}

      {edit && (
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
              !saving
            ) {
              setEdit(null);
            }
          }}
        >
          <div
            className="
              flex max-h-[100vh]
              w-full flex-col
              overflow-hidden
              bg-white shadow-2xl
              sm:max-h-[90vh]
              sm:max-w-xl
              sm:rounded-2xl
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="org-structure-modal-title"
          >
            {/* Modal Header */}
            <div className="
              flex items-center justify-between
              border-b border-slate-200
              px-5 py-4
              sm:px-6
            ">
              <div>
                <div className="flex items-center gap-2">
                  <div className="
                    flex h-9 w-9
                    items-center justify-center
                    rounded-lg bg-blue-50
                    text-blue-700
                  ">
                    {edit.kind === 'dept' ? (
                      <Building2 size={18} />
                    ) : (
                      <BriefcaseBusiness size={18} />
                    )}
                  </div>

                  <h2
                    id="org-structure-modal-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    {edit.id ? 'Edit' : 'Add'}{' '}
                    {edit.kind === 'dept'
                      ? 'Department'
                      : 'Designation'}
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {edit.kind === 'dept'
                    ? 'Manage department information and status.'
                    : 'Manage designation information and department assignment.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                aria-label="Close"
                className="
                  rounded-lg p-2
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={save}
              noValidate
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* Modal Body */}
              <div className="
                flex-1 overflow-y-auto
                px-5 py-5
                sm:px-6
              ">
                <SectionHeader
                  title={
                    edit.kind === 'dept'
                      ? 'Department Information'
                      : 'Designation Information'
                  }
                  description="Enter the details below."
                />

                <div className="space-y-5">
                  {/* Name / Title */}
                  {edit.kind === 'dept' ? (
                    <Field
                      label="Department Name"
                      required
                      value={edit.name}
                      onChange={setF('name')}
                      placeholder="e.g. Human Resources"
                      disabled={saving}
                    />
                  ) : (
                    <Field
                      label="Designation Title"
                      required
                      value={edit.title}
                      onChange={setF('title')}
                      placeholder="e.g. HR Manager"
                      disabled={saving}
                    />
                  )}

                  {/* Department */}
                  {edit.kind === 'desig' && (
                    <SelectField
                      label="Department"
                      value={edit.departmentId}
                      onChange={setF('departmentId')}
                      disabled={saving}
                      options={[
                        {
                          value: '',
                          label: 'Any department',
                        },
                        ...departments
                          .filter(
                            (department) =>
                              department.status ===
                                'Active' ||
                              department.id ===
                                edit.departmentId
                          )
                          .map((department) => ({
                            value: department.id,
                            label: department.name,
                          })),
                      ]}
                    />
                  )}

                  {/* Description */}
                  <Field
                    label="Description"
                    type="textarea"
                    rows={4}
                    value={edit.description}
                    onChange={setF('description')}
                    placeholder={
                      edit.kind === 'dept'
                        ? 'Briefly describe this department...'
                        : 'Briefly describe this designation...'
                    }
                    disabled={saving}
                  />

                  {/* Status */}
                  <SelectField
                    label="Status"
                    required
                    value={edit.status}
                    onChange={setF('status')}
                    disabled={saving}
                    options={[
                      {
                        value: 'Active',
                        label: 'Active',
                      },
                      {
                        value: 'Inactive',
                        label: 'Inactive',
                      },
                    ]}
                  />

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
              </div>

              {/* Modal Footer */}
              <div className="
                flex shrink-0
                justify-end gap-3
                border-t border-slate-200
                bg-slate-50
                px-5 py-4
                sm:px-6
              ">
                <button
                  type="button"
                  onClick={closeEdit}
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
                    focus:outline-none
                    focus:ring-2
                    focus:ring-slate-400
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
                    min-w-[125px]
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
                  {saving
                    ? 'Saving…'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default OrgStructure;
