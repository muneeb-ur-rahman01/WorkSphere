const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  validatePermissionUserQuery,
  validateGrantPermission,
  validateRevokePermission
} = require('../middleware/permission');

const {
  getAssignableSections,
  getMyPermissions,
  getUserPermissions,
  grantPermission,
  revokePermission
} = require('../controllers/permissionController');

router.use(requireAuth);

router.get(
  '/sections',
  getAssignableSections
);

router.get(
  '/me',
  getMyPermissions
);

router.get(
  '/',
  requireRole('OrgAdmin'),
  validatePermissionUserQuery,
  getUserPermissions
);

router.post(
  '/',
  requireRole('OrgAdmin'),
  validateGrantPermission,
  grantPermission
);

router.delete(
  '/',
  requireRole('OrgAdmin'),
  validateRevokePermission,
  revokePermission
);

module.exports = router;