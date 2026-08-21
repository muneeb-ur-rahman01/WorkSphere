import React, { useContext, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import {
  Users, Calendar, CalendarDays, CheckSquare, ClipboardCheck, ArrowUpRight,
  Megaphone, CreditCard, Send, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SUBSCRIPTION_PLANS, STAFF_ROLES, PAYMENTS_ENABLED } from '../../../Config/constant';
import PaymentReminderBanner from '../../../shared/PaymentReminderBanner/PaymentReminderBanner';
import SuspendedNotice from '../../../shared/SuspendedNotice/SuspendedNotice';
import CountdownTimer from '../../../shared/CountdownTimer/CountdownTimer';

const AdminDashboard = () => {
  const {
    currentUser, users, camps, events, tasks, notifications, organizations,
    postAnnouncement, payWithGateway
  } = useContext(AppContext);

  // Filter stats belonging to this Organization only
  const orgUsers = users.filter(u => u.orgId === currentUser.orgId);
  const activeStaff = orgUsers.filter(u => u.status === 'Active' && u.role !== 'OrgAdmin');
  const pendingStaff = orgUsers.filter(u => u.status === 'Pending');

  const employees = activeStaff.filter(u => u.role === 'Employee').length;
  const interns = activeStaff.filter(u => u.role === 'Intern').length;
  const volunteers = activeStaff.filter(u => u.role === 'Volunteer').length;
  const members = activeStaff.filter(u => u.role === 'Membership').length;
  const execDirectors = activeStaff.filter(u => u.role === 'Executive Director').length;

  const orgCamps = camps.filter(c => c.orgId === currentUser.orgId);
  const upcomingCamps = orgCamps.filter(c => c.status === 'Upcoming').length;

  const orgEvents = events.filter(e => e.orgId === currentUser.orgId);
  const upcomingEvents = orgEvents.filter(e => e.status === 'Upcoming').length;

  // Build the "X Employees • Y Interns • ..." breakdown dynamically so the
  // stat card only shows roles that actually have people in them.
  const personnelBreakdown = [
    { label: 'Employee', count: employees },
    { label: 'Intern', count: interns },
    { label: 'Volunteer', count: volunteers },
    { label: 'Member', count: members },
    { label: 'Executive Director', count: execDirectors }
  ]
    .filter(r => r.count > 0)
    .map(r => `${r.count} ${r.label}${r.count === 1 ? '' : 's'}`)
    .join(' • ') || 'No active personnel yet';

  const orgTasks = tasks.filter(t => t.orgId === currentUser.orgId);
  const completedTasksCount = orgTasks.filter(t => t.status === 'Completed').length;
  const totalTasksCount = orgTasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const recentTasks = orgTasks.slice(0, 3);
  const getUserName = (id) => users.find(u => u.id === id)?.fullName || 'Unassigned';

  const myOrg = organizations.find(o => o.id === currentUser.orgId);

  // ===================
  // Announcements
  // ===================
  const orgAnnouncements = notifications
    .filter(n => n.orgId === currentUser.orgId && n.type === 'Announcement')
    .slice(0, 6);

  const [announceForm, setAnnounceForm] = useState({ title: '', message: '', targetRole: 'All' });
  const [announceStatus, setAnnounceStatus] = useState('');
  const [sending, setSending] = useState(false);

  const handleAnnounce = async (e) => {
    e.preventDefault();
    if (!announceForm.title || !announceForm.message) return;
    setSending(true);
    setAnnounceStatus('');
    const res = await postAnnouncement(announceForm.title, announceForm.message, announceForm.targetRole);
    setSending(false);
    if (res.success) {
      setAnnounceForm({ title: '', message: '', targetRole: 'All' });
      setAnnounceStatus('sent');
    } else {
      setAnnounceStatus(res.error || 'Could not post announcement.');
    }
  };

  // ===================
  // Billing / Subscription
  // ===================
  const subscription = myOrg?.subscription || null;
  const planKey = myOrg?.subPlan && SUBSCRIPTION_PLANS[myOrg.subPlan] ? myOrg.subPlan : 'Basic';
  const [selectedPlan, setSelectedPlan] = useState(planKey);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const daysUntilExpiry = myOrg?.subscriptionEnd
    ? Math.ceil((new Date(myOrg.subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  // Countdown target: an active subscription counts down to its renewal
  // date; an org still in the unpaid trial window counts down to the
  // payment due date instead. Overdue orgs get no target — the reminder
  // banner/suspension notice already covers that state.
  const countdownTarget = !subscription?.isOverdue ? (myOrg?.subscriptionEnd || myOrg?.paymentDueAt) : null;
  const countdownLabel = myOrg?.subscriptionEnd ? 'Plan renews in' : 'Payment due in';
  const countdownAmountLabel = !myOrg?.subscriptionEnd && myOrg?.amountDue
    ? `Rs. ${Number(myOrg.amountDue).toLocaleString('en-PK')} due — ${SUBSCRIPTION_PLANS[planKey]?.label || myOrg?.subPlan || 'Basic Plan'}`
    : undefined;

  const handleRenew = async () => {
    setPayError('');
    setPayLoading(true);
    const res = await payWithGateway(currentUser.orgId, selectedPlan);
    if (!res.success) {
      setPayError(res.error || 'Could not start the payment gateway checkout.');
      setPayLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 bg-gradient-to-br from-slate-50 to-indigo-50/40 min-h-screen p-8 -m-8">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 p-8 shadow-xl">
          <div className="absolute -right-10 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="relative">
            <h1 className="text-3xl font-bold text-white">
              Organization Command Center
            </h1>
            <p className="text-indigo-100 mt-2 max-w-xl">
              Real-time operations coordinator for your medical deployments and personnel.
            </p>
          </div>
        </div>

        {/* Subscription countdown — live reminder, always visible on the overview */}
        {PAYMENTS_ENABLED && countdownTarget && (
          <CountdownTimer
            targetDate={countdownTarget}
            label={countdownLabel}
            amountLabel={countdownAmountLabel}
          />
        )}

        {/* Payment Reminder (only shown once overdue by more than 5 days) */}
        {PAYMENTS_ENABLED && (
          <PaymentReminderBanner
            subscription={subscription}
            planLabel={SUBSCRIPTION_PLANS[planKey]?.label || myOrg?.subPlan}
            payHref="/org-admin/billing"
          />
        )}

        {PAYMENTS_ENABLED && subscription?.operationsBlocked ? (
          <SuspendedNotice
            subscription={subscription}
            planLabel={SUBSCRIPTION_PLANS[planKey]?.label || myOrg?.subPlan}
            payHref="/org-admin/billing"
          />
        ) : (
        <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">

          {[
            {
              label: 'Active Personnel', value: activeStaff.length, icon: Users,
              accent: 'from-indigo-500 to-indigo-600',
              sub: personnelBreakdown
            },
            {
              label: 'Pending Waitlist', value: pendingStaff.length, icon: Users,
              accent: 'from-amber-500 to-orange-500',
              sub: 'Staff requests waiting', subClass: 'text-amber-600 font-semibold'
            },
            {
              label: 'Upcoming Camps', value: upcomingCamps, icon: Calendar,
              accent: 'from-blue-500 to-cyan-500',
              sub: 'Active camp deployments'
            },
            {
              label: 'Upcoming Events', value: upcomingEvents, icon: CalendarDays,
              accent: 'from-fuchsia-500 to-purple-500',
              sub: 'Trainings, fundraisers & outreach'
            },
            {
              label: 'Task Completion', value: `${completionRate}%`, icon: CheckSquare,
              accent: 'from-emerald-500 to-green-600',
              sub: `${completedTasksCount} of ${totalTasksCount} tasks completed`
            }
          ].map((card, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {card.label}
                </span>
                <div className={`bg-gradient-to-br ${card.accent} text-white rounded-xl p-2 shadow-md`}>
                  <card.icon size={18} />
                </div>
              </div>
              <h2 className="text-4xl font-extrabold text-black mt-4">{card.value}</h2>
              <p className={`text-sm mt-2 ${card.subClass || 'text-gray-600'}`}>{card.sub}</p>
            </div>
          ))}

        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-black">Quick Actions</h2>
              <p className="text-sm text-gray-600 mt-1">Rapid dispatch operations triggers</p>
            </div>

            <div className="space-y-4">
              <Link
                to="/org-admin/camps"
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-5 hover:from-indigo-50 hover:to-indigo-50 hover:border-indigo-200 transition-all duration-300"
              >
                <div>
                  <h4 className="font-bold text-black">Schedule Medical Camp</h4>
                  <p className="text-sm text-gray-600 mt-1">Launches camp and broadcasts availability queries.</p>
                </div>
                <ArrowUpRight className="text-indigo-600" size={22} />
              </Link>

              <Link
                to="/org-admin/events"
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-5 hover:from-indigo-50 hover:to-indigo-50 hover:border-indigo-200 transition-all duration-300"
              >
                <div>
                  <h4 className="font-bold text-black">Create Organization Event</h4>
                  <p className="text-sm text-gray-600 mt-1">Plan trainings, fundraisers or outreach events.</p>
                </div>
                <ArrowUpRight className="text-indigo-600" size={22} />
              </Link>

              <Link
                to="/org-admin/tasks"
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-white p-5 hover:from-indigo-50 hover:to-indigo-50 hover:border-indigo-200 transition-all duration-300"
              >
                <div>
                  <h4 className="font-bold text-black">Assign Work Task</h4>
                  <p className="text-sm text-gray-600 mt-1">Delegate duties to employees or interns.</p>
                </div>
                <ArrowUpRight className="text-indigo-600" size={22} />
              </Link>

              <Link
                to="/org-admin/requests"
                className={`flex items-center justify-between rounded-xl border p-5 transition-all duration-300 ${
                  pendingStaff.length > 0
                    ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                    : 'bg-gradient-to-r from-gray-50 to-white border-gray-100 hover:from-indigo-50 hover:to-indigo-50 hover:border-indigo-200'
                }`}
              >
                <div>
                  <h4 className="font-bold text-black">Review Pending Applications</h4>
                  <p className={`text-sm mt-1 ${pendingStaff.length > 0 ? 'text-amber-700 font-semibold' : 'text-gray-600'}`}>
                    {pendingStaff.length > 0
                      ? `${pendingStaff.length} registration applications waiting.`
                      : 'All applications reviewed.'}
                  </p>
                </div>
                <ArrowUpRight className="text-indigo-600" size={22} />
              </Link>
            </div>
          </div>

          {/* Active Duty Matrix */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-black">Active Duty Matrix</h2>
              <p className="text-sm text-gray-600 mt-1">Recent tasks assigned to NGO staff</p>
            </div>

            <div className="space-y-4">
              {recentTasks.length > 0 ? (
                recentTasks.map((t) => {
                  const badgeClass =
                    t.status === 'Completed' ? 'bg-green-100 text-green-700'
                    : t.status === 'In Progress' ? 'bg-blue-100 text-blue-700'
                    : t.status === 'Accepted' ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700';

                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all duration-300"
                    >
                      <div>
                        <h4 className="font-bold text-black flex items-center gap-2">
                          {t.title}
                          {t.hasUnreadForAdmin && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              New comment
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Assigned to <span className="font-semibold text-black">{getUserName(t.assignedToId)}</span>
                        </p>
                        <p className="text-sm text-gray-500">Due: {t.dueDate}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                        {t.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center">
                  <ClipboardCheck size={42} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 text-sm">No active tasks found.</p>
                  <p className="text-gray-400 text-xs mt-1">Create a task to start tracking work.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
        )}

        {/* Subscription & Announcements */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

          {/* Subscription & Billing */}
          {PAYMENTS_ENABLED && (
          <div id="billing" className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl p-2 shadow-md">
                <CreditCard size={18} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Subscription & Billing</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your CampOS plan</p>
              </div>
            </div>
            <Link
              to="/org-admin/billing"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline block mb-4 -mt-3"
            >
              View full billing details & payment history →
            </Link>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 mb-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-500">Current Plan</p>
                  <p className="text-lg font-bold text-black">{SUBSCRIPTION_PLANS[planKey]?.label || myOrg?.subPlan || 'Basic Plan'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  myOrg?.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {myOrg?.paymentStatus || 'Unpaid'}
                </span>
              </div>

              {subscription?.isOverdue ? (
                <p className="text-sm mt-3 flex items-center gap-1.5 text-red-600 font-semibold">
                  <AlertTriangle size={14} />
                  Payment overdue by {subscription.overdueDays} day{subscription.overdueDays === 1 ? '' : 's'} —
                  {' '}Rs. {Number(subscription.amountDue || 0).toLocaleString('en-PK')} due
                </p>
              ) : myOrg?.subscriptionEnd ? (
                <p className={`text-sm mt-3 flex items-center gap-1.5 ${
                  daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-amber-600 font-semibold' : 'text-gray-600'
                }`}>
                  {daysUntilExpiry !== null && daysUntilExpiry <= 7 && <AlertTriangle size={14} />}
                  {daysUntilExpiry !== null && daysUntilExpiry >= 0
                    ? `Renews / expires on ${new Date(myOrg.subscriptionEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} (${daysUntilExpiry} days left)`
                    : `Expired on ${new Date(myOrg.subscriptionEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                </p>
              ) : myOrg?.paymentDueAt ? (
                <p className="text-sm mt-3 text-gray-600">
                  Payment due by {new Date(myOrg.paymentDueAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {' '}(Rs. {Number(myOrg.amountDue || 0).toLocaleString('en-PK')})
                </p>
              ) : (
                <p className="text-sm mt-3 text-gray-500">No active billing cycle yet — pay to activate.</p>
              )}
            </div>

            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Choose / Renew Plan</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-4 py-3 bg-white text-black border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.values(SUBSCRIPTION_PLANS).map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} — {p.priceLabel}
                </option>
              ))}
            </select>

            {payError && <p className="text-red-600 text-xs mb-3">{payError}</p>}

            <button
              onClick={handleRenew}
              disabled={payLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-300 disabled:opacity-60"
            >
              <ShieldCheck size={18} />
              {payLoading ? 'Redirecting to secure checkout…' : `Pay Now — ${SUBSCRIPTION_PLANS[selectedPlan]?.priceLabel}`}
            </button>
          </div>
          )}

          {/* Announcements */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-xl p-2 shadow-md">
                <Megaphone size={18} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black">Announcements</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Broadcast to your personnel, org-wide or by role
                </p>
              </div>
            </div>

            <form onSubmit={handleAnnounce} className="space-y-3 mb-5">
              <input
                type="text"
                placeholder="Announcement title"
                value={announceForm.title}
                onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
              <textarea
                placeholder="Write your announcement..."
                value={announceForm.message}
                onChange={(e) => setAnnounceForm({ ...announceForm, message: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                required
              />
              <div className="flex gap-3">
                <select
                  value={announceForm.targetRole}
                  onChange={(e) => setAnnounceForm({ ...announceForm, targetRole: e.target.value })}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="All">Everyone</option>
                  {STAFF_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} only
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-60"
                >
                  <Send size={14} />
                  {sending ? 'Posting…' : 'Post'}
                </button>
              </div>
              {announceStatus === 'sent' && (
                <p className="text-green-600 text-xs font-semibold">Announcement posted to staff dashboards.</p>
              )}
              {announceStatus && announceStatus !== 'sent' && (
                <p className="text-red-600 text-xs">{announceStatus}</p>
              )}
            </form>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {orgAnnouncements.length > 0 ? (
                orgAnnouncements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-black">{a.title}</p>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {a.targetRole === 'All' ? 'Everyone' : a.targetRole}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{a.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">No announcements posted yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
