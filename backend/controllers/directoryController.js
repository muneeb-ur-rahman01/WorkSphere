const directoryService = require('../services/directoryService');

const getDirectory = async (req, res) => {
  try {
    const organizations = await directoryService.getDirectory({
      user: req.user,
      ...req.directoryFilters
    });

    return res.json({
      success: true,
      organizations
    });
  } catch (error) {
    console.error('getDirectory:', error);

    return res.status(500).json({
      success: false,
      error: 'Could not fetch the organization directory.'
    });
  }
};

const getDirectoryProfile = async (req, res) => {
  try {
    const organization =
      await directoryService.getDirectoryProfile({
        orgId: req.params.orgId
      });

    return res.json({
      success: true,
      organization
    });
  } catch (error) {
    console.error('getDirectoryProfile:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Could not fetch organization profile.'
    });
  }
};

module.exports = {
  getDirectory,
  getDirectoryProfile
};