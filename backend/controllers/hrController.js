const svc = require('../services/hrService');

const handle = (fn, key, fallback) => async (req, res) => {
  try {
    const result = await fn(req);
    return res.json({ success: true, ...(key ? { [key]: result } : result) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : fallback });
  }
};
const u = (req) => req.user;

module.exports = {
  listDepartments: handle((r) => svc.listDepartments({ user: u(r) }), 'departments', 'Could not load departments.'),
  createDepartment: handle((r) => svc.saveDepartment({ user: u(r), ...r.body }), 'department', 'Could not save department.'),
  updateDepartment: handle((r) => svc.saveDepartment({ user: u(r), id: r.params.id, ...r.body }), 'department', 'Could not save department.'),
  deleteDepartment: handle(async (r) => { await svc.deleteDepartment({ user: u(r), id: r.params.id }); return {}; }, null, 'Could not delete department.'),

  listDesignations: handle((r) => svc.listDesignations({ user: u(r) }), 'designations', 'Could not load designations.'),
  createDesignation: handle((r) => svc.saveDesignation({ user: u(r), ...r.body }), 'designation', 'Could not save designation.'),
  updateDesignation: handle((r) => svc.saveDesignation({ user: u(r), id: r.params.id, ...r.body }), 'designation', 'Could not save designation.'),
  deleteDesignation: handle(async (r) => { await svc.deleteDesignation({ user: u(r), id: r.params.id }); return {}; }, null, 'Could not delete designation.'),

  listEmployees: handle((r) => svc.listEmployees({ user: u(r), search: r.query.search, departmentId: r.query.departmentId, status: r.query.status }), 'employees', 'Could not load employees.'),
  listUnlinked: handle((r) => svc.listUnlinkedStaff({ user: u(r) }), 'staff', 'Could not load staff accounts.'),
  createEmployee: handle((r) => svc.createEmployee({ user: u(r), ...r.body }), 'employee', 'Could not create employee profile.'),
  updateEmployee: handle((r) => svc.updateEmployee({ user: u(r), id: r.params.id, ...r.body }), 'employee', 'Could not update employee profile.'),
  syncEmployees: handle((r) => svc.syncEmployees({ user: u(r) }), null, 'Could not create employee records.'),
  employeePhoto: handle(async (r) => ({ url: await svc.getEmployeePhotoUrl({ user: u(r), id: r.params.id }) }), null, 'Could not load photo.'),
  uploadEmployeePhoto: handle((r) => svc.uploadPhoto({ user: u(r), employeeId: r.params.id, file: r.file }), null, 'Could not upload the photo.'),

  myProfile: handle((r) => svc.getMyProfile({ user: u(r) }), 'profile', 'Could not load your profile.'),
  uploadMyPhoto: handle((r) => svc.uploadPhoto({ user: u(r), file: r.file }), null, 'Could not upload the photo.')
};
