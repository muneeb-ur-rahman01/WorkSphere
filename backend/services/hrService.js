const crypto = require('crypto');
const supabase = require('../config/supabase');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');
const { STAFF_ROLES } = require('./attendanceService');

const PHOTO_BUCKET = 'employee-photos';

const httpErr = (message, statusCode) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const clean = (v) => (typeof v === 'string' ? v.trim() || null : v ?? null);

const sniffImage = (buf) => {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  return null;
};

const signPhoto = async (path) => {
  if (!path) return null;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
};

const serializeEmployee = (e, extra = {}) => ({
  id: e.id,
  userId: e.user_id,
  employeeCode: e.employee_code,
  fullName: e.full_name,
  personalEmail: e.personal_email,
  phone: e.phone,
  address: e.address,
  dateOfBirth: e.date_of_birth,
  gender: e.gender,
  nationalId: e.national_id,
  emergencyContactName: e.emergency_contact_name,
  emergencyContactPhone: e.emergency_contact_phone,
  departmentId: e.department_id,
  designationId: e.designation_id,
  joiningDate: e.joining_date,
  employmentType: e.employment_type,
  employmentStatus: e.employment_status,
  hasPhoto: !!e.profile_photo_path,
  createdAt: e.created_at,
  ...extra
});

const notify = (row) => supabase.from('notifications').insert({ type: 'GeneralAlert', target_role: 'All', ...row });

// ------------------------------------------------------------------ departments
const listDepartments = async ({ user }) => {
  const [d, e, g] = await Promise.all([
    supabase.from('departments').select('*').eq('org_id', user.orgId).order('name'),
    supabase.from('employees').select('department_id').eq('org_id', user.orgId),
    supabase.from('designations').select('department_id').eq('org_id', user.orgId)
  ]);
  if (d.error || e.error || g.error) throw httpErr('Could not load departments.', 500);
  const count = (rows) => rows.reduce((m, r) => (r.department_id ? { ...m, [r.department_id]: (m[r.department_id] || 0) + 1 } : m), {});
  const ec = count(e.data), gc = count(g.data);
  return d.data.map((x) => ({ id: x.id, name: x.name, description: x.description, status: x.status, employeeCount: ec[x.id] || 0, designationCount: gc[x.id] || 0 }));
};

const saveDepartment = async ({ user, id, name, description, status }) => {
  const row = {};
  if (name !== undefined) row.name = name.trim();
  if (description !== undefined) row.description = clean(description);
  if (status !== undefined) row.status = status;
  const q = id
    ? supabase.from('departments').update(row).eq('id', id).eq('org_id', user.orgId)
    : supabase.from('departments').insert({ ...row, org_id: user.orgId, created_by: user.id });
  const { data, error } = await q.select().maybeSingle();
  if (error) {
    if (error.code === '23505') throw httpErr('A department with this name already exists.', 409);
    throw httpErr('Could not save department.', 500);
  }
  if (!data) throw httpErr('Department not found.', 404);
  await logAudit({ actor: user, orgId: user.orgId, action: id ? AUDIT_ACTIONS.DEPARTMENT_UPDATED : AUDIT_ACTIONS.DEPARTMENT_CREATED, entityType: 'department', entityId: data.id, entityLabel: data.name });
  return { id: data.id, name: data.name, description: data.description, status: data.status };
};

const deleteDepartment = async ({ user, id }) => {
  const [e, g] = await Promise.all([
    supabase.from('employees').select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('department_id', id),
    supabase.from('designations').select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('department_id', id)
  ]);
  if ((e.count || 0) + (g.count || 0) > 0) throw httpErr('This department is still in use. Reassign its employees and designations, or mark it Inactive instead.', 409);
  const { data, error } = await supabase.from('departments').delete().eq('id', id).eq('org_id', user.orgId).select().maybeSingle();
  if (error) throw httpErr('Could not delete department.', 500);
  if (!data) throw httpErr('Department not found.', 404);
  await logAudit({ actor: user, orgId: user.orgId, action: AUDIT_ACTIONS.DEPARTMENT_DELETED, entityType: 'department', entityId: id, entityLabel: data.name });
};

// ------------------------------------------------------------------ designations
const assertDepartment = async (orgId, departmentId) => {
  if (!departmentId) return;
  const { data } = await supabase.from('departments').select('id').eq('id', departmentId).eq('org_id', orgId).maybeSingle();
  if (!data) throw httpErr('Invalid department.', 400);
};

