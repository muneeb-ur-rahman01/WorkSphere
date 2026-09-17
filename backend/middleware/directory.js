const validateDirectoryQuery = (req, res, next) => {
  const { search, focusArea } = req.query;

  req.directoryFilters = {
    search: search ? search.trim() : '',
    focusArea: focusArea ? focusArea.trim() : ''
  };

  next();
};

const validateDirectoryProfile = (req, res, next) => {
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({
      success: false,
      error: 'Organization ID is required.'
    });
  }

  next();
};

module.exports = {
  validateDirectoryQuery,
  validateDirectoryProfile
};