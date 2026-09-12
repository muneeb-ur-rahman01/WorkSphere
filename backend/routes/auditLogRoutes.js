const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditLogController');

router.use(requireAuth, requireRole('SuperAdmin', 'OrgAdmin'));
router.get('/', getAuditLogs);

module.exports = router;
