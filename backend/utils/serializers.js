// Converts snake_case Postgres rows into the camelCase shape the frontend
// (previously built against a local mock AppContext) already expects.

const serializeOrg = (o) => ({
  id: o.id,
  name: o.name,
  email: o.email,
  subPlan: o.sub_plan,
  status: o.status,
  createdAt: o.created_at,
  billingCycle: o.billing_cycle,
  planPrice: o.plan_price,
  paymentStatus: o.payment_status,
  subscriptionStart: o.subscription_start,
  subscriptionEnd: o.subscription_end,
  subscriptionStatus: o.subscription_status,
  registrationDate: o.registration_date,
  paymentDueAt: o.payment_due_at,
  amountDue: o.amount_due,
  trialStartDate: o.trial_start_date,
  trialEndDate: o.trial_end_date,
  publicEventsEnabled: o.public_events_enabled,
  missionStatement: o.mission_statement,
  focusArea: o.focus_area,
  city: o.city,
  website: o.website,
  logoUrl: o.logo_url,
  directoryVisible: o.directory_visible,
  cancellationRequestedAt: o.cancellation_requested_at
});

// Lean, public-safe subset for the cross-organization Directory (spec
// section 16). Never includes email, financials, subscription, or any
// other private field — see section 17's data-isolation requirement.
const serializeOrgPublicProfile = (o) => ({
  id: o.id,
  name: o.name,
  missionStatement: o.mission_statement,
  focusArea: o.focus_area,
  city: o.city,
  website: o.website,
  logoUrl: o.logo_url
});

const serializeOrgConnection = (c) => ({
  id: c.id,
  requesterOrgId: c.requester_org_id,
  targetOrgId: c.target_org_id,
  status: c.status,
  initialMessage: c.initial_message,
  requestedBy: c.requested_by,
  respondedBy: c.responded_by,
  respondedAt: c.responded_at,
  createdAt: c.created_at
});

const serializeOrgMessage = (m) => ({
  id: m.id,
  connectionId: m.connection_id,
  senderOrgId: m.sender_org_id,
  senderUserId: m.sender_user_id,
  message: m.message,
  createdAt: m.created_at
});

const serializePayment = (p) => ({
  id: p.id,
  orgId: p.org_id,
  plan: p.plan,
  amount: p.amount,
  currency: p.currency,
  method: p.method,
  gateway: p.gateway,
  status: p.status,
  txnRefNo: p.txn_ref_no,
  providerTxnId: p.provider_txn_id,
  responseCode: p.response_code,
  responseMessage: p.response_message,
  refundedAt: p.refunded_at,
  refundReference: p.refund_reference,
  createdAt: p.created_at,
  updatedAt: p.updated_at
});

const serializeBillingEvent = (e) => ({
  id: e.id,
  orgId: e.org_id,
  userId: e.user_id,
  eventType: e.event_type,
  amount: e.amount,
  currency: e.currency,
  txnRefNo: e.txn_ref_no,
  previousStatus: e.previous_status,
  newStatus: e.new_status,
  gateway: e.gateway,
  metadata: e.metadata || {},
  createdAt: e.created_at
});

const serializeAuditLog = (l) => ({
  id: l.id,
  orgId: l.org_id,
  actorId: l.actor_id,
  actorName: l.actor_name,
  actorRole: l.actor_role,
  action: l.action,
  entityType: l.entity_type,
  entityId: l.entity_id,
  entityLabel: l.entity_label,
  previousValue: l.previous_value,
  newValue: l.new_value,
  metadata: l.metadata || {},
  createdAt: l.created_at
});

const serializeUser = (u) => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  role: u.role,
  orgId: u.org_id,
  status: u.status,
  assignedMentor: u.assigned_mentor || undefined,
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at || null
  // password_hash is intentionally never sent to the client
});

const serializeCamp = (c) => ({
  id: c.id,
  orgId: c.org_id,
  title: c.title,
  location: c.location,
  date: c.date,
  time: c.time,
  description: c.description,
  status: c.status,
  imageUrl: c.image_url,
  isPublic: c.is_public,
  visibilityStatus: c.visibility_status,
  visibilityRequestedAt: c.visibility_requested_at,
  visibilityReviewedAt: c.visibility_reviewed_at,
  visibilityRejectionReason: c.visibility_rejection_reason,
  createdAt: c.created_at
});

const serializeEvent = (e) => ({
  id: e.id,
  orgId: e.org_id,
  title: e.title,
  location: e.location,
  date: e.date,
  time: e.time,
  description: e.description,
  eventType: e.event_type,
  status: e.status,
  imageUrl: e.image_url,
  isPublic: e.is_public,
  visibilityStatus: e.visibility_status,
  visibilityRequestedAt: e.visibility_requested_at,
  visibilityReviewedAt: e.visibility_reviewed_at,
  visibilityRejectionReason: e.visibility_rejection_reason,
  createdAt: e.created_at
});