const listDesignations = async ({ user }) => {
  const [g, e] = await Promise.all([
    supabase.from('designations').select('*').eq('org_id', user.orgId).order('title'),
    supabase.from('employees').select('designation_id').eq('org_id', user.orgId)
  ]);
  if (g.error || e.error) throw httpErr('Could not load designations.', 500);
  const ec = e.data.reduce((m, r) => (r.designation_id ? { ...m, [r.designation_id]: (m[r.designation_id] || 0) + 1 } : m), {});
  return g.data.map((x) => ({ id: x.id, title: x.title, description: x.description, departmentId: x.department_id, status: x.status, employeeCount: ec[x.id] || 0 }));
};

const saveDesignation = async ({ user, id, title, description, departmentId, status }) => {
  if (departmentId) await assertDepartment(user.orgId, departmentId);
  const row = {};
  if (title !== undefined) row.title = title.trim();
  if (description !== undefined) row.description = clean(description);
  if (departmentId !== undefined) row.department_id = departmentId || null;
  if (status !== undefined) row.status = status;
  const q = id
    ? supabase.from('designations').update(row).eq('id', id).eq('org_id', user.orgId)
    : supabase.from('designations').insert({ ...row, org_id: user.orgId, created_by: user.id });
  const { data, error } = await q.select().maybeSingle();
  if (error) {
    if (error.code === '23505') throw httpErr('A designation with this title already exists.', 409);
    throw httpErr('Could not save designation.', 500);
  }
  if (!data) throw httpErr('Designation not found.', 404);
  await logAudit({ actor: user, orgId: user.orgId, action: id ? AUDIT_ACTIONS.DESIGNATION_UPDATED : AUDIT_ACTIONS.DESIGNATION_CREATED, entityType: 'designation', entityId: data.id, entityLabel: data.title });
  return { id: data.id, title: data.title, description: data.description, departmentId: data.department_id, status: data.status };
};

const deleteDesignation = async ({ user, id }) => {
  const { count } = await supabase.from('employees').select('id', { count: 'exact', head: true }).eq('org_id', user.orgId).eq('designation_id', id);
  if (count > 0) throw httpErr('This designation is assigned to employees. Reassign them, or mark it Inactive instead.', 409);
  const { data, error } = await supabase.from('designations').delete().eq('id', id).eq('org_id', user.orgId).select().maybeSingle();
  if (error) throw httpErr('Could not delete designation.', 500);
  if (!data) throw httpErr('Designation not found.', 404);
  await logAudit({ actor: user, orgId: user.orgId, action: AUDIT_ACTIONS.DESIGNATION_DELETED, entityType: 'designation', entityId: id, entityLabel: data.title });
};

// ------------------------------------------------------------------ employees
const loadNames = async (orgId) => {
  const [d, g] = await Promise.all([
    supabase.from('departments').select('id, name').eq('org_id', orgId),
    supabase.from('designations').select('id, title').eq('org_id', orgId)
  ]);
  return {
    dept: new Map((d.data || []).map((x) => [x.id, x.name])),
    desig: new Map((g.data || []).map((x) => [x.id, x.title]))
  };
};

const listEmployees = async ({ user, search, departmentId, status }) => {
  let q = supabase.from('employees').select('*').eq('org_id', user.orgId).order('employee_code').limit(1000);
  if (departmentId) q = q.eq('department_id', departmentId);
  if (status) q = q.eq('employment_status', status);

  // Search runs in the database (before the row cap) so large organizations still find everyone.
  const term = typeof search === 'string' ? search.replace(/[%,()\\*:"']/g, ' ').trim().slice(0, 80) : '';
  if (term) {
    const { data: byEmail } = await supabase.from('users').select('id').eq('org_id', user.orgId).ilike('email', `%${term}%`).limit(100);
    const ors = [`full_name.ilike.%${term}%`, `employee_code.ilike.%${term}%`, `phone.ilike.%${term}%`, `personal_email.ilike.%${term}%`];
    if (byEmail?.length) ors.push(`user_id.in.(${byEmail.map((u) => u.id).join(',')})`);
    q = q.or(ors.join(','));
  }
  const { data, error } = await q;
  if (error) throw httpErr('Could not load employees.', 500);

  const ids = data.map((e) => e.user_id);
  const [names, users] = await Promise.all([
    loadNames(user.orgId),
    ids.length ? supabase.from('users').select('id, email, role, status').eq('org_id', user.orgId).in('id', ids) : { data: [] }
  ]);
  const umap = new Map((users.data || []).map((u) => [u.id, u]));
  return data.map((e) => serializeEmployee(e, {
    departmentName: names.dept.get(e.department_id) || null,
    designationTitle: names.desig.get(e.designation_id) || null,
    loginEmail: umap.get(e.user_id)?.email,
    role: umap.get(e.user_id)?.role,
    accountStatus: umap.get(e.user_id)?.status
  }));
};

// Staff accounts in this org that do not have an HR record yet
const listUnlinkedStaff = async ({ user }) => {
  const [u, e] = await Promise.all([
    supabase.from('users').select('id, full_name, email, role').eq('org_id', user.orgId).eq('status', 'Active').in('role', STAFF_ROLES).order('full_name'),
    supabase.from('employees').select('user_id').eq('org_id', user.orgId)
  ]);
  if (u.error || e.error) throw httpErr('Could not load staff accounts.', 500);
  const linked = new Set(e.data.map((x) => x.user_id));
  return u.data.filter((x) => !linked.has(x.id)).map((x) => ({ userId: x.id, fullName: x.full_name, email: x.email, role: x.role }));
};

const insertEmployee = async ({ user, account, fields }) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: code } = await supabase.rpc('ws_next_employee_code', { p_org: user.orgId });
    const { data, error } = await supabase.from('employees').insert({
      org_id: user.orgId, user_id: account.id, full_name: account.full_name,
      employee_code: fields.employeeCode || code,
      created_by: user.id, ...fields.row
    }).select().single();
    if (!error) return data;
    if (error.code === '23505' && /uq_employees_user/.test(error.message + (error.details || ''))) throw httpErr('This staff member already has an employee profile.', 409);
    if (error.code === '23505' && fields.employeeCode) throw httpErr('This employee ID is already in use.', 409);
    if (error.code !== '23505') throw httpErr('Could not create employee profile.', 500);
    // auto-generated code collided with a concurrent insert: retry with a fresh one
  }
  throw httpErr('Could not allocate an employee ID. Please try again.', 500);
};

