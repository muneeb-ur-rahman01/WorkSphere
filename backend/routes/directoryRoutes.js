const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  validateDirectoryQuery,
  validateDirectoryProfile
} = require('../middleware/directory');

const {
  getDirectory,
  getDirectoryProfile
} = require('../controllers/directoryController');

router.use(
  requireAuth,
  requireRole('OrgAdmin')
);

router.get(
  '/',
  validateDirectoryQuery,
  getDirectory
);

router.get(
  '/:orgId',
  validateDirectoryProfile,
  getDirectoryProfile
);

module.exports = router;