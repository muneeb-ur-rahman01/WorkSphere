const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireRoleOrSectionPermission } = require('../middleware/auth');
const {
  getUsers, createStaffByAdmin, updateStaffStatus, updateStaffRole, deleteStaff, assignMentor
} = require('../controllers/userController');

router.use(requireAuth);
router.get('/', getUsers); // SuperAdmin, OrgAdmin (scoped), Staff (scoped, read-only use)
router.post('/', requireRole('OrgAdmin'), createStaffByAdmin);

// Also reachable by a staff member granted the 'registration_requests'
// Accessibility permission (see controllers/permissionController.js) so
// they can approve/reject registration requests just like an OrgAdmin.
router.patch('/:id/status', requireRoleOrSectionPermission('registration_requests', 'OrgAdmin', 'SuperAdmin'), updateStaffStatus);

router.patch('/:id/role', requireRole('OrgAdmin'), updateStaffRole);
router.delete('/:id', requireRole('OrgAdmin', 'SuperAdmin'), deleteStaff);
router.patch('/:id/mentor', requireRole('OrgAdmin'), assignMentor);

module.exports = router;
