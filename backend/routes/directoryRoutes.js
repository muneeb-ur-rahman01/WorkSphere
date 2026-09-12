const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getDirectory, getDirectoryProfile } = require('../controllers/directoryController');

// Browsing the directory is read-only; keep it to OrgAdmins for now since
// sending a connection request (the whole point of browsing) is OrgAdmin-only.
router.use(requireAuth, requireRole('OrgAdmin'));
router.get('/', getDirectory);
router.get('/:orgId', getDirectoryProfile);

module.exports = router;
