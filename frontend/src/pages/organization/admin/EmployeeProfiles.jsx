import { useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  Camera,
  Eye,
  IdCard,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import api from '../../../Config/apiConfig';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import Button from '../../../shared/Button/Button';
import Card from '../../../shared/Card/Card';
import Table from '../../../shared/Table/Table';
import { Toast } from '../../../shared/HrUi/HrUi';
import { apiError, fmtDate, useToast } from '../../../utils/hrFormat';

const EMP_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Intern',
  'Volunteer',
];

const EMP_STATUSES = [
  'Active',
  'On Leave',
  'Probation',
  'Suspended',
  'Resigned',
  'Terminated',
];

const STATUS_BADGE = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'On Leave': 'bg-lime-50 text-lime-800 ring-lime-600/20',
  Probation: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Suspended: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  Resigned: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Terminated: 'bg-red-50 text-red-700 ring-red-600/20',
};

const blank = {
  userId: '',
  employeeCode: '',
  fullName: '',
  personalEmail: '',
  phone: '',
  address: '',
  dateOfBirth: '',
  gender: '',
  nationalId: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  departmentId: '',
  designationId: '',
  joiningDate: '',
  employmentType: 'Full-time',
  employmentStatus: 'Active',
};

const FIELDS = Object.keys(blank).filter((key) => key !== 'userId');

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/* -------------------------------------------------------
   Reusable native Tailwind input
------------------------------------------------------- */

