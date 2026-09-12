const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { submitQuery, getQueries, updateQueryStatus, respondToQuery } = require('../controllers/queryController');

// Public — no auth. Powers the floating Query widget on the public site.
router.post('/', submitQuery);

router.use(requireAuth, requireRole('SuperAdmin'));
router.get('/', getQueries);
router.patch('/:id/status', updateQueryStatus);
router.post('/:id/respond', respondToQuery);

module.exports = router;
