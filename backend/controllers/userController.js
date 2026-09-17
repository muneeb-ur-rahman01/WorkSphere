const userService = require('../services/userService');

const getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers({
      user: req.user,
      ...req.userFilters
    });

    return res.json({
      success: true,
      users
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch users.'
    });
  }
};

const createStaffByAdmin = async (req, res) => {
  try {
    const user = await userService.createStaffByAdmin({
      user: req.user,
      ...req.staffData
    });

    return res.json({
      success: true,
      user
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not create staff member.'
    });
  }
};

const updateStaffStatus = async (req, res) => {
  try {
    await userService.updateStaffStatus({
      user: req.user,
      id: req.params.id,
      status: req.staffStatus
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update user status.'
    });
  }
};

const updateStaffRole = async (req, res) => {
  try {
    await userService.updateStaffRole({
      user: req.user,
      id: req.params.id,
      role: req.staffRole
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update role.'
    });
  }
};

const deleteStaff = async (req, res) => {
  try {
    await userService.deleteStaff({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not remove staff member.'
    });
  }
};

const assignMentor = async (req, res) => {
  try {
    await userService.assignMentor({
      id: req.params.id,
      mentorName: req.mentorName
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not assign mentor.'
    });
  }
};

module.exports = {
  getUsers,
  createStaffByAdmin,
  updateStaffStatus,
  updateStaffRole,
  deleteStaff,
  assignMentor
};