const validateRefs = async (orgId, { departmentId, designationId }) => {
  await assertDepartment(orgId, departmentId);
  if (designationId) {
    const { data } = await supabase.from('designations').select('id').eq('id', designationId).eq('org_id', orgId).maybeSingle();
    if (!data) throw httpErr('Invalid designation.', 400);
  }
};

const rowFromBody = (b) => {
  const row = {};
  const map = {
    fullName: 'full_name', personalEmail: 'personal_email', phone: 'phone', address: 'address',
    dateOfBirth: 'date_of_birth', gender: 'gender', nationalId: 'national_id',
    emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone',
    departmentId: 'department_id', designationId: 'designation_id', joiningDate: 'joining_date',
    employmentType: 'employment_type', employmentStatus: 'employment_status'
  };
  for (const [k, col] of Object.entries(map)) if (b[k] !== undefined) row[col] = clean(b[k]);
  return row;
};

const createEmployee = async ({ user, userId, employeeCode, ...body }) => {
  const { data: account } = await supabase.from('users').select('id, full_name, role').eq('id', userId).eq('org_id', user.orgId).eq('status', 'Active').maybeSingle();
  if (!account || !STAFF_ROLES.includes(account.role)) throw httpErr('Select an active staff account from your organization.', 400);
  await validateRefs(user.orgId, body);
  const row = rowFromBody(body);
  delete row.full_name; // name always follows the login account at creation
  const data = await insertEmployee({ user, account, fields: { employeeCode: clean(employeeCode), row } });

  await notify({ org_id: user.orgId, title: 'New Employee Created', message: `${data.full_name} (${data.employee_code}) was added to employee records.`, target_role: 'OrgAdmin', dedupe_key: `employee:created:${data.id}` });
  await notify({ org_id: user.orgId, title: 'Your Employee Profile Is Ready', message: `Your employee ID is ${data.employee_code}.`, target_user_id: data.user_id, dedupe_key: `employee:created:self:${data.id}` });
  await logAudit({ actor: user, orgId: user.orgId, action: AUDIT_ACTIONS.EMPLOYEE_CREATED, entityType: 'employee', entityId: data.id, entityLabel: `${data.full_name} (${data.employee_code})` });
  return serializeEmployee(data);
};

// Create HR records for every active staff account that lacks one (idempotent).
const syncEmployees = async ({ user }) => {
  const unlinked = await listUnlinkedStaff({ user });
  let created = 0;
  for (const u of unlinked) {
    try {
      const { data: account } = await supabase.from('users').select('id, full_name, created_at').eq('id', u.userId).maybeSingle();
      const data = await insertEmployee({ user, account, fields: { row: { joining_date: account.created_at?.slice(0, 10) || null } } });
      created++;
      await logAudit({ actor: user, orgId: user.orgId, action: AUDIT_ACTIONS.EMPLOYEE_CREATED, entityType: 'employee', entityId: data.id, entityLabel: `${data.full_name} (${data.employee_code})`, metadata: { via: 'sync' } });
    } catch (err) {
      if (err.statusCode !== 409) throw err;
    }
  }
  if (created) await notify({ org_id: user.orgId, title: 'Employee Records Created', message: `${created} employee record${created > 1 ? 's were' : ' was'} created from existing staff accounts.`, target_role: 'OrgAdmin' });
  return { created };
};

