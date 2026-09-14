const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { enumField, optionalString, urlField, booleanField } = require('./common');

const ORG_STATUSES = ['Active', 'Pending', 'Suspended', 'Rejected'];

const updateOrgStatusValidator = validate([
  enumField('status', ORG_STATUSES, { label: 'Status' })
]);

const directoryProfileValidator = validate([
  optionalString('missionStatement', { max: 1000, label: 'Mission statement' }),
  optionalString('focusArea', { max: 100, label: 'Focus area' }),
  optionalString('city', { max: 100, label: 'City' }),
  urlField('website', { label: 'Website' }),
  urlField('logoUrl', { label: 'Logo URL' }),
  booleanField('directoryVisible')
]);

const cancellationValidator = validate([
  booleanField('cancel', { optional: false })
]);

module.exports = { updateOrgStatusValidator, directoryProfileValidator, cancellationValidator };
