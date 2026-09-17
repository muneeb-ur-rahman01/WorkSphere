const {
  createFromAudio: createFromAudioService,
  getPrescriptions: getPrescriptionsService
} = require('../services/prescriptionService');

const createFromAudio = async (req, res) => {
  try {
    const prescription = await createFromAudioService({
      user: req.user,
      file: req.file
    });

    return res.json({
      success: true,
      prescription
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not create prescription.'
    });
  }
};

const getPrescriptions = async (req, res) => {
  try {
    const prescriptions = await getPrescriptionsService({
      user: req.user
    });

    return res.json({
      success: true,
      prescriptions
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch prescriptions.'
    });
  }
};

module.exports = {
  createFromAudio,
  getPrescriptions
};