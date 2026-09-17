const documentService = require('../services/documentService');

const getDocuments = async (req, res) => {
  try {
    const documents = await documentService.getDocuments({
      user: req.user,
      filters: req.documentFilters
    });

    return res.json({
      success: true,
      documents
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch documents.'
    });
  }
};

const createDocument = async (req, res) => {
  try {
    const document = await documentService.createDocument({
      user: req.user,
      ...req.documentData
    });

    return res.json({
      success: true,
      document
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not upload document.'
    });
  }
};

const updateDocumentStatus = async (req, res) => {
  try {
    const document = await documentService.updateDocumentStatus({
      user: req.user,
      id: req.params.id,
      status: req.documentStatus
    });

    return res.json({
      success: true,
      document
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update document status.'
    });
  }
};

const deleteDocument = async (req, res) => {
  try {
    await documentService.deleteDocument({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not delete document.'
    });
  }
};

module.exports = {
  getDocuments,
  createDocument,
  updateDocumentStatus,
  deleteDocument
};