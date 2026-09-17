const organizationService = require('../services/organizationServices');

// ============================================================
// Public
// ============================================================

const getPublicOrganizations = async (req, res) => {
  try {
    const organizations =
      await organizationService.getPublicOrganizations();

    return res.json({
      success: true,
      organizations
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch organizations.'
    });
  }
};

// ============================================================
// Authenticated Organization Member
// ============================================================

const getMyOrganization = async (req, res) => {
  try {
    const organization =
      await organizationService.getMyOrganization({
        orgId: req.user.orgId
      });

    return res.json({
      success: true,
      organization
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch organization.'
    });
  }
};

const updateMyDirectoryProfile = async (req, res) => {
  try {
    const organization =
      await organizationService.updateMyDirectoryProfile({
        orgId: req.user.orgId,
        profileData: req.directoryProfileData
      });

    return res.json({
      success: true,
      organization
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not update organization profile.'
    });
  }
};

const setMyCancellationRequest = async (req, res) => {
  try {
    const organization =
      await organizationService.setMyCancellationRequest({
        orgId: req.user.orgId,
        cancel: req.cancellationData.cancel,
        actor: req.user
      });

    return res.json({
      success: true,
      organization
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not update cancellation status.'
    });
  }
};

// ============================================================
// SuperAdmin
// ============================================================

const getOrganizations = async (req, res) => {
  try {
    const organizations =
      await organizationService.getOrganizations();

    return res.json({
      success: true,
      organizations
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch organizations.'
    });
  }
};

const updateOrgStatus = async (req, res) => {
  try {
    await organizationService.updateOrgStatus({
      id: req.params.id,
      status: req.organizationStatus,
      actor: req.user
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not update organization status.'
    });
  }
};

const setPublicEventsEnabled = async (req, res) => {
  try {
    await organizationService.setPublicEventsEnabled({
      id: req.params.id,
      enabled: req.publicEventsData.enabled
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not update public visibility setting.'
    });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    await organizationService.deleteOrganization({
      id: req.params.id,
      actor: req.user
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not delete organization.'
    });
  }
};

module.exports = {
  getPublicOrganizations,
  getMyOrganization,
  getOrganizations,
  updateOrgStatus,
  deleteOrganization,
  setPublicEventsEnabled,
  updateMyDirectoryProfile,
  setMyCancellationRequest
};