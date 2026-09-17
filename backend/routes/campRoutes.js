const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission
} = require('../middleware/auth');

const {
  requireOperational
} = require('../middleware/subscriptionAccess');

const {
  validateCreateCamp,
  validateUpdateCamp
} = require('../middleware/camp');

const {
  getCamps,
  createCamp,
  updateCamp,
  deleteCamp
} = require('../controllers/campController');

router.use(requireAuth);

router.get('/', getCamps);

router.post(
  '/',
  requireRoleOrSectionPermission('camps', 'OrgAdmin'),
  requireOperational(),
  validateCreateCamp,
  createCamp
);

router.patch(
  '/:id',
  requireRoleOrSectionPermission('camps', 'OrgAdmin'),
  requireOperational(),
  validateUpdateCamp,
  updateCamp
);

router.delete(
  '/:id',
  requireRoleOrSectionPermission('camps', 'OrgAdmin'),
  deleteCamp
);

module.exports = router;