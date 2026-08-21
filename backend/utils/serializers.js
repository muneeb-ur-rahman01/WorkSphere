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
  amountDue: o.amount_due
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

const serializeUser = (u) => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  role: u.role,
  orgId: u.org_id,
  status: u.status,
  assignedMentor: u.assigned_mentor || undefined,
  createdAt: u.created_at
  // password_hash is intentionally never sent to the client
});

const serializeCamp = (c) => ({
  id: c.id,
  orgId: c.org_id,
  title: c.title,
  location: c.location,
  date: c.date,
  description: c.description,
  status: c.status,
  createdAt: c.created_at
});

const serializeEvent = (e) => ({
  id: e.id,
  orgId: e.org_id,
  title: e.title,
  location: e.location,
  date: e.date,
  description: e.description,
  eventType: e.event_type,
  status: e.status,
  createdAt: e.created_at
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

module.exports = {
  serializeOrg,
  serializePayment,
  serializeBillingEvent,
  serializeUser,
  serializeCamp,
  serializeEvent,
  serializeTask,
  serializeTaskComment,
  serializeNotification,
  serializeAvailability,
  serializePrescription,
  serializeDiscussionGroup,
  serializeDiscussionMessage
};