const Field = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
  rows = 3,
  className = '',
}) => {
  const baseClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={baseClass}
        />
      )}
    </div>
  );
};

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <select
        id={name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {options.map((option) => {
          const item =
            typeof option === 'object'
              ? option
              : {
                  value: option,
                  label: option,
                };

          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
      <Icon size={19} />
    </div>

    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>

      {description && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  </div>
);

/* -------------------------------------------------------
   Main component
------------------------------------------------------- */

const EmployeeProfiles = () => {
  const { currentUser } = useContext(AppContext);
  const [toast, showToast] = useToast();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [unlinked, setUnlinked] = useState([]);

  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [formError, setFormError] = useState('');

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const reload = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  /* -------------------------------------------------------
     Load employees
  ------------------------------------------------------- */

  useEffect(() => {
    let alive = true;

    const params = {};

    if (search.trim()) {
      params.search = search.trim();
    }

    if (deptFilter) {
      params.departmentId = deptFilter;
    }

    if (statusFilter) {
      params.status = statusFilter;
    }

    const timer = setTimeout(
      () => {
        Promise.all([
          api.get('/hr/employees', { params }),
          api.get('/hr/employees/unlinked'),
        ])
          .then(([employeeResponse, unlinkedResponse]) => {
            if (!alive) return;

            setEmployees(employeeResponse.data.employees || []);
            setUnlinked(unlinkedResponse.data.staff || []);
            setLoading(false);
          })
          .catch((error) => {
            if (!alive) return;

            setLoading(false);

            showToast(
              apiError(error, 'Could not load employees.'),
              'error'
            );
          });
      },
      search ? 300 : 0
    );

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [search, deptFilter, statusFilter, tick, showToast]);

  /* -------------------------------------------------------
     Load departments and designations
  ------------------------------------------------------- */

  useEffect(() => {
    let alive = true;

    Promise.all([
      api.get('/hr/departments'),
      api.get('/hr/designations'),
    ])
      .then(([departmentResponse, designationResponse]) => {
        if (!alive) return;

        setDepartments(departmentResponse.data.departments || []);
        setDesignations(designationResponse.data.designations || []);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  /* -------------------------------------------------------
     Escape key for modal
  ------------------------------------------------------- */

  useEffect(() => {
    if (!form) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !saving) {
        setForm(null);
        setPhoto(null);
        setFormError('');
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [form, saving]);

  /* -------------------------------------------------------
     Open new employee form
  ------------------------------------------------------- */

  const openNew = () => {
    setForm({
      ...blank,
      userId: unlinked[0]?.userId || '',
    });

    setPhoto(null);
    setFormError('');
  };

  /* -------------------------------------------------------
     Open edit form
  ------------------------------------------------------- */

  const openEdit = (employee) => {
    const values = { ...blank };

    FIELDS.forEach((key) => {
      values[key] = employee[key] ?? '';
    });

    setForm({
      ...values,
      id: employee.id,
      loginEmail: employee.loginEmail || '',
    });

    setPhoto(null);
    setFormError('');
  };

  /* -------------------------------------------------------
     Close modal
  ------------------------------------------------------- */

  const closeForm = () => {
    if (saving) return;

    setForm(null);
    setPhoto(null);
    setFormError('');
  };

  /* -------------------------------------------------------
     IMPORTANT:
     Native event handler.
     This fixes the typing/value issue.
  ------------------------------------------------------- */

  const updateField = (key, event) => {
    const value = event.target.value;

    setForm((current) => {
      if (!current) return current;

      return {
        ...current,
        [key]: value,
      };
    });
  };

  /* -------------------------------------------------------
     Save employee
  ------------------------------------------------------- */

  const save = async (event) => {
    event.preventDefault();

    if (!form || saving) return;

    if (!form.id && !form.userId) {
      setFormError('Please select a staff account.');
      return;
    }

    if (form.id && form.fullName.trim().length < 2) {
      setFormError('Full name must contain at least 2 characters.');
      return;
    }

    setSaving(true);
    setFormError('');

    const body = {};

    FIELDS.forEach((key) => {
      if (!(key === 'fullName' && !form.id)) {
        body[key] = form[key] === '' ? null : form[key];
      }
    });

    if (!form.id) {
      body.userId = form.userId;

      if (!body.employmentType) {
        delete body.employmentType;
      }
    }

    if (body.employmentType === null) {
      delete body.employmentType;
    }

    if (body.employmentStatus === null) {
      delete body.employmentStatus;
    }

    if (body.employeeCode === null) {
      delete body.employeeCode;
    }

    try {
      const response = form.id
        ? await api.patch(`/hr/employees/${form.id}`, body)
        : await api.post('/hr/employees', body);

      const employeeId = response.data.employee.id;

      /* Upload photo */
      if (photo) {
        const formData = new FormData();

        formData.append('photo', photo);

        try {
          await api.post(
            `/hr/employees/${employeeId}/photo`,
            formData,
            {
              headers: {
                'Content-Type': undefined,
              },
              timeout: 60000,
            }
          );
        } catch (error) {
          showToast(
            `Profile saved, but the photo failed: ${apiError(error)}`,
            'error'
          );

          setForm(null);
          setPhoto(null);
          reload();

          return;
        }
      }

      setForm(null);
      setPhoto(null);

      reload();

      showToast(
        form.id
          ? 'Employee profile updated successfully.'
          : 'Employee profile created successfully.'
      );
    } catch (error) {
      setFormError(apiError(error));
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------
     Sync employees
  ------------------------------------------------------- */

  const sync = async () => {
    if (syncing) return;

    setSyncing(true);

    try {
      const response = await api.post('/hr/employees/sync');

      reload();

      showToast(
        response.data.created
          ? `${response.data.created} employee record(s) created from existing staff accounts.`
          : 'Every active staff account already has an employee record.'
      );
    } catch (error) {
      showToast(apiError(error), 'error');
    } finally {
      setSyncing(false);
    }
  };

  /* -------------------------------------------------------
     View photo
  ------------------------------------------------------- */

  const viewPhoto = async (id) => {
    try {
      const response = await api.get(`/hr/employees/${id}/photo`);

      if (!response.data.url) {
        showToast('No photo uploaded.', 'error');
        return;
      }

      window.open(
        response.data.url,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      showToast(
        apiError(error, 'No photo uploaded.'),
        'error'
      );
    }
  };

  /* -------------------------------------------------------
     Auth
  ------------------------------------------------------- */

  if (!currentUser) {
    return <Navigate to="/login/org" replace />;
  }

  if (currentUser.role !== 'OrgAdmin') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  /* -------------------------------------------------------
     Filter options
  ------------------------------------------------------- */

  const activeDepts = departments.filter(
    (department) =>
      department.status === 'Active' ||
      department.id === form?.departmentId
  );

  const desigOptions = designations.filter(
    (designation) =>
      (designation.status === 'Active' ||
        designation.id === form?.designationId) &&
      (!form?.departmentId ||
        !designation.departmentId ||
        designation.departmentId === form.departmentId)
  );

  const activeEmployees = employees.filter(
    (employee) => employee.employmentStatus === 'Active'
  );

  return (
    <DashboardLayout>
      <Toast toast={toast} />

      <div className="min-h-screen bg-slate-50/70 px-3 py-5 sm:px-5 lg:px-8">
        {/* -------------------------------------------------
            Header
        ------------------------------------------------- */}

        <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-700">
              <Building2 size={15} />
              Human Resources
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Employee Profiles &amp; Records
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage employee information, employment details, personal
              records, and profile photos from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={sync}
              disabled={syncing || unlinked.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={syncing ? 'animate-spin' : ''}
              />

              {syncing ? 'Syncing...' : 'Sync staff records'}

              {unlinked.length > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                  {unlinked.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openNew}
              disabled={unlinked.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-700 bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:border-blue-800 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-500"
            >
              <Plus size={18} />
              Add employee
            </button>
          </div>
        </div>

        {/* -------------------------------------------------
            Stats
        ------------------------------------------------- */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total employees
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {employees.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Users size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Active employees
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {activeEmployees.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck size={22} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Pending profiles
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {unlinked.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <IdCard size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------
            Unlinked notice
        ------------------------------------------------- */}

        {unlinked.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-start gap-3">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-blue-700"
              />

              <div>
                <p className="text-sm font-bold text-blue-900">
                  Employee profiles need attention
                </p>

                <p className="mt-1 text-sm text-blue-800">
                  {unlinked.length} active staff account
                  {unlinked.length === 1 ? ' does' : 's do'} not
                  have an employee profile yet.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={sync}
              disabled={syncing}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-blue-300 bg-white px-4 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-100 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync now'}
            </button>
          </div>
        )}

        {/* -------------------------------------------------
            Employee table
        ------------------------------------------------- */}

        <Card
          title="Employee Directory"
          actions={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employees..."
                  aria-label="Search employees"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <select
                value={deptFilter}
                onChange={(event) => setDeptFilter(event.target.value)}
                aria-label="Filter by department"
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">All departments</option>

                {departments.map((department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">All statuses</option>

                {EMP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <Table
                headers={[
                  'Employee',
                  'Employee ID',
                  'Department',
                  'Designation',
                  'Login role',
                  'Joining date',
                  'Status',
                  'Actions',
                ]}
                data={employees}
                emptyMessage={
                  loading
                    ? 'Loading employees...'
                    : search || deptFilter || statusFilter
                      ? 'No employees match your search or filters.'
                      : 'No employee records found.'
                }
                renderRow={(employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-slate-100 transition last:border-b-0 hover:bg-blue-50/40"
                  >
                    <td className="min-w-[240px] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                          {initials(employee.fullName)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {employee.fullName ||
                              'Unnamed employee'}
                          </p>

                          <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                            <Mail size={12} />
                            {employee.loginEmail || 'No email'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                        {employee.employeeCode || '—'}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {employee.departmentName || '—'}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {employee.designationTitle || '—'}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="inline-flex rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {employee.role || '—'}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {fmtDate(employee.joiningDate)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                          STATUS_BADGE[
                            employee.employmentStatus
                          ] ||
                          'bg-slate-100 text-slate-600 ring-slate-300'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {employee.employmentStatus || 'Unknown'}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(employee)}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-xs font-bold text-blue-700 shadow-sm transition hover:border-blue-700 hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    </td>
                  </tr>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {employees.length}
              </span>{' '}
              employee record
              {employees.length === 1 ? '' : 's'}
            </p>

            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-blue-700 sm:self-auto"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </Card>
      </div>

      {/* ===================================================
          CUSTOM TAILWIND MODAL
      =================================================== */}

      {form && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
            className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[94vh] sm:max-w-4xl sm:rounded-2xl"
          >
            {/* Modal Header */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-5 py-5 text-white sm:px-7 sm:py-6">
              <div className="absolute -right-10 -top-20 h-48 w-48 rounded-full border-[28px] border-white/5" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                    {form.id ? (
                      <Pencil size={22} />
                    ) : (
                      <UserRound size={23} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">
                      Human Resources
                    </p>

                    <h2
                      id="employee-modal-title"
                      className="text-xl font-bold sm:text-2xl"
                    >
                      {form.id
                        ? 'Edit Employee Profile'
                        : 'Add Employee Profile'}
                    </h2>

                    <p className="mt-1 text-xs text-blue-100 sm:text-sm">
                      {form.id
                        ? 'Update employee information and employment details.'
                        : 'Create an HR profile for an existing staff account.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  aria-label="Close"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={save}
              noValidate
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-6">
                {/* ------------------------------------------------
                    Staff Account
                ------------------------------------------------ */}

                {!form.id && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <SectionHeader
                      icon={Users}
                      title="Staff Account"
                      description="Select the existing staff login account."
                    />

                    <div className="mt-5">
                      <SelectField
                        label="Staff account"
                        name="userId"
                        required
                        value={form.userId}
                        onChange={(event) =>
                          updateField('userId', event)
                        }
                        options={unlinked.map((user) => ({
                          value: user.userId,
                          label: `${user.fullName} — ${user.role} (${user.email})`,
                        }))}
                      />
                    </div>
                  </section>
                )}

                {/* ------------------------------------------------
                    Personal Information
                ------------------------------------------------ */}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionHeader
                    icon={UserRound}
                    title="Personal Information"
                    description="Basic identity and personal contact information."
                  />

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {form.id && (
                      <Field
                        label="Full name"
                        name="fullName"
                        required
                        value={form.fullName}
                        onChange={(event) =>
                          updateField('fullName', event)
                        }
                        placeholder="Enter full name"
                      />
                    )}

                    <Field
                      label="Employee ID"
                      name="employeeCode"
                      value={form.employeeCode}
                      onChange={(event) =>
                        updateField('employeeCode', event)
                      }
                      placeholder="Leave blank for auto assignment"
                    />

                    <Field
                      label="Personal email"
                      name="personalEmail"
                      type="email"
                      value={form.personalEmail}
                      onChange={(event) =>
                        updateField('personalEmail', event)
                      }
                      placeholder="name@example.com"
                    />

                    <Field
                      label="Phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        updateField('phone', event)
                      }
                      placeholder="Enter phone number"
                    />

                    <Field
                      label="Date of birth"
                      name="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(event) =>
                        updateField('dateOfBirth', event)
                      }
                    />

                    <SelectField
                      label="Gender"
                      name="gender"
                      value={form.gender}
                      onChange={(event) =>
                        updateField('gender', event)
                      }
                      options={[
                        {
                          value: '',
                          label: 'Not specified',
                        },
                        'Male',
                        'Female',
                        'Other',
                      ]}
                    />

                    <Field
                      label="National ID"
                      name="nationalId"
                      value={form.nationalId}
                      onChange={(event) =>
                        updateField('nationalId', event)
                      }
                      placeholder="Enter national ID"
                    />

                    <Field
                      label="Address"
                      name="address"
                      type="textarea"
                      rows={3}
                      value={form.address}
                      onChange={(event) =>
                        updateField('address', event)
                      }
                      placeholder="Enter residential address"
                      className="sm:col-span-2"
                    />
                  </div>
                </section>

                {/* ------------------------------------------------
                    Employment Information
                ------------------------------------------------ */}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionHeader
                    icon={BriefcaseBusiness}
                    title="Employment Information"
                    description="Department, designation and employment status."
                  />

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <SelectField
                      label="Department"
                      name="departmentId"
                      value={form.departmentId}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          departmentId: event.target.value,
                          designationId: '',
                        }));
                      }}
                      options={[
                        {
                          value: '',
                          label: 'No department',
                        },
                        ...activeDepts.map((department) => ({
                          value: department.id,
                          label: department.name,
                        })),
                      ]}
                    />

                    <SelectField
                      label="Designation"
                      name="designationId"
                      value={form.designationId}
                      onChange={(event) =>
                        updateField('designationId', event)
                      }
                      options={[
                        {
                          value: '',
                          label: 'No designation',
                        },
                        ...desigOptions.map((designation) => ({
                          value: designation.id,
                          label: designation.title,
                        })),
                      ]}
                    />

                    <Field
                      label="Joining date"
                      name="joiningDate"
                      type="date"
                      value={form.joiningDate}
                      onChange={(event) =>
                        updateField('joiningDate', event)
                      }
                    />

                    <SelectField
                      label="Employment type"
                      name="employmentType"
                      value={form.employmentType}
                      onChange={(event) =>
                        updateField('employmentType', event)
                      }
                      options={EMP_TYPES}
                    />

                    <SelectField
                      label="Employment status"
                      name="employmentStatus"
                      value={form.employmentStatus}
                      onChange={(event) =>
                        updateField('employmentStatus', event)
                      }
                      options={EMP_STATUSES}
                      className="sm:col-span-2"
                    />
                  </div>

                  <div className="mt-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${
                        STATUS_BADGE[form.employmentStatus] ||
                        'bg-slate-100 text-slate-600 ring-slate-300'
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />

                      {form.employmentStatus ||
                        'No status selected'}
                    </span>
                  </div>
                </section>

                {/* ------------------------------------------------
                    Emergency Contact
                ------------------------------------------------ */}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionHeader
                    icon={Phone}
                    title="Emergency Contact"
                    description="Contact information for emergencies."
                  />

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Contact name"
                      name="emergencyContactName"
                      value={form.emergencyContactName}
                      onChange={(event) =>
                        updateField(
                          'emergencyContactName',
                          event
                        )
                      }
                      placeholder="Enter contact name"
                    />

                    <Field
                      label="Contact phone"
                      name="emergencyContactPhone"
                      type="tel"
                      value={form.emergencyContactPhone}
                      onChange={(event) =>
                        updateField(
                          'emergencyContactPhone',
                          event
                        )
                      }
                      placeholder="Enter contact phone"
                    />
                  </div>
                </section>

                {/* ------------------------------------------------
                    Profile Photo
                ------------------------------------------------ */}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionHeader
                    icon={Camera}
                    title="Profile Photo"
                    description="Upload a JPG or PNG image up to 2 MB."
                  />

                  <div className="mt-5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <Camera size={24} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <label
                          htmlFor="employee-photo"
                          className="mb-2 block text-sm font-semibold text-slate-800"
                        >
                          {photo
                            ? photo.name
                            : 'Choose employee photo'}
                        </label>

                        <input
                          id="employee-photo"
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={(event) => {
                            const selectedFile =
                              event.target.files?.[0];

                            if (
                              selectedFile &&
                              selectedFile.size >
                                2 * 1024 * 1024
                            ) {
                              event.target.value = '';
                              setPhoto(null);
                              setFormError(
                                'Photo must be 2 MB or smaller.'
                              );
                              return;
                            }

                            if (
                              selectedFile &&
                              ![
                                'image/jpeg',
                                'image/png',
                              ].includes(selectedFile.type)
                            ) {
                              event.target.value = '';
                              setPhoto(null);
                              setFormError(
                                'Please select a JPG or PNG image.'
                              );
                              return;
                            }

                            setFormError('');
                            setPhoto(selectedFile || null);
                          }}
                          className="block w-full text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100"
                        />

                        <p className="mt-2 text-xs text-slate-500">
                          JPG / PNG · Maximum 2 MB
                        </p>
                      </div>

                      {form.id && (
                        <button
                          type="button"
                          onClick={() => viewPhoto(form.id)}
                          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Eye size={15} />
                          View current
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* ------------------------------------------------
                    Linked Account
                ------------------------------------------------ */}

                {form.id && (
                  <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <div className="flex items-start gap-3">
                      <ShieldCheck
                        size={20}
                        className="mt-0.5 shrink-0 text-indigo-700"
                      />

                      <div>
                        <p className="text-sm font-bold text-indigo-950">
                          Linked Login Account
                        </p>

                        <p className="mt-1 break-all text-sm text-indigo-800">
                          {form.loginEmail ||
                            'No login email available'}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-indigo-700">
                          Login roles are managed separately under
                          Employees &amp; Staff / Accessibility.
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Error */}
                {formError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />

                    <p>{formError}</p>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------
                  Footer Buttons
              ------------------------------------------------ */}

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p className="hidden text-xs text-slate-500 sm:block">
                  Review the information before saving.
                </p>

                <div className="flex w-full gap-3 sm:w-auto">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      (!form.id && !form.userId)
                    }
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-blue-700 bg-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:border-blue-800 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-500 sm:min-w-[170px] sm:flex-none"
                  >
                    {saving ? (
                      <>
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        {form.id ? (
                          <Pencil size={16} />
                        ) : (
                          <Plus size={17} />
                        )}

                        {form.id
                          ? 'Save Changes'
                          : 'Create Profile'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EmployeeProfiles;