const serializeMeeting = (m) => ({
  id: m.id,
  orgId: m.org_id,
  subject: m.subject,
  meetingType: m.meeting_type,
  date: m.meeting_date,
  time: m.meeting_time,
  meetingLink: m.meeting_link || '',
  summary: m.summary || '',
  status: m.status,
  createdBy: m.created_by,
  createdAt: m.created_at
});

const serializeTask = (t) => ({
  id: t.id,
  orgId: t.org_id,
  title: t.title,
  description: t.description,
  assignedToId: t.assigned_to_id,
  priority: t.priority,
  dueDate: t.due_date,
  status: t.status,
  projectId: t.project_id || null,
  campaignId: t.campaign_id || null,
  createdAt: t.created_at,
  hasUnreadForAdmin: !!t.has_unread_for_admin,
  hasUnreadForAssignee: !!t.has_unread_for_assignee
});

const serializeTaskComment = (c) => ({
  id: c.id,
  taskId: c.task_id,
  authorId: c.author_id,
  authorName: c.author_name,
  authorRole: c.author_role,
  message: c.message,
  createdAt: c.created_at
});

const serializeNotification = (n) => ({
  id: n.id,
  orgId: n.org_id,
  title: n.title,
  message: n.message,
  type: n.type,
  targetRole: n.target_role,
  targetUserId: n.target_user_id || undefined,
  createdAt: n.created_at
});

const serializeAvailability = (a) => ({
  id: a.id,
  campId: a.camp_id,
  userId: a.user_id,
  status: a.status,
  updatedAt: a.updated_at
});

const serializePrescription = (p) => ({
  id: p.id,
  orgId: p.org_id,
  createdBy: p.created_by,
  patientName: p.patient_name,
  medicines: p.medicines || [],
  advice: p.advice,
  rawTranscript: p.raw_transcript,
  audioMimeType: p.audio_mime_type,
  createdAt: p.created_at
});

const serializeDiscussionGroup = (g) => ({
  id: g.id,
  orgId: g.org_id,
  name: g.name,
  description: g.description,
  isOpen: g.is_open,
  createdBy: g.created_by,
  createdAt: g.created_at
});

const serializeDiscussionMessage = (m) => ({
  id: m.id,
  groupId: m.group_id,
  authorId: m.author_id,
  authorName: m.author_name,
  authorRole: m.author_role,
  message: m.message,
  createdAt: m.created_at
});

const serializeQuery = (q) => ({
  id: q.id,
  name: q.name,
  email: q.email,
  subject: q.subject,
  message: q.message,
  status: q.status,
  responseText: q.response_text,
  respondedBy: q.responded_by,
  respondedAt: q.responded_at,
  createdAt: q.created_at
});

const serializeOpportunity = (o) => ({
  id: o.id,
  orgId: o.org_id,
  title: o.title,
  description: o.description,
  opportunityType: o.opportunity_type,
  eligibility: o.eligibility,
  requirements: o.requirements,
  applicationDeadline: o.application_deadline,
  location: o.location,
  remoteStatus: o.remote_status,
  applicationInstructions: o.application_instructions,
  applicationLink: o.application_link,
  contactInfo: o.contact_info,
  imageUrl: o.image_url,
  status: o.status,
  publishDate: o.publish_date,
  createdAt: o.created_at
});

const serializeOpportunityApplication = (a) => ({
  id: a.id,
  opportunityId: a.opportunity_id,
  name: a.name,
  email: a.email,
  phone: a.phone,
  coverNote: a.cover_note,
  resumeUrl: a.resume_url,
  status: a.status,
  createdAt: a.created_at
});

const serializeProject = (p) => ({
  id: p.id,
  orgId: p.org_id,
  title: p.title,
  description: p.description,
  objectives: p.objectives,
  location: p.location,
  startDate: p.start_date,
  endDate: p.end_date,
  budget: p.budget,
  status: p.status,
  createdBy: p.created_by,
  createdAt: p.created_at
});

const serializeCampaign = (c) => ({
  id: c.id,
  orgId: c.org_id,
  title: c.title,
  description: c.description,
  objective: c.objective,
  campaignType: c.campaign_type,
  startDate: c.start_date,
  endDate: c.end_date,
  goalAmount: c.goal_amount,
  status: c.status,
  createdBy: c.created_by,
  createdAt: c.created_at
});

