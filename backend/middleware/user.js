const STAFF_ROLES = [
  'Employee',
  'Intern',
  'Volunteer',
  'Membership',
  'Executive Director'
];

const USER_STATUSES = [
  'Active',
  'Pending',
  'Suspended',
  'Rejected'
];

const validateUserQuery = (req, res, next) => {
  req.userFilters = {
    orgId: req.query.orgId
  };

  next();
};

const validateCreateStaff = (req, res, next) => {
  const {
    fullName,
    email,
    password,
    role
  } = req.body;

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      error: 'Please fill in all fields.'
    });
  }

  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role.'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters.'
    });
  }

  req.staffData = {
    fullName,
    email,
    password,
    role
  };

  next();
};

const validateStaffStatus = (req, res, next) => {
  const { status } = req.body;

  if (!USER_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value.'
    });
  }

  req.staffStatus = status;

  next();
};

const validateStaffRole = (req, res, next) => {
  const { role } = req.body;

  if (!role || !STAFF_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role.'
    });
  }

  req.staffRole = role;

  next();
};

const validateMentor = (req, res, next) => {
  const { mentorName } = req.body;

  if (!mentorName) {
    return res.status(400).json({
      success: false,
      error: 'Mentor name is required.'
    });
  }

  req.mentorName = mentorName;

  next();
};

module.exports = {
  validateUserQuery,
  validateCreateStaff,
  validateStaffStatus,
  validateStaffRole,
  validateMentor
};