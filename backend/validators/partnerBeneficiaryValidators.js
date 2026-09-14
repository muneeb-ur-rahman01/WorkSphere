const { validate } = require('../middleware/validate');
const { requiredString, optionalString, emailField, enumField, amountField, uuidBody, urlField, dateField } = require('./common');

// --- Partners ---
const partnerValidator = validate([
  requiredString('name', { min: 1, max: 150, label: 'Name' }),
  optionalString('partnershipType', { max: 100 }),
  optionalString('contactName', { max: 150 }),
  emailField('email', { optional: true }),
  optionalString('phone', { max: 30 }),
  optionalString('responsibilities', { max: 3000 }),
  optionalString('agreementNotes', { max: 3000 })
]);

const partnerStatusValidator = validate([
  enumField('status', ['Active', 'Ended', 'Rejected', 'Pending'], { label: 'Status' })
]);

// --- Beneficiaries ---
const beneficiaryValidator = validate([
  requiredString('name', { min: 1, max: 150, label: 'Name' }),
  optionalString('contactInfo', { max: 300 }),
  optionalString('demographicNotes', { max: 2000 })
]);

const enrollmentValidator = validate([
  uuidBody('beneficiaryId', { label: 'Beneficiary' }),
  uuidBody('projectId', { label: 'Project' })
]);

const enrollmentUpdateValidator = validate([
  enumField('status', ['Active', 'Completed', 'Dropped'], { label: 'Status', optional: true }),
  optionalString('outcomeNotes', { max: 3000 })
]);

// --- Expenses ---
const expenseValidator = validate([
  requiredString('description', { min: 1, max: 300, label: 'Description' }),
  optionalString('category', { max: 100 }),
  amountField('amount', { label: 'Amount', optional: false }),
  uuidBody('projectId', { label: 'Project', optional: true }),
  uuidBody('campaignId', { label: 'Campaign', optional: true }),
  optionalString('notes', { max: 2000 })
]);

const expenseStatusValidator = validate([
  enumField('status', ['Approved', 'Rejected', 'Pending'], { label: 'Status' })
]);

// --- Documents ---
const documentValidator = validate([
  requiredString('title', { min: 1, max: 200, label: 'Title' }),
  optionalString('category', { max: 100 }),
  urlField('fileUrl', { label: 'File URL', optional: false }),
  optionalString('entityType', { max: 50 }),
  uuidBody('entityId', { label: 'Entity', optional: true }),
  dateField('expiryDate', { label: 'Expiry date' })
]);

const documentStatusValidator = validate([
  enumField('status', ['Approved', 'Rejected', 'Pending'], { label: 'Status' })
]);

module.exports = {
  partnerValidator, partnerStatusValidator,
  beneficiaryValidator, enrollmentValidator, enrollmentUpdateValidator,
  expenseValidator, expenseStatusValidator,
  documentValidator, documentStatusValidator
};