const serializeTeamMember = (m) => ({
  id: m.id,
  orgId: m.org_id,
  entityType: m.entity_type,
  entityId: m.entity_id,
  userId: m.user_id,
  roleOnEntity: m.role_on_entity,
  addedBy: m.added_by,
  addedAt: m.added_at
});

const serializeDonor = (d) => ({
  id: d.id,
  orgId: d.org_id,
  donorType: d.donor_type,
  name: d.name,
  email: d.email,
  phone: d.phone,
  address: d.address,
  notes: d.notes,
  createdAt: d.created_at
});

const serializeDonation = (d) => ({
  id: d.id,
  orgId: d.org_id,
  donorId: d.donor_id,
  projectId: d.project_id,
  campaignId: d.campaign_id,
  amount: d.amount,
  currency: d.currency,
  donationDate: d.donation_date,
  paymentMethod: d.payment_method,
  isRecurring: !!d.is_recurring,
  notes: d.notes,
  recordedBy: d.recorded_by,
  createdAt: d.created_at
});

const serializeVolunteerProfile = (v) => ({
  userId: v.user_id,
  orgId: v.org_id,
  skills: v.skills,
  interests: v.interests,
  availability: v.availability,
  totalHours: v.total_hours,
  performanceNotes: v.performance_notes,
  updatedAt: v.updated_at
});

const serializeSponsor = (s) => ({
  id: s.id,
  orgId: s.org_id,
  name: s.name,
  contactName: s.contact_name,
  email: s.email,
  phone: s.phone,
  notes: s.notes,
  createdAt: s.created_at
});

const serializeSponsorship = (s) => ({
  id: s.id,
  orgId: s.org_id,
  sponsorId: s.sponsor_id,
  projectId: s.project_id,
  campaignId: s.campaign_id,
  packageName: s.package_name,
  amount: s.amount,
  status: s.status,
  startDate: s.start_date,
  endDate: s.end_date,
  notes: s.notes,
  createdAt: s.created_at
});

const serializePartner = (p) => ({
  id: p.id,
  orgId: p.org_id,
  name: p.name,
  partnershipType: p.partnership_type,
  contactName: p.contact_name,
  email: p.email,
  phone: p.phone,
  responsibilities: p.responsibilities,
  agreementNotes: p.agreement_notes,
  status: p.status,
  requestedBy: p.requested_by,
  reviewedBy: p.reviewed_by,
  reviewedAt: p.reviewed_at,
  createdAt: p.created_at
});

const serializeBeneficiary = (b) => ({
  id: b.id,
  orgId: b.org_id,
  name: b.name,
  contactInfo: b.contact_info,
  demographicNotes: b.demographic_notes,
  createdAt: b.created_at
});

const serializeBeneficiaryEnrollment = (e) => ({
  id: e.id,
  orgId: e.org_id,
  beneficiaryId: e.beneficiary_id,
  projectId: e.project_id,
  status: e.status,
  outcomeNotes: e.outcome_notes,
  enrolledAt: e.enrolled_at
});

const serializeExpense = (e) => ({
  id: e.id,
  orgId: e.org_id,
  projectId: e.project_id,
  campaignId: e.campaign_id,
  description: e.description,
  category: e.category,
  amount: e.amount,
  status: e.status,
  submittedBy: e.submitted_by,
  reviewedBy: e.reviewed_by,
  reviewedAt: e.reviewed_at,
  notes: e.notes,
  createdAt: e.created_at
});

const serializeDocument = (d) => ({
  id: d.id,
  orgId: d.org_id,
  entityType: d.entity_type,
  entityId: d.entity_id,
  title: d.title,
  category: d.category,
  fileUrl: d.file_url,
  expiryDate: d.expiry_date,
  status: d.status,
  uploadedBy: d.uploaded_by,
  reviewedBy: d.reviewed_by,
  reviewedAt: d.reviewed_at,
  createdAt: d.created_at
});

module.exports = {
  serializeOrg,
  serializePayment,
  serializeBillingEvent,
  serializeUser,
  serializeCamp,
  serializeEvent,
  serializeMeeting,
  serializeTask,
  serializeTaskComment,
  serializeNotification,
  serializeAvailability,
  serializePrescription,
  serializeDiscussionGroup,
  serializeDiscussionMessage,
  serializeQuery,
  serializeOpportunity,
  serializeOpportunityApplication,
  serializeAuditLog,
  serializeProject,
  serializeCampaign,
  serializeTeamMember,
  serializeDonor,
  serializeDonation,
  serializeVolunteerProfile,
  serializeSponsor,
  serializeSponsorship,
  serializePartner,
  serializeBeneficiary,
  serializeBeneficiaryEnrollment,
  serializeExpense,
  serializeDocument,
  serializeOrgPublicProfile,
  serializeOrgConnection,
  serializeOrgMessage
};
