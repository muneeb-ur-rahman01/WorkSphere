import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Heart,
  LayoutDashboard,
  Users,
  PlusCircle,
  Bell,
  Calendar,
  CalendarDays,
  CheckSquare,
  LogOut,
  Building,
  Menu,
  X,
  Video,
  UserCircle2,
  Settings as SettingsIcon,
  MessageSquare,
  BarChart3,
  CreditCard,
  ShieldCheck
} from 'lucide-react';

import { AppContext } from '../context/AppContext';
import PaymentAlertModal from '../shared/PaymentAlertModal/PaymentAlertModal';
import { SUBSCRIPTION_PLANS, PAYMENTS_ENABLED } from '../Config/constant';

const DashboardLayout = ({ children }) => {
  const {
    currentUser,
    logout,
    notifications,
    organizations,
    users,
    tasks,
    discussionGroups,
    hasAccess
  } = useContext(AppContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!currentUser) {
    navigate('/login-choice');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // =========================================================
  // ORGANIZATION
  // =========================================================

  const currentOrg = organizations.find(
    o => String(o.id) === String(currentUser.orgId)
  );

  const orgName = currentOrg
    ? currentOrg.name
    : 'CampOS SaaS Admin';

  // =========================================================
  // SUBSCRIPTION
  // =========================================================

  const orgSubscription = currentOrg?.subscription || null;

  const orgPlanKey =
    currentOrg?.subPlan &&
    SUBSCRIPTION_PLANS[currentOrg.subPlan]
      ? currentOrg.subPlan
      : 'Basic';

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const userNotifications = notifications.filter(n => {

    // SuperAdmin gets global notifications
    if (currentUser.role === 'SuperAdmin') {
      return n.orgId === null;
    }

    // OrgAdmin gets notifications for their organization
    if (currentUser.role === 'OrgAdmin') {
      return n.orgId === currentUser.orgId;
    }

    // A notification aimed at one specific user (e.g. an Accessibility
    // grant) is only ever shown to that user, not the whole org.
    if (n.targetUserId) {
      return n.targetUserId === currentUser.id;
    }

    // Staff notifications
    return (
      n.orgId === currentUser.orgId &&
      (
        n.targetRole === 'All' ||
        n.targetRole === currentUser.role
      )
    );
  });

  // =========================================================
  // BADGES
  // =========================================================

  const pendingRequestsCount = users.filter(
    u =>
      u.orgId === currentUser.orgId &&
      u.status === 'Pending'
  ).length;

  const unreadTaskCommentsCount =
    currentUser.role === 'OrgAdmin'
      ? tasks.filter(
          t =>
            t.orgId === currentUser.orgId &&
            t.hasUnreadForAdmin
        ).length
      : tasks.filter(
          t =>
            t.assignedToId === currentUser.id &&
            t.hasUnreadForAssignee
        ).length;

  const unreadDiscussionCount = discussionGroups.reduce(
    (sum, g) => sum + (g.unreadCount || 0),
    0
  );

  // =========================================================
  // NAVIGATION
  // =========================================================

  const getNavItems = () => {

    if (currentUser.role === 'SuperAdmin') {
      return [
        {
          path: '/super-admin/dashboard',
          label: 'Overview Dashboard',
          icon: <LayoutDashboard size={18} />
        },
        {
          path: '/super-admin/organizations',
          label: 'Manage NGOs',
          icon: <Building size={18} />
        },
        ...(PAYMENTS_ENABLED ? [{
          path: '/super-admin/billing',
          label: 'Billing & Payments',
          icon: <CreditCard size={18} />
        }] : []),
        {
          path: '/super-admin/analytics',
          label: 'Analytics & Reports',
          icon: <BarChart3 size={18} />
        },
        {
          path: '/settings',
          label: 'Settings',
          icon: <SettingsIcon size={18} />
        }
      ];
    }

    if (currentUser.role === 'OrgAdmin') {
      return [
        {
          path: '/org-admin/dashboard',
          label: 'Overview Dashboard',
          icon: <LayoutDashboard size={18} />
        },
        {
          path: '/org-admin/requests',
          label: 'Registration Requests',
          icon: <PlusCircle size={18} />,
          badge: 'pendingRequests'
        },
        {
          path: '/org-admin/users',
          label: 'Employees & Staff',
          icon: <Users size={18} />
        },
        {
          path: '/org-admin/accessibility',
          label: 'Accessibility',
          icon: <ShieldCheck size={18} />
        },
        {
          path: '/org-admin/camps',
          label: 'Camps',
          icon: <Calendar size={18} />
        },
        {
          path: '/org-admin/events',
          label: 'Events',
          icon: <CalendarDays size={18} />
        },
        {
          path: '/org-admin/meetings',
          label: 'Meetings',
          icon: <Video size={18} />
        },
        {
          path: '/org-admin/tasks',
          label: 'Task Matrix',
          icon: <CheckSquare size={18} />,
          badge: 'unreadTaskComments'
        },
        ...(PAYMENTS_ENABLED ? [{
          path: '/org-admin/billing',
          label: 'Billing & Subscription',
          icon: <CreditCard size={18} />
        }] : []),
        {
          path: '/org-admin/analytics',
          label: 'Analytics & Reports',
          icon: <BarChart3 size={18} />
        },
        {
          path: '/discussion',
          label: 'Discussion',
          icon: <MessageSquare size={18} />,
          badge: 'unreadDiscussion'
        },
        {
          path: '/settings',
          label: 'Settings',
          icon: <SettingsIcon size={18} />
        }
      ];
    }

    return [
      {
        path: '/staff/dashboard',
        label: 'My Workspace',
        icon: <LayoutDashboard size={18} />,
        badge: 'unreadTaskComments'
      },
      // Only shown if this staff member was granted the
      // 'registration_requests' Accessibility permission by their OrgAdmin.
      ...(hasAccess('registration_requests') ? [{
        path: '/org-admin/requests',
        label: 'Registration Requests',
        icon: <PlusCircle size={18} />,
        badge: 'pendingRequests'
      }] : []),
      // Same pattern for 'camps' and 'events' — each only appears once
      // an OrgAdmin has granted that specific section.
      ...(hasAccess('camps') ? [{
        path: '/org-admin/camps',
        label: 'Camps',
        icon: <Calendar size={18} />
      }] : []),
      ...(hasAccess('events') ? [{
        path: '/org-admin/events',
        label: 'Events',
        icon: <CalendarDays size={18} />
      }] : []),
      ...(hasAccess('meetings') ? [{
        path: '/org-admin/meetings',
        label: 'Meetings',
        icon: <Video size={18} />
      }] : []),
      {
        path: '/discussion',
        label: 'Discussion',
        icon: <MessageSquare size={18} />,
        badge: 'unreadDiscussion'
      },
      {
        path: '/settings',
        label: 'Settings',
        icon: <SettingsIcon size={18} />
      }
    ];
  };

  const navItems = getNavItems();

  // =========================================================
  // BADGE HELPER
  // =========================================================

  const getBadgeCount = badge => {

    if (badge === 'pendingRequests') {
      return pendingRequestsCount;
    }

    if (badge === 'unreadTaskComments') {
      return unreadTaskCommentsCount;
    }

    if (badge === 'unreadDiscussion') {
      return unreadDiscussionCount;
    }

    return 0;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          bg-[#0b1220]
          text-white
          border-r border-slate-800
          flex flex-col
          transition-all duration-300
          ${
            sidebarOpen
              ? 'w-72'
              : 'w-0 overflow-hidden'
          }
        `}
      >

        {/* Brand */}

        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">

          <div
            className="
              bg-gradient-to-br
              from-indigo-500
              to-violet-600
              text-white
              p-2
              rounded-lg
              shadow-lg
              shadow-indigo-500/20
            "
          >
            <Heart
              size={18}
              fill="currentColor"
            />
          </div>

          <span className="font-bold text-lg tracking-tight">
            CampOS
          </span>

          <span
            className="
              text-xs
              bg-slate-800
              border border-slate-700
              px-2
              py-0.5
              rounded
              text-slate-300
            "
          >
            v1.0
          </span>

        </div>

        {/* User Info */}

        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">

          <div className="text-indigo-400">
            <UserCircle2 size={34} />
          </div>

          <div className="min-w-0">

            <p className="text-sm truncate font-semibold tracking-tight">
              {currentUser.fullName}
            </p>

            <span className="text-xs text-slate-400">
              {currentUser.role}
            </span>

          </div>

        </div>

        {/* Navigation */}

        <nav className="flex flex-col gap-1 p-3 flex-1">

          {navItems.map((item, idx) => {

            const isActive =
              location.pathname === item.path;

            const badgeCount =
              getBadgeCount(item.badge);

            return (
              <Link
                key={idx}
                to={item.path}
                className={`
                  flex items-center
                  gap-3
                  px-4
                  py-2.5
                  rounded-lg
                  text-sm
                  transition-all
                  duration-200
                  ${
                    isActive
                      ? `
                        bg-gradient-to-r
                        from-indigo-500
                        to-violet-600
                        text-white
                        shadow-md
                        shadow-indigo-500/20
                      `
                      : `
                        text-slate-400
                        hover:text-white
                        hover:bg-slate-800
                      `
                  }
                `}
              >

                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>

                <span className="flex-1 font-medium">
                  {item.label}
                </span>

                {badgeCount > 0 && (
                  <span
                    className="
                      bg-rose-500
                      text-white
                      text-xs
                      font-semibold
                      px-2
                      py-0.5
                      rounded-full
                      shadow-sm
                    "
                  >
                    {badgeCount}
                  </span>
                )}

              </Link>
            );
          })}

        </nav>

        {/* Logout */}

        <div className="p-4 border-t border-slate-800">

          <button
            onClick={handleLogout}
            className="
              w-full
              bg-slate-900
              hover:bg-rose-600
              border border-slate-700
              hover:border-rose-500
              text-slate-300
              hover:text-white
              py-2
              rounded-md
              flex
              items-center
              justify-center
              gap-2
              transition-all
              duration-200
            "
          >
            <LogOut size={16} />
            Log Out
          </button>

        </div>

      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}

        <header
          className="
            flex items-center
            justify-between
            px-6
            py-4
            border-b
            border-slate-200
            bg-white
          "
        >

          {/* Left */}

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
              className="
                p-1.5
                hover:bg-slate-100
                text-slate-600
                hover:text-indigo-600
                rounded-lg
                transition
              "
            >
              {sidebarOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}
            </button>

            <div>

              <p
                className="
                  text-xs
                  uppercase
                  tracking-wider
                  text-slate-400
                  font-semibold
                "
              >
                Active Session
              </p>

              <h2
                className="
                  font-bold
                  text-slate-800
                  tracking-tight
                "
              >
                {orgName}
              </h2>

            </div>

          </div>

          {/* Right */}

          <div className="flex items-center gap-4">

            {/* Notification */}

            <div className="relative text-slate-600 hover:text-indigo-600 transition cursor-pointer">

              <Bell size={20} />

              {userNotifications.length > 0 && (
                <span
                  className="
                    absolute
                    -top-1
                    -right-1
                    w-2
                    h-2
                    bg-rose-500
                    rounded-full
                    ring-2
                    ring-white
                  "
                />
              )}

            </div>

            {/* Divider */}

            <div className="w-px h-5 bg-slate-200" />

            {/* Date */}

            <span
              className="
                text-sm
                font-medium
                text-slate-500
              "
            >
              {new Date().toLocaleDateString(
                'en-US',
                {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                }
              )}
            </span>

          </div>

        </header>

        {/* Content */}

        <main
          className="
            flex-1
            overflow-y-auto
            p-8
            bg-slate-50
          "
        >
          {children}
        </main>

      </div>

      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}

      {PAYMENTS_ENABLED && currentUser.role === 'OrgAdmin' && (
        <PaymentAlertModal
          subscription={orgSubscription}
          planLabel={
            SUBSCRIPTION_PLANS[orgPlanKey]?.label ||
            currentOrg?.subPlan
          }
        />
      )}

    </div>
  );
};

export default DashboardLayout;