const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const auditLogsMiddleware = require('../middleware/auditlogs');

const {
  getAuditLogs
} = require('../controllers/auditLogController');

router.use(
  requireAuth,
  requireRole('SuperAdmin', 'OrgAdmin')
);

router.get(
  '/',
  auditLogsMiddleware,
  getAuditLogs
);

module.exports = router;