const validateCreateBeneficiary = (
  req,
  res,
  next
) => {
  const {
    name,
    contactInfo,
    demographicNotes
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Name is required.'
    });
  }

  req.beneficiaryData = {
    name,
    contactInfo,
    demographicNotes
  };

  next();
};

module.exports = {
  validateCreateBeneficiary
};