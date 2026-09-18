const express = require('express');
const multer = require('multer');

const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { requireFeature } = require('../middleware/subscriptionAccess');
const { FEATURES } = require('../config/plans');
const { fileUploadLimiter } = require('../middleware/rateLimiter');

const {
  validatePrescriptionAudio
} = require('../middleware/prescription');

const {
  createFromAudio,
  getPrescriptions
} = require('../controllers/prescriptionController');

// Keep the recording in memory (no disk writes).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('audio/')) {
      return cb(new Error('Only audio files are allowed.'));
    }

    cb(null, true);
  }
});

router.use(requireAuth);

// AI prescription voice dictation is available only to OrgAdmin
// and only when the organization's active plan includes the feature.
router.post(
  '/',
  requireRole('OrgAdmin'),
  requireFeature(FEATURES.AI_PRESCRIPTIONS),
  fileUploadLimiter,
  upload.single('audio'),
  validatePrescriptionAudio,
  createFromAudio
);

router.get(
  '/',
  requireRole('OrgAdmin'),
  getPrescriptions
);

module.exports = router;