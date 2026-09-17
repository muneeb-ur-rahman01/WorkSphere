const beneficiaryService = require(
  '../services/beneficaryService'
);

const getBeneficiaries = async (
  req,
  res
) => {
  try {
    const beneficiaries =
      await beneficiaryService.getBeneficiaries({
        user: req.user,
        orgId: req.query.orgId
      });

    return res.json({
      success: true,
      beneficiaries
    });
  } catch (error) {
    console.error(
      '[getBeneficiaries controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not fetch beneficiaries.'
    });
  }
};

const createBeneficiary = async (
  req,
  res
) => {
  try {
    const {
      name,
      contactInfo,
      demographicNotes
    } = req.beneficiaryData;

    const beneficiary =
      await beneficiaryService.createBeneficiary({
        user: req.user,
        name,
        contactInfo,
        demographicNotes
      });

    return res.json({
      success: true,
      beneficiary
    });
  } catch (error) {
    console.error(
      '[createBeneficiary controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not register beneficiary.'
    });
  }
};

const updateBeneficiary = async (
  req,
  res
) => {
  try {
    const {
      name,
      contactInfo,
      demographicNotes
    } = req.body;

    const beneficiary =
      await beneficiaryService.updateBeneficiary({
        user: req.user,
        id: req.params.id,
        name,
        contactInfo,
        demographicNotes
      });

    return res.json({
      success: true,
      beneficiary
    });
  } catch (error) {
    console.error(
      '[updateBeneficiary controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not update beneficiary.'
    });
  }
};

const deleteBeneficiary = async (
  req,
  res
) => {
  try {
    await beneficiaryService.deleteBeneficiary({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error(
      '[deleteBeneficiary controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not delete beneficiary.'
    });
  }
};

module.exports = {
  getBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary
};