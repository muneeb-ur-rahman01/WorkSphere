const permissionService = require('../services/permissionServices');

const setUserPermissions = async (req, res) => {
  try {
    const result = await permissionService.setUserPermissions({
      user: req.user,
      userId: req.body.userId,
      sectionKeys: req.body.sectionKeys
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not save access.'
    });
  }
};

const getAssignableSections = async (req, res) => {
  try {
    const sections =
      await permissionService.getAssignableSections();

    return res.json({
      success: true,
      sections
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not fetch sections.'
    });
  }
};

const getMyPermissions = async (req, res) => {
  try {
    const sections =
      await permissionService.getMyPermissions({
        user: req.user
      });

    return res.json({
      success: true,
      sections
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not fetch permissions.'
    });
  }
};

const getUserPermissions = async (req, res) => {
  try {
    const sections =
      await permissionService.getUserPermissions({
        user: req.user,
        userId: req.query.userId
      });

    return res.json({
      success: true,
      sections
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not fetch permissions.'
    });
  }
};

const grantPermission = async (req, res) => {
  try {
    await permissionService.grantPermission({
      user: req.user,
      userId: req.permissionData.userId,
      sectionKey: req.permissionData.sectionKey
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not grant access.'
    });
  }
};

const revokePermission = async (req, res) => {
  try {
    await permissionService.revokePermission({
      user: req.user,
      userId: req.permissionData.userId,
      sectionKey: req.permissionData.sectionKey
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not revoke access.'
    });
  }
};

module.exports = {
  getAssignableSections,
  getMyPermissions,
  getUserPermissions,
  grantPermission,
  revokePermission,
  setUserPermissions
};