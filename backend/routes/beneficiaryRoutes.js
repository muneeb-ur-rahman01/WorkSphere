const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const {
  getBeneficiaries, createBeneficiary, updateBeneficiary, deleteBeneficiary,
  getEnrollments, createEnrollment, updateEnrollment, deleteEnrollment
} = require('../controllers/beneficiaryController');

router.use(requireAuth);
router.get('/', getBeneficiaries);
router.post('/', requireRoleOrSectionPermission('beneficiaries', 'OrgAdmin'), requireOperational(), createBeneficiary);
router.patch('/:id', requireRoleOrSectionPermission('beneficiaries', 'OrgAdmin'), requireOperational(), updateBeneficiary);
router.delete('/:id', requireRoleOrSectionPermission('beneficiaries', 'OrgAdmin'), deleteBeneficiary);

router.get('/enrollments/all', getEnrollments);
router.post('/enrollments', requireRoleOrSectionPermission('beneficiaries', 'OrgAdmin'), requireOperational(), createEnrollment);
router.patch('/enrollments/:id', requireRoleOrSectionPermission('beneficiaries', 'OrgAdmin'), requireOperational(), updateEnrollment);
router.delete('/enrollments/:id', requireRoleOrSectionPermission('beneficiaries', 'OrgAdmin'), deleteEnrollment);

module.exports = router;
