const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getAvailability, updateAvailability } = require('../controllers/availabilityController');

router.use(requireAuth);
router.get('/', getAvailability);
router.post('/', updateAvailability);

module.exports = router;