const updateEmployee = async ({ user, id, ...body }) => {
  await validateRefs(user.orgId, body);
  const row = rowFromBody(body);
  if (body.employeeCode !== undefined) row.employee_code = clean(body.employeeCode);
  if (!Object.keys(row).length) throw httpErr('Nothing to update.', 400);
  const { data: before } = await supabase.from('employees').select('*').eq('id', id).eq('org_id', user.orgId).maybeSingle();
  if (!before) throw httpErr('Employee not found.', 404);
  const { data, error } = await supabase.from('employees').update(row).eq('id', id).eq('org_id', user.orgId).select().maybeSingle();
  if (error) {
    if (error.code === '23505') throw httpErr('This employee ID is already in use.', 409);
    throw httpErr('Could not update employee profile.', 500);
  }
  const changed = Object.keys(row).filter((k) => String(before[k] ?? '') !== String(data[k] ?? ''));
  if (changed.length) {
    await notify({ org_id: user.orgId, title: 'Your Profile Was Updated', message: 'An administrator updated your employee profile.', target_user_id: data.user_id, dedupe_key: `employee:updated:${data.id}:${Date.now()}` });
    await logAudit({ actor: user, orgId: user.orgId, action: AUDIT_ACTIONS.EMPLOYEE_UPDATED, entityType: 'employee', entityId: data.id, entityLabel: `${data.full_name} (${data.employee_code})`, metadata: { fields: changed } });
  }
  return serializeEmployee(data);
};

// ------------------------------------------------------------------ self profile (staff dashboard card)
const getMyProfile = async ({ user }) => {
  const [{ data: account }, { data: emp }] = await Promise.all([
    supabase.from('users').select('id, full_name, email, role, status').eq('id', user.id).maybeSingle(),
    supabase.from('employees').select('*').eq('user_id', user.id).eq('org_id', user.orgId).maybeSingle()
  ]);
  if (!account) throw httpErr('Account not found.', 404);
  const names = emp ? await loadNames(user.orgId) : null;
  return {
    fullName: emp?.full_name || account.full_name,
    email: account.email,
    role: account.role,
    accountStatus: account.status,
    hasEmployeeRecord: !!emp,
    employeeCode: emp?.employee_code || null,
    department: emp ? names.dept.get(emp.department_id) || null : null,
    designation: emp ? names.desig.get(emp.designation_id) || null : null,
    employmentStatus: emp?.employment_status || null,
    employmentType: emp?.employment_type || null,
    joiningDate: emp?.joining_date || null,
    photoUrl: await signPhoto(emp?.profile_photo_path)
  };
};

const uploadPhoto = async ({ user, employeeId, file }) => {
  if (!file) throw httpErr('Select an image file.', 400);
  const type = sniffImage(file.buffer);
  if (!type) throw httpErr('Photo must be a JPG or PNG image.', 400);

  let q = supabase.from('employees').select('id, user_id, profile_photo_path').eq('org_id', user.orgId);
  q = employeeId ? q.eq('id', employeeId) : q.eq('user_id', user.id); // staff can only ever touch their own
  const { data: emp } = await q.maybeSingle();
  if (!emp) throw httpErr(employeeId ? 'Employee not found.' : 'You do not have an employee profile yet. Please ask your administrator.', 404);

  const path = `${user.orgId}/${emp.user_id}/${crypto.randomUUID()}.${type.ext}`;
  const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file.buffer, { contentType: type.mime, upsert: false });
  if (upErr) throw httpErr('Could not upload the photo.', 500);
  const { error } = await supabase.from('employees').update({ profile_photo_path: path }).eq('id', emp.id).eq('org_id', user.orgId);
  if (error) { await supabase.storage.from(PHOTO_BUCKET).remove([path]); throw httpErr('Could not save the photo.', 500); }
  if (emp.profile_photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([emp.profile_photo_path]);
  return { photoUrl: await signPhoto(path) };
};

const getEmployeePhotoUrl = async ({ user, id }) => {
  const { data } = await supabase.from('employees').select('profile_photo_path').eq('id', id).eq('org_id', user.orgId).maybeSingle();
  if (!data?.profile_photo_path) throw httpErr('Photo not found.', 404);
  return signPhoto(data.profile_photo_path);
};

module.exports = {
  listDepartments, saveDepartment, deleteDepartment,
  listDesignations, saveDesignation, deleteDesignation,
  listEmployees, listUnlinkedStaff, createEmployee, updateEmployee, syncEmployees,
  getMyProfile, uploadPhoto, getEmployeePhotoUrl
};
