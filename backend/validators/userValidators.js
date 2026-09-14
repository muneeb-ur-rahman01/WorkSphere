const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requiredString, emailField, passwordField, enumField } = require('./common');

const STAFF_ROLES = ['Employee', 'Intern', 'Volunteer', 'Membership', 'Executive Director'];
const USER_STATUSES = ['Active', 'Pending', 'Suspended', 'Rejected'];

const createStaffValidator = validate([
  requiredString('fullName', { min: 2, max: 100, label: 'Full name' }),
  emailField('email'),
  passwordField('password'),
  enumField('role', STAFF_ROLES, { label: 'Role' })
]);

const updateStatusValidator = validate([
  enumField('status', USER_STATUSES, { label: 'Status' })
]);

const updateRoleValidator = validate([
  enumField('role', STAFF_ROLES, { label: 'Role' })
]);

module.exports = { createStaffValidator, updateStatusValidator, updateRoleValidator };
