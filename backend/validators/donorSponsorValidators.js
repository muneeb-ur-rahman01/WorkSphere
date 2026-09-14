const { validate } = require('../middleware/validate');
const {
  requiredString, optionalString, emailField, enumField, amountField, dateField, uuidBody, booleanField
} = require('./common');

const DONOR_TYPES = ['Individual', 'Organization'];
const SPONSORSHIP_STATUSES = ['Proposed', 'Active', 'Completed', 'Cancelled'];

// --- Donors ---
const donorValidator = validate([
  requiredString('name', { min: 1, max: 150, label: 'Name' }),
  enumField('donorType', DONOR_TYPES, { label: 'Donor type', optional: true }),
  emailField('email', { optional: true }),
  optionalString('phone', { max: 30 }),
  optionalString('address', { max: 300 }),
  optionalString('notes', { max: 2000 })
]);

// --- Donations ---
const donationValidator = validate([
  uuidBody('donorId', { label: 'Donor' }),
  uuidBody('projectId', { label: 'Project', optional: true }),
  uuidBody('campaignId', { label: 'Campaign', optional: true }),
  amountField('amount', { label: 'Amount', optional: false }),
  optionalString('currency', { max: 10 }),
  dateField('donationDate', { label: 'Donation date' }),
  optionalString('paymentMethod', { max: 100 }),
  booleanField('isRecurring'),
  optionalString('notes', { max: 2000 })
]);

// --- Sponsors ---
const sponsorValidator = validate([
  requiredString('name', { min: 1, max: 150, label: 'Name' }),
  optionalString('contactName', { max: 150 }),
  emailField('email', { optional: true }),
  optionalString('phone', { max: 30 }),
  optionalString('notes', { max: 2000 })
]);

// --- Sponsorships ---
const sponsorshipValidator = validate([
  uuidBody('sponsorId', { label: 'Sponsor' }),
  uuidBody('projectId', { label: 'Project', optional: true }),
  uuidBody('campaignId', { label: 'Campaign', optional: true }),
  optionalString('packageName', { max: 150 }),
  amountField('amount', { label: 'Amount', optional: true }),
  enumField('status', SPONSORSHIP_STATUSES, { label: 'Status', optional: true }),
  dateField('startDate', { label: 'Start date' }),
  dateField('endDate', { label: 'End date' }),
  optionalString('notes', { max: 2000 })
]);

module.exports = { donorValidator, donationValidator, sponsorValidator, sponsorshipValidator };
