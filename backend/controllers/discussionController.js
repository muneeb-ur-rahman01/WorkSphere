const discussionService = require('../services/discussionService');

const getMyGroups = async (req, res) => {
  try {
    const groups = await discussionService.getMyGroups({
      user: req.user
    });

    return res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('getMyGroups:', error);

    return res.status(500).json({
      success: false,
      error: 'Could not load discussion groups.'
    });
  }
};

const createGroup = async (req, res) => {
  try {
    const group = await discussionService.createGroup({
      user: req.user,
      ...req.discussionData
    });

    return res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('createGroup:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error:
        error.message ||
        'Could not create department.'
    });
  }
};

const updateGroup = async (req, res) => {
  try {
    const group = await discussionService.updateGroup({
      user: req.user,
      id: req.params.id,
      ...req.discussionData
    });

    return res.json({
      success: true,
      group
    });
  } catch (error) {
    console.error('updateGroup:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error:
        error.message ||
        'Could not update department.'
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    await discussionService.deleteGroup({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('deleteGroup:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error:
        error.message ||
        'Could not delete department.'
    });
  }
};

const getGroupMembers = async (req, res) => {
  try {
    const members =
      await discussionService.getGroupMembers({
        user: req.user,
        id: req.params.id
      });

    return res.json({
      success: true,
      members
    });
  } catch (error) {
    console.error('getGroupMembers:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error:
        error.message ||
        'Could not load members.'
    });
  }
};

const addGroupMember = async (req, res) => {
  try {
    await discussionService.addGroupMember({
      user: req.user,
      id: req.params.id,
      ...req.discussionData
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('addGroupMember:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error:
        error.message ||
        'Could not add member.'
    });
  }
};

const removeGroupMember = async (req, res) => {
  try {
    await discussionService.removeGroupMember({
      user: req.user,
      id: req.params.id,
      userId: req.params.userId
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('removeGroupMember:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error:
        error.message ||
        'Could not remove member.'
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const messages =
      await discussionService.getMessages({
        user: req.user,
        id: req.params.id
      });

    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('getMessages:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error:
        error.message ||
        'Could not load messages.'
    });
  }
};

const postMessage = async (req, res) => {
  try {
    const message =
      await discussionService.postMessage({
        user: req.user,
        id: req.params.id,
        ...req.discussionData
      });

    return res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('postMessage:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error:
        error.message ||
        'Could not send message.'
    });
  }
};

const markGroupRead = async (req, res) => {
  try {
    await discussionService.markGroupRead({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('markGroupRead:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error:
        error.message ||
        'Could not update read status.'
    });
  }
};

module.exports = {
  getMyGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMember,
  removeGroupMember,
  getMessages,
  postMessage,
  markGroupRead
};