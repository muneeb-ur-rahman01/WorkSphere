const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole,
  requireRoleOrSectionPermission
} = require('../middleware/auth');

const {
  validateUserQuery,
  validateCreateStaff,
  validateStaffStatus,
  validateStaffRole,
  validateMentor
} = require('../middleware/user');

const {
  updateMyProfile,
  getUsers,
  createStaffByAdmin,
  updateStaffStatus,
  updateStaffRole,
  deleteStaff,
  assignMentor
} = require('../controllers/userController');

router.use(requireAuth);

router.get(
  '/',
  validateUserQuery,
  getUsers
);

router.post(
  '/',
  requireRole('OrgAdmin'),
  validateCreateStaff,
  createStaffByAdmin
);

// Edit own profile (name / email). SuperAdmin is intentionally excluded.
router.patch(
  '/me',
  requireRole('OrgAdmin', 'Employee', 'Intern', 'Volunteer', 'Membership', 'Executive Director'),
  updateMyProfile
);

router.patch(
  '/:id/status',
  requireRoleOrSectionPermission(
    'registration_requests',
    'OrgAdmin',
    'SuperAdmin'
  ),
  validateStaffStatus,
  updateStaffStatus
);

router.patch(
  '/:id/role',
  requireRole('OrgAdmin', 'SuperAdmin'),
  validateStaffRole,
  updateStaffRole
);

router.delete(
  '/:id',
  requireRole('OrgAdmin', 'SuperAdmin'),
  deleteStaff
);

router.patch(
  '/:id/mentor',
  requireRole('OrgAdmin'),
  validateMentor,
  assignMentor
);

module.exports = router;