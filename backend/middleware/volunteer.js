const validateVolunteerQuery = (req, res, next) => {
  req.volunteerFilters = {
    orgId: req.user.role === 'SuperAdmin'
      ? req.query.orgId
      : req.user.orgId
  };

  next();
};

const validateVolunteerProfile = (req, res, next) => {
  const {
    skills,
    interests,
    availability,
    totalHours,
    performanceNotes
  } = req.body;

  req.volunteerProfileData = {
    skills,
    interests,
    availability,
    totalHours,
    performanceNotes
  };

  next();
};

module.exports = {
  validateVolunteerQuery,
  validateVolunteerProfile
};