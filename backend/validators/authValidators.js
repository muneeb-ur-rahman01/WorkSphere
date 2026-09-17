const { body } = require('express-validator');

const { validate } = require('../middleware/validate');

const {
  requiredString,
  emailField,
  passwordField
} = require('./common');

const SELF_REGISTERABLE_ROLES = [
  'Employee',
  'Intern',
  'Volunteer',
  'Membership'
];

const VALID_PLAN_KEYS = [
  'Trial',
  'Basic',
  'Standard',
  'Premium'
];

const VALID_ROLE_DOMAINS = [
  'SuperAdmin',
  'OrgAdmin',
  'Staff'
];

// POST /api/auth/login
const loginValidator = validate([
  emailField('email'),

  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ max: 128 }),

  body('roleDomain')
    .optional()
    .isIn(VALID_ROLE_DOMAINS)
    .withMessage('Invalid login type.')
]);

// POST /api/auth/register-organization
const registerOrganizationValidator = validate([
  requiredString('orgName', {
    min: 2,
    max: 150,
    label: 'Organization name'
  }),

  requiredString('adminName', {
    min: 2,
    max: 100,
    label: 'Admin name'
  }),

  emailField('email'),

  passwordField('password'),

  body('plan')
    .optional()
    .isIn(VALID_PLAN_KEYS)
    .withMessage('Invalid plan selected.')
]);

// POST /api/auth/register-staff
const registerStaffValidator = validate([
  requiredString('fullName', {
    min: 2,
    max: 100,
    label: 'Full name'
  }),

  emailField('email'),

  passwordField('password'),

  body('role')
    .isIn(SELF_REGISTERABLE_ROLES)
    .withMessage('Invalid role selected.'),

  body('orgId')
    .isUUID()
    .withMessage('Please select a valid organization.')
]);

// POST /api/auth/change-password
const changePasswordValidator = validate([
  body('currentPassword')
    .isString()
    .notEmpty()
    .withMessage('Current password is required.')
    .isLength({ max: 128 }),

  passwordField('newPassword')
]);

// POST /api/auth/forgot-password
const forgotPasswordValidator = validate([
  emailField('email')
]);

// POST /api/auth/reset-password
const resetPasswordValidator = validate([
  body('token')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Reset token is required.')
    .isLength({ min: 10, max: 512 }),

  passwordField('newPassword')
]);

module.exports = {
  loginValidator,
  registerOrganizationValidator,
  registerStaffValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator
};