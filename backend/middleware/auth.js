const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// Verifies the Bearer token and attaches { id, role, orgId, email } to req.user
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'No auth token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, orgId, email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session. Please log in again.' });
  }
};

// Restrict a route to specific roles, e.g. requireRole('SuperAdmin', 'OrgAdmin')
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'You are not authorized to perform this action.' });
  }
  next();
};

// Like requireRole, but also lets through a staff member who was granted
// access to `sectionKey` via the Accessibility screen (see
// controllers/permissionController.js). Used for actions/data that live
// behind a permission-gated dashboard section (e.g. approving Registration
// Requests), where a plain role check would be too narrow.
const requireRoleOrSectionPermission = (sectionKey, ...roles) => async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ success: false, error: 'You are not authorized to perform this action.' });
  }
  if (roles.includes(req.user.role)) return next();

  const { data } = await supabase
    .from('staff_permissions')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('section_key', sectionKey)
    .maybeSingle();

  if (data) return next();
  return res.status(403).json({ success: false, error: 'You are not authorized to perform this action.' });
};

module.exports = { requireAuth, requireRole, requireRoleOrSectionPermission };
