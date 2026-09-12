const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getPlatformSettings, updatePlatformSetting } = require('../controllers/platformSettingsController');

router.use(requireAuth, requireRole('SuperAdmin'));
router.get('/', getPlatformSettings);
router.put('/:key', updatePlatformSetting);

module.exports = router;
