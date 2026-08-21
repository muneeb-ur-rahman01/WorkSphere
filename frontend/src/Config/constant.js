// ================================
// Payment Method / Timer — TEMPORARILY DISABLED
// Flip this back to true to restore the Payment Method screens, the
// countdown timer, and the payment reminder/blocked popups when the
// project moves toward deployment. All underlying billing code/UI is kept
// in place and simply gated behind this flag rather than removed. See also
// PAYMENT_ENFORCEMENT_ENABLED in backend/middleware/subscriptionAccess.js.
// ================================
export const PAYMENTS_ENABLED = false;

// ================================
// User Roles
// ================================

// Canonical set of roles below the OrgAdmin tier ("staff-tier" roles).
// Adding a role here automatically flows through to:
//   - the OrgAdmin "Add Personnel" dropdown
//   - the Announcement target-role dropdown
//   - the Staff dashboard route guard (any of these roles can log into /staff/dashboard)
// Keep this in sync with the backend's STAFF_ROLES list in
// backend/controllers/userController.js.
export const STAFF_ROLES = [
    { value: "Employee", label: "Employee", description: "Salaried / coordinator staff" },
    { value: "Intern", label: "Intern", description: "Educational / training capacity" },
    { value: "Volunteer", label: "Volunteer", description: "Supporting medical campsite" },
    { value: "Membership", label: "Membership", description: "General member of the organization" },
    { value: "Executive Director", label: "Executive Director", description: "Senior leadership role" }
];

// Roles the public can request via the self-registration form. Executive
// Director is deliberately excluded - it's a leadership title that should
// only ever be granted by an Organization Admin from the internal "Add
// Personnel" screen, never requested by an anonymous visitor.
export const SELF_REGISTERABLE_ROLES = STAFF_ROLES.filter(r => r.value !== 'Executive Director');

// Just the role name strings, e.g. for allowedRoles route guards.
export const STAFF_ROLE_NAMES = STAFF_ROLES.map(r => r.value);

// Tailwind badge color per role, used anywhere a role chip/pill is rendered.
export const ROLE_BADGE_COLORS = {
    Employee: "bg-blue-100 text-blue-700",
    Intern: "bg-yellow-100 text-yellow-700",
    Volunteer: "bg-green-100 text-green-700",
    Membership: "bg-purple-100 text-purple-700",
    "Executive Director": "bg-rose-100 text-rose-700",
    OrgAdmin: "bg-indigo-100 text-indigo-700",
    SuperAdmin: "bg-gray-800 text-white"
};

export const getRoleBadgeColor = (role) => ROLE_BADGE_COLORS[role] || "bg-gray-100 text-gray-700";

export const USER_ROLES = {

    SUPER_ADMIN: "SuperAdmin",

    ORG_ADMIN: "OrganizationAdmin",

    EMPLOYEE: "Employee",

    INTERN: "Intern",

    VOLUNTEER: "Volunteer",

    MEMBERSHIP: "Membership",

    EXECUTIVE_DIRECTOR: "Executive Director"

};

// ================================
// Task Status
// ================================

export const TASK_STATUS = {

    PENDING: "Pending",

    ACCEPTED: "Accepted",

    IN_PROGRESS: "In Progress",

    COMPLETED: "Completed"

};

// ================================
// Availability
// ================================

export const AVAILABILITY_STATUS = {

    AVAILABLE: "Available",

    NOT_AVAILABLE: "Not Available"

};

// ================================
// Notification Types
// ================================

export const NOTIFICATION_TYPE = {

    TASK: "Task",

    EVENT: "Event",

    CAMP: "Camp",

    GENERAL: "General",

    ANNOUNCEMENT: "Announcement",

    SUBSCRIPTION: "Subscription"

};

// ================================
// Subscription Plans
// Prices must match backend/config/plans.js exactly — that file is the
// real source of truth (enforced server-side); this is only for display
// before the user is registered/authenticated (pricing page, signup form).
// ================================

export const SUBSCRIPTION_PLANS = {

    "Basic": {
        key: "Basic",
        label: "Basic Plan",
        priceLabel: "Rs. 10,000 / month",
        price: 10000,
        billingCycle: "Monthly",
        aiFeatures: false,
        perks: "1 Camp, 15 Users"
    },

    "Standard": {
        key: "Standard",
        label: "Standard Plan",
        priceLabel: "Rs. 30,000 / month",
        price: 30000,
        billingCycle: "Monthly",
        aiFeatures: false,
        perks: "5 Camps, 60 Users"
    },

    "Premium": {
        key: "Premium",
        label: "Premium Plan",
        priceLabel: "Rs. 80,000 / month",
        price: 80000,
        billingCycle: "Monthly",
        aiFeatures: true,
        perks: "Unlimited Camps & Users + AI Prescription Assistant"
    }

};

// ================================
// Subscription Lifecycle States
// Mirrors organizations.subscription_status in the backend.
// ================================

export const SUBSCRIPTION_STATUS = {

    TRIAL_PENDING: "TrialPending",

    ACTIVE: "Active",

    PAST_DUE: "PastDue",

    SUSPENDED: "Suspended",

    CANCELLED: "Cancelled",

    EXPIRED: "Expired"

};

// ================================
// Payment Gateways
// ================================

export const PAYMENT_GATEWAYS = {

    PAYFAST: "PayFast",

    JAZZCASH: "JazzCash"

};

// ================================
// Local Storage Keys
// ================================

export const STORAGE_KEYS = {

    TOKEN: "token",

    USER: "user",

    ROLE: "role",

    ORGANIZATION_ID: "organizationId"

};

// ================================
// API Endpoints
// ================================

export const API_ENDPOINTS = {

    LOGIN: "/auth/login",

    REGISTER: "/auth/register",

    USERS: "/users",

    ORGANIZATIONS: "/organizations",

    TASKS: "/tasks",

    CAMPS: "/camps",

    EVENTS: "/events",

    NOTIFICATIONS: "/notifications"

};