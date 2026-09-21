const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  validateSubmitQuery,
  validateQueryStatus,
  validateQueryResponse
} = require('../middleware/query');

const {
  submitQuery,
  getQueries,
  updateQueryStatus,
  respondToQuery
} = require('../controllers/queryController');

// Public — no auth.
// Powers the floating Query widget on the public site.
router.post('/', validateSubmitQuery, submitQuery);

// SuperAdmin (general platform queries) and OrgAdmin (queries addressed to
// their own organization). Scoping is enforced in queryService.
router.use(requireAuth, requireRole('SuperAdmin', 'OrgAdmin'));

router.get('/', getQueries);

router.patch(
  '/:id/status',
  validateQueryStatus,
  updateQueryStatus
);

router.post(
  '/:id/respond',
  validateQueryResponse,
  respondToQuery
);

module.exports = router;