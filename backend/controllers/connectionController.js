const connectionService = require('../services/connectionService');

const getConnections = async (req, res) => {
  try {
    const connections = await connectionService.getConnections({
      user: req.user
    });

    return res.json({
      success: true,
      connections
    });
  } catch (error) {
    console.error('getConnections:', error);

    return res.status(500).json({
      success: false,
      error: 'Could not fetch connections.'
    });
  }
};

const createConnectionRequest = async (req, res) => {
  try {
    const connection =
      await connectionService.createConnectionRequest({
        user: req.user,
        ...req.connectionData
      });

    return res.json({
      success: true,
      connection
    });
  } catch (error) {
    console.error('createConnectionRequest:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Could not send connection request.'
    });
  }
};

const respondToConnection = async (req, res) => {
  try {
    const connection =
      await connectionService.respondToConnection({
        user: req.user,
        id: req.params.id,
        ...req.connectionData
      });

    return res.json({
      success: true,
      connection
    });
  } catch (error) {
    console.error('respondToConnection:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Could not update connection.'
    });
  }
};

const withdrawConnection = async (req, res) => {
  try {
    const connection =
      await connectionService.withdrawConnection({
        user: req.user,
        id: req.params.id
      });

    return res.json({
      success: true,
      connection
    });
  } catch (error) {
    console.error('withdrawConnection:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Could not withdraw connection.'
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await connectionService.getMessages({
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
      error: error.message || 'Could not fetch messages.'
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const message = await connectionService.sendMessage({
      user: req.user,
      id: req.params.id,
      ...req.connectionData
    });

    return res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('sendMessage:', error);

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Could not send message.'
    });
  }
};

module.exports = {
  getConnections,
  createConnectionRequest,
  respondToConnection,
  withdrawConnection,
  getMessages,
  sendMessage
};