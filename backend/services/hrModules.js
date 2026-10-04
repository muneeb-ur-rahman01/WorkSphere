const supabase = require('../config/supabase');
const { makeResource, httpErr, toApi } = require('./crudFactory');
const { notifyAdmins, notifyUser, notifyOnce } = require('../utils/notify');
const { createStaffByAdmin } = require('./userService');
const hr = require('./hrService');
const { STAFF_ROLES } = require('./attendanceService');

const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Volunteer'];
const empOf = async (orgId, employeeId) => (await supabase.from('employees').select('id, user_id, full_name, employee_code, employment_status, employment_type, joining_date').eq('id', employeeId).eq('org_id', orgId).maybeSingle()).data;

const E = { type: 'ref', table: 'employees', label: 'Employee' };

const resources = {
  // ---------------------------------------------------------------- recruitment
  'job-openings': makeResource({
    table: 'job_openings', createdBy: 'created_by', allowDelete: true, filters: ['status'],
    fields: {
      title: { type: 'str', required: true, max: 120, label: 'Title' },
      departmentId: { type: 'ref', table: 'departments', label: 'Department' },
      designationId: { type: 'ref', table: 'designations', label: 'Designation' },
      description: { type: 'text' },
      positions: { type: 'int', min: 1, max: 1000, default: 1, label: 'Positions' },
      status: { type: 'enum', values: ['Draft', 'Open', 'Closed'], default: 'Draft', label: 'Status' },
      closingDate: { type: 'date', label: 'Closing date' }
    },
    hooks: {
      canDelete: async ({ user, row }) => {
        const { count } = await supabase.from('applicants').select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('job_id', row.id);
        if (count > 0) throw httpErr('This opening has applicants. Close it instead of deleting.', 409);
      }
    }
  }),

  applicants: makeResource({
    table: 'applicants', createdBy: 'created_by', allowDelete: true, filters: ['jobId', 'status'],
    duplicateMessage: 'This email has already applied for this opening.',
    fields: {
      jobId: { type: 'ref', table: 'job_openings', required: true, createOnly: true, label: 'Job opening' },
      fullName: { type: 'str', required: true, max: 120, label: 'Full name' },
      email: { type: 'email', required: true, label: 'Email' },
      phone: { type: 'str', max: 40, label: 'Phone' },
      source: { type: 'str', max: 80, label: 'Source' },
      notes: { type: 'text', label: 'Notes' },
      status: { type: 'enum', values: ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected'], default: 'Applied', label: 'Status' }
    },
    hooks: {
      beforeCreate: async ({ row }) => { if (row.status === 'Hired') throw httpErr('Use “Convert to employee” to hire a candidate.'); },
      beforeUpdate: async ({ row, before }) => {
        if (before.converted_employee_id) throw httpErr('This candidate was already converted to an employee.', 409);
        if (row.status === 'Hired') throw httpErr('Use “Convert to employee” to hire a candidate.');
      },
      canDelete: async ({ row }) => { if (row.converted_employee_id) throw httpErr('Converted candidates cannot be deleted.', 409); }
    }
  }),

  'onboarding-tasks': makeResource({
    table: 'onboarding_tasks', allowDelete: true, filters: ['employeeId', 'status'], orderBy: ['created_at', true],
    fields: {
      employeeId: { ...E, required: true, createOnly: true },
      title: { type: 'str', required: true, max: 160, label: 'Task' },
      description: { type: 'text' },
      dueDate: { type: 'date', label: 'Due date' },
      status: { type: 'enum', values: ['Pending', 'Completed'], default: 'Pending', label: 'Status' }
    },
    hooks: {
      beforeUpdate: async ({ user, row }) => {
        if (row.status === 'Completed') { row.completed_at = new Date().toISOString(); row.completed_by = user.id; }
        if (row.status === 'Pending') { row.completed_at = null; row.completed_by = null; }
      },
      afterUpdate: async ({ user, row }) => {
        if (row.status !== 'Completed') return;
        const { count } = await supabase.from('onboarding_tasks').select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('employee_id', row.employee_id).eq('status', 'Pending');
        if (count === 0) {
          const emp = await empOf(user.orgId, row.employee_id);
          if (emp) {
            await notifyAdmins(user.orgId, 'Employee Onboarding Completed', `${emp.full_name} (${emp.employee_code}) completed all onboarding tasks.`, { dedupe_key: `onboarding:done:${emp.id}` });
            await notifyUser(user.orgId, emp.user_id, 'Onboarding Completed', 'All your onboarding tasks are complete. Welcome aboard!', { dedupe_key: `onboarding:done:self:${emp.id}` });
          }
        }
      }
    }
  }),

  // ---------------------------------------------------------------- performance
  'performance-reviews': makeResource({
    table: 'performance_reviews', allowDelete: true, filters: ['employeeId', 'status'],
    fields: {
      employeeId: { ...E, required: true, createOnly: true },
      periodLabel: { type: 'str', required: true, max: 60, label: 'Review period' },
      rating: { type: 'int', min: 1, max: 5, label: 'Rating' },
      strengths: { type: 'text', label: 'Strengths' },
      improvements: { type: 'text', label: 'Areas to improve' },
      status: { type: 'enum', values: ['Draft', 'Submitted', 'Acknowledged'], default: 'Draft', label: 'Status' }
    },
    hooks: {
      beforeCreate: async ({ user, row }) => { row.reviewer_id = user.id; if (row.status === 'Acknowledged') throw httpErr('Only the employee can acknowledge a review.'); },
      beforeUpdate: async ({ row, before }) => {
        if (row.status === 'Acknowledged') throw httpErr('Only the employee can acknowledge a review.');
        if (before.status !== 'Draft' && (row.rating !== undefined || row.strengths !== undefined || row.improvements !== undefined)) throw httpErr('A submitted review can no longer be edited.', 409);
        if (row.status === 'Submitted' && !(row.rating ?? before.rating)) throw httpErr('Add a rating before submitting the review.');
      },
      afterUpdate: async ({ user, row, before }) => {
        if (row.status === 'Submitted' && before.status === 'Draft') {
          const emp = await empOf(user.orgId, row.employee_id);
          if (emp) await notifyUser(user.orgId, emp.user_id, 'Performance Review Available', `Your ${row.period_label} performance review has been submitted.`, { dedupe_key: `review:submitted:${row.id}` });
        }
      }
    }
  }),

  'performance-goals': makeResource({
    table: 'performance_goals', allowDelete: true, filters: ['employeeId', 'status'],
    fields: {
      employeeId: { ...E, required: true, createOnly: true },
      title: { type: 'str', required: true, max: 160, label: 'Goal' },
      description: { type: 'text' },
      dueDate: { type: 'date', label: 'Due date' },
      // status and progress belong to the employee (see staffHrService)
      progress: { type: 'int', min: 0, max: 100, readOnly: true, label: 'Progress' },
      status: { type: 'enum', values: ['Not Started', 'In Progress', 'Completed', 'Cancelled'], readOnly: true, label: 'Status' }
    },
    hooks: {
      afterCreate: async ({ user, row }) => {
        const emp = await empOf(user.orgId, row.employee_id);
        if (emp) await notifyUser(user.orgId, emp.user_id, 'New Goal Assigned', `A new goal was assigned to you: “${row.title}”.`, { dedupe_key: `goal:assigned:${row.id}` });
      }
    }
  }),

  'performance-feedback': makeResource({
    table: 'performance_feedback', allowDelete: true, filters: ['employeeId'],
    fields: {
      employeeId: { ...E, required: true, createOnly: true },
      message: { type: 'text', required: true, max: 2000, label: 'Feedback' }
    },
    hooks: {
      beforeCreate: async ({ user, row }) => { row.given_by = user.id; },
      afterCreate: async ({ user, row }) => {
        const emp = await empOf(user.orgId, row.employee_id);
        if (emp) await notifyUser(user.orgId, emp.user_id, 'New Feedback', 'You received new performance feedback.', { dedupe_key: `feedback:${row.id}` });
      }
    }
  }),

  // ---------------------------------------------------------------- training
  'training-programs': makeResource({
    table: 'training_programs', createdBy: 'created_by', allowDelete: true, filters: ['status'],
    fields: {
      title: { type: 'str', required: true, max: 160, label: 'Title' },
      description: { type: 'text' },
      provider: { type: 'str', max: 120, label: 'Provider' },
      startDate: { type: 'date', label: 'Start date' },
      endDate: { type: 'date', label: 'End date' },
      capacity: { type: 'int', min: 1, max: 100000, label: 'Capacity' },
      status: { type: 'enum', values: ['Planned', 'Ongoing', 'Completed', 'Cancelled'], default: 'Planned', label: 'Status' }
    },
    hooks: {
      beforeCreate: async ({ row }) => { if (row.start_date && row.end_date && row.end_date < row.start_date) throw httpErr('End date cannot be before the start date.'); },
      beforeUpdate: async ({ row, before }) => {
        const s = row.start_date ?? before.start_date, e = row.end_date ?? before.end_date;
        if (s && e && e < s) throw httpErr('End date cannot be before the start date.');
      },
      afterCreate: async ({ user, row }) => {
        await notifyOnce({ org_id: user.orgId, title: 'New Training Program', message: `“${row.title}” is open. Open your dashboard to show interest.`, target_role: 'All', dedupe_key: `training:new:${row.id}` });
      },
      decorateList: async ({ user, rows }) => {
        const [{ data }, { data: ints }] = await Promise.all([
          supabase.from('training_enrollments').select('program_id, status').eq('org_id', user.orgId).neq('status', 'Dropped'),
          supabase.from('training_interests').select('program_id').eq('org_id', user.orgId)
        ]);
        const c = {}, i = {};
        (data || []).forEach((x) => { c[x.program_id] = (c[x.program_id] || 0) + 1; });
        (ints || []).forEach((x) => { i[x.program_id] = (i[x.program_id] || 0) + 1; });
        rows.forEach((r) => { r.__enrolledCount = c[r.id] || 0; r.__interestedCount = i[r.id] || 0; });
      },
      canDelete: async ({ user, row }) => {
        const { count } = await supabase.from('training_enrollments').select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('program_id', row.id);
        if (count > 0) throw httpErr('This program has enrollments. Mark it Cancelled instead of deleting.', 409);
      }
    }
  }),

  'training-interests': makeResource({
    table: 'training_interests', allowDelete: true, allowCreate: false, allowUpdate: false, filters: ['programId', 'employeeId'],
    fields: { programId: { type: 'ref', table: 'training_programs', label: 'Program' }, employeeId: { ...E } }
  }),

  'training-enrollments': makeResource({
    table: 'training_enrollments', allowDelete: true, filters: ['programId', 'employeeId', 'status'],
    duplicateMessage: 'This employee is already enrolled in the program.',
    fields: {
      programId: { type: 'ref', table: 'training_programs', required: true, createOnly: true, label: 'Program' },
      employeeId: { ...E, required: true, createOnly: true },
      status: { type: 'enum', values: ['Enrolled', 'In Progress', 'Completed', 'Dropped'], default: 'Enrolled', label: 'Status' },
      score: { type: 'num', min: 0, max: 100, label: 'Score' }
    },
    hooks: {
      beforeCreate: async ({ user, row }) => {
        const { data: p } = await supabase.from('training_programs').select('status, capacity, title').eq('id', row.program_id).eq('org_id', user.orgId).single();
        if (['Completed', 'Cancelled'].includes(p.status)) throw httpErr(`This program is ${p.status.toLowerCase()} and cannot take new enrollments.`);
        if (p.capacity) {
          const { count } = await supabase.from('training_enrollments').select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('program_id', row.program_id).neq('status', 'Dropped');
          if (count >= p.capacity) throw httpErr('This program is full.', 409);
        }
        if (row.status === 'Completed') row.completed_at = new Date().toISOString();
      },
      beforeUpdate: async ({ row }) => {
        if (row.status === 'Completed') row.completed_at = new Date().toISOString();
        else if (row.status) row.completed_at = null;
      },
      afterCreate: async ({ user, row }) => {
        await supabase.from('training_interests').delete().eq('org_id', user.orgId).eq('program_id', row.program_id).eq('employee_id', row.employee_id);
        const emp = await empOf(user.orgId, row.employee_id);
        const { data: p } = await supabase.from('training_programs').select('title').eq('id', row.program_id).maybeSingle();
        if (emp) await notifyUser(user.orgId, emp.user_id, 'Training Enrollment', `You were enrolled in “${p?.title}”.`, { dedupe_key: `training:enrolled:${row.id}` });
      }
    }
  }),

  // ---------------------------------------------------------------- benefits
  'benefit-plans': makeResource({
    table: 'benefit_plans', allowDelete: true, filters: ['kind', 'status'], orderBy: ['name', true],
    duplicateMessage: 'A benefit plan with this name already exists.',
    fields: {
      name: { type: 'str', required: true, max: 120, label: 'Name' },
      kind: { type: 'enum', values: ['Benefit', 'Allowance'], default: 'Benefit', label: 'Type' },
      description: { type: 'text' },
      amount: { type: 'num', min: 0, max: 100000000, default: 0, label: 'Amount' },
      minServiceMonths: { type: 'int', min: 0, max: 600, default: 0, label: 'Minimum service (months)' },
      employmentTypes: { type: 'enumarr', values: EMP_TYPES, default: EMP_TYPES, label: 'Eligible employment types' },
      status: { type: 'enum', values: ['Active', 'Inactive'], default: 'Active', label: 'Status' }
    },
    hooks: {
      canDelete: async ({ user, row }) => {
        const { count } = await supabase.from('employee_benefits').select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('plan_id', row.id);
        if (count > 0) throw httpErr('This plan is assigned to employees. Mark it Inactive instead.', 409);
      }
    }
  }),

  'employee-benefits': makeResource({
    table: 'employee_benefits', allowDelete: true, filters: ['planId', 'employeeId', 'status'],
    duplicateMessage: 'This employee already has this plan.',
    fields: {
      planId: { type: 'ref', table: 'benefit_plans', required: true, createOnly: true, label: 'Plan' },
      employeeId: { ...E, required: true, createOnly: true },
      startDate: { type: 'date', label: 'Start date', default: () => new Date().toISOString().slice(0, 10) },
      endDate: { type: 'date', label: 'End date' },
      status: { type: 'enum', values: ['Active', 'Ended'], default: 'Active', label: 'Status' }
    },
    hooks: {
      beforeCreate: async ({ user, row }) => {
        const [{ data: plan }, emp] = await Promise.all([
          supabase.from('benefit_plans').select('*').eq('id', row.plan_id).eq('org_id', user.orgId).single(),
          empOf(user.orgId, row.employee_id)
        ]);
        if (plan.status !== 'Active') throw httpErr('This plan is inactive.');
        if (!['Active', 'Probation'].includes(emp.employment_status)) throw httpErr(`${emp.full_name} is not eligible: employment status is ${emp.employment_status}.`);
        if (!plan.employment_types.includes(emp.employment_type)) throw httpErr(`${emp.full_name} is not eligible: this plan excludes ${emp.employment_type} staff.`);
        if (plan.min_service_months > 0) {
          if (!emp.joining_date) throw httpErr(`${emp.full_name} has no joining date, so service length cannot be verified.`);
          const j = new Date(`${emp.joining_date}T00:00:00Z`), n = new Date();
          const months = (n.getUTCFullYear() - j.getUTCFullYear()) * 12 + (n.getUTCMonth() - j.getUTCMonth()) - (n.getUTCDate() < j.getUTCDate() ? 1 : 0);
          if (months < plan.min_service_months) throw httpErr(`${emp.full_name} is not eligible yet: ${plan.min_service_months} months of service are required (has ${Math.max(months, 0)}).`);
        }
        if (row.end_date && row.end_date < row.start_date) throw httpErr('End date cannot be before the start date.');
        return row;
      },
      afterCreate: async ({ user, row }) => {
        const emp = await empOf(user.orgId, row.employee_id);
        const { data: p } = await supabase.from('benefit_plans').select('name').eq('id', row.plan_id).maybeSingle();
        if (emp) await notifyUser(user.orgId, emp.user_id, 'Benefit Assigned', `You were assigned “${p?.name}”.`, { dedupe_key: `benefit:${row.id}` });
      }
    }
  }),

  // ---------------------------------------------------------------- payroll inputs
  'salary-components': makeResource({
    table: 'salary_components', allowDelete: true, filters: ['employeeId', 'kind'], orderBy: ['created_at', true],
    fields: {
      employeeId: { ...E, required: true, createOnly: true },
      kind: { type: 'enum', values: ['Allowance', 'Deduction'], required: true, label: 'Type' },
      name: { type: 'str', required: true, max: 80, label: 'Name' },
      amount: { type: 'num', required: true, min: 0.01, max: 100000000, label: 'Amount' },
      isActive: { type: 'bool', default: true, label: 'Active' }
    }
  })
};

// ---------------------------------------------------------------- bespoke: onboarding defaults
const DEFAULT_ONBOARDING = ['Collect signed employment contract', 'Collect ID and personal documents', 'Set up login and workspace access', 'Introduce to team and supervisor', 'Complete orientation and policy briefing', 'Assign first tasks and goals'];

const addDefaultOnboarding = async ({ user, employeeId }) => {
  const emp = await empOf(user.orgId, employeeId);
  if (!emp) throw httpErr('Employee not found.', 404);
  const { count } = await supabase.from('onboarding_tasks').select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('employee_id', employeeId);
  if (count > 0) throw httpErr('This employee already has onboarding tasks.', 409);
  const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const { data, error } = await supabase.from('onboarding_tasks').insert(DEFAULT_ONBOARDING.map((title) => ({ org_id: user.orgId, employee_id: employeeId, title, due_date: due }))).select();
  if (error) throw httpErr('Could not create onboarding tasks.', 500);
  return data.map(toApi);
};

// ---------------------------------------------------------------- bespoke: applicant -> employee
const convertApplicant = async ({ user, id, role, password, joiningDate, departmentId, designationId, employmentType }) => {
  if (!STAFF_ROLES.includes(role)) throw httpErr('Select a valid staff role.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) throw httpErr('Temporary password must be 8-72 characters.');
  if (joiningDate && !/^\d{4}-\d{2}-\d{2}$/.test(joiningDate)) throw httpErr('Joining date must be YYYY-MM-DD.');
  if (employmentType && !EMP_TYPES.includes(employmentType)) throw httpErr('Invalid employment type.');

  const { data: a } = await supabase.from('applicants').select('*').eq('id', id).eq('org_id', user.orgId).maybeSingle();
  if (!a) throw httpErr('Applicant not found.', 404);
  if (a.converted_employee_id) throw httpErr('This candidate was already converted.', 409);
  if (!['Offered', 'Hired'].includes(a.status)) throw httpErr('Only candidates with an “Offered” status can be converted.', 409);

  // Claim the conversion atomically so a double click cannot create two accounts.
  const { data: claimed } = await supabase.from('applicants').update({ status: 'Hired' }).eq('id', id).eq('org_id', user.orgId).is('converted_employee_id', null).eq('status', 'Offered').select().maybeSingle();
  if (!claimed && a.status !== 'Hired') throw httpErr('This candidate is already being converted.', 409);

  let account, employee;
  try {
    account = await createStaffByAdmin({ user, fullName: a.full_name, email: a.email, password, role });
    employee = await hr.createEmployee({ user, userId: account.id, joiningDate: joiningDate || new Date().toISOString().slice(0, 10), departmentId: departmentId || undefined, designationId: designationId || undefined, employmentType: employmentType || undefined, personalEmail: a.email, phone: a.phone || undefined });
  } catch (err) {
    await supabase.from('applicants').update({ status: 'Offered' }).eq('id', id).eq('org_id', user.orgId);
    throw err;
  }
  await supabase.from('applicants').update({ converted_employee_id: employee.id, status: 'Hired' }).eq('id', id).eq('org_id', user.orgId);
  const tasks = await addDefaultOnboarding({ user, employeeId: employee.id }).catch(() => []);
  await notifyAdmins(user.orgId, 'Candidate Hired', `${a.full_name} was converted to employee ${employee.employeeCode}. ${tasks.length} onboarding tasks created.`, { dedupe_key: `applicant:converted:${id}` });
  return { employee, onboardingTasks: tasks.length };
};

module.exports = { resources, addDefaultOnboarding, convertApplicant };
