const express = require('express');
const multer = require('multer');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireFeature } = require('../middleware/subscriptionAccess');
const { FEATURES } = require('../config/plans');
const { createFromAudio, getPrescriptions } = require('../controllers/prescriptionController');

// Keep the recording in memory (no disk writes) - camps often have limited/no persistent storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('audio/')) {
      return cb(new Error('Only audio files are allowed.'));
    }
    cb(null, true);
  }
});

router.use(requireAuth);
// AI prescription dictation is a clinical/field-operations tool - restricted to
// roles that actually work camps (not the general "Membership" tier, which is
// a lighter-weight supporter role without clinical duties).
// AI transcription is a Premium-plan feature. requireFeature() checks the
// org's ACTIVE subscription + plan entitlement server-side (see
// backend/middleware/subscriptionAccess.js) so this can't be bypassed by
// calling the API directly even if the frontend button is hidden.
router.post(
  '/',
  requireRole('OrgAdmin', 'Employee', 'Intern', 'Volunteer', 'Executive Director'),
  requireFeature(FEATURES.AI_PRESCRIPTIONS),
  upload.single('audio'),
  createFromAudio
);
router.get('/', getPrescriptions);

module.exports = router;
