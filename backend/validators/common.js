const { body, param, query } = require('express-validator');

// A generic "safe" name/title field: required, trimmed, bounded length,
// and rejects the ASCII control characters that have no business in free
// text but are a classic injection/log-corruption vector (rendering is
// still escaped downstream, but rejecting the input outright is stricter
// than sanitize-and-render).
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

const noControlChars = (value) => {
  if (typeof value === 'string' && CONTROL_CHARS_REGEX.test(value)) {
    throw new Error('contains invalid control characters');
  }
  return true;
};

const requiredString = (field, { min = 1, max = 200, label } = {}) =>
  body(field)
    .trim()
    .notEmpty().withMessage(`${label || field} is required.`)
    .isLength({ min, max }).withMessage(`${label || field} must be between ${min} and ${max} characters.`)
    .custom(noControlChars);

const optionalString = (field, { max = 2000, label } = {}) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max }).withMessage(`${label || field} must be at most ${max} characters.`)
    .custom(noControlChars);

const emailField = (field = 'email', { optional = false } = {}) => {
  const chain = body(field);
  const withOptional = optional ? chain.optional({ nullable: true, checkFalsy: true }) : chain;
  return withOptional
    .trim()
    .notEmpty().withMessage('Email is required.')
    .bail()
    .isEmail().withMessage('Please enter a valid email address.')
    .isLength({ max: 254 }).withMessage('Email is too long.')
    .normalizeEmail();
};

const passwordField = (field = 'password', { min = 8 } = {}) =>
  body(field)
    .isString().withMessage('Password is required.')
    .isLength({ min, max: 128 }).withMessage(`Password must be at least ${min} characters.`)
    .matches(/^(?=.*[A-Za-z])(?=.*\d).+$/).withMessage('Password must include at least one letter and one number.');

const enumField = (field, allowed, { label, optional = false } = {}) => {
  const chain = body(field);
  const withOptional = optional ? chain.optional({ nullable: true, checkFalsy: true }) : chain;
  return withOptional.isIn(allowed).withMessage(`${label || field} must be one of: ${allowed.join(', ')}.`);
};

const amountField = (field, { label, optional = false, max = 1_000_000_000 } = {}) => {
  const chain = body(field);
  const withOptional = optional ? chain.optional({ nullable: true, checkFalsy: true }) : chain;
  return withOptional
    .isFloat({ min: 0, max }).withMessage(`${label || field} must be a positive number.`)
    .toFloat();
};

const dateField = (field, { label, optional = true } = {}) => {
  const chain = body(field);
  const withOptional = optional ? chain.optional({ nullable: true, checkFalsy: true }) : chain;
  return withOptional.isISO8601().withMessage(`${label || field} must be a valid date.`).toDate();
};

const urlField = (field, { label, optional = true } = {}) => {
  const chain = body(field);
  const withOptional = optional ? chain.optional({ nullable: true, checkFalsy: true }) : chain;
  return withOptional
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage(`${label || field} must be a valid http(s) URL.`)
    .isLength({ max: 2048 });
};

const uuidParam = (field = 'id') =>
  param(field).isUUID().withMessage(`Invalid ${field}.`);

const uuidBody = (field, { label, optional = false } = {}) => {
  const chain = body(field);
  const withOptional = optional ? chain.optional({ nullable: true, checkFalsy: true }) : chain;
  return withOptional.isUUID().withMessage(`${label || field} is invalid.`);
};

const booleanField = (field, { optional = true } = {}) => {
  const chain = body(field);
  const withOptional = optional ? chain.optional() : chain;
  return withOptional.isBoolean().withMessage(`${field} must be true or false.`).toBoolean();
};

const paginationQuery = () => [
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200.').toInt(),
  query('before').optional().isISO8601().withMessage('before must be a valid date.')
];

module.exports = {
  requiredString, optionalString, emailField, passwordField, enumField,
  amountField, dateField, urlField, uuidParam, uuidBody, booleanField, paginationQuery
};
