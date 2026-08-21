const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getAssignableSections, getMyPermissions, getUserPermissions, grantPermission, revokePermission
} = require('../controllers/permissionController');

router.use(requireAuth);

router.get('/sections', getAssignableSections); // static registry, any authenticated user
router.get('/me', getMyPermissions); // sections granted to the caller

router.get('/', requireRole('OrgAdmin'), getUserPermissions);
router.post('/', requireRole('OrgAdmin'), grantPermission);
router.delete('/', requireRole('OrgAdmin'), revokePermission);

module.exports = router;
