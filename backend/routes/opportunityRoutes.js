const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const {
  getMyOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getOpportunityApplications
} = require('../controllers/opportunityController');

router.use(requireAuth, requireRole('OrgAdmin'));

router.get('/', getMyOpportunities);
router.post('/', requireOperational(), createOpportunity);
router.patch('/:id', requireOperational(), updateOpportunity);
router.delete('/:id', deleteOpportunity); // deletion always allowed, even while locked
router.get('/:id/applications', getOpportunityApplications);

module.exports = router;
