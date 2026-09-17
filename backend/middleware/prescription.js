const validatePrescriptionAudio = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No audio file was received.'
    });
  }

  next();
};

module.exports = {
  validatePrescriptionAudio
};