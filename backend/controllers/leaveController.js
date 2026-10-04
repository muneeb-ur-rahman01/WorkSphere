const svc = require('../services/leaveService');

const handle = (fn, key, fallback) => async (req, res) => {
  try {
    const result = await fn(req);
    return res.json({ success: true, ...(key ? { [key]: result } : result) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : fallback });
  }
};

module.exports = {
  listCategories: handle((req) => svc.listCategories({ user: req.user, includeInactive: req.query.includeInactive === 'true' }), 'categories', 'Could not load leave categories.'),
  createCategory: handle((req) => svc.saveCategory({ user: req.user, ...req.body }), 'category', 'Could not save leave category.'),
  updateCategory: handle((req) => svc.saveCategory({ user: req.user, id: req.params.id, ...req.body }), 'category', 'Could not save leave category.'),
  createRequest: handle((req) => svc.createRequest({ user: req.user, ...req.body, file: req.file }), 'request', 'Could not submit leave request.'),
  listMine: handle((req) => svc.listMine({ user: req.user }), 'requests', 'Could not load leave requests.'),
  cancelMine: handle((req) => svc.cancelMine({ user: req.user, id: req.params.id }), 'request', 'Could not cancel leave request.'),
  listOrg: handle((req) => svc.listOrg({ user: req.user, status: req.query.status }), 'requests', 'Could not load leave requests.'),
  review: handle((req) => svc.review({ user: req.user, id: req.params.id, decision: req.body.decision, remarks: req.body.remarks }), 'request', 'Could not update leave request.'),
  attachment: handle(async (req) => ({ url: await svc.getAttachmentUrl({ user: req.user, id: req.params.id }) }), null, 'Could not open the attachment.')
};
