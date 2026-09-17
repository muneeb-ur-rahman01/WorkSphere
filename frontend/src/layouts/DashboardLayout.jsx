import React, {
  useContext,
  useState,
  useRef,
  useEffect
} from 'react';

import {
  Link,
  useNavigate,
  useLocation
} from 'react-router-dom';

import logo from '../assets/Images/logo.png';

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
  Video,
  UserCircle2,
  Settings as SettingsIcon,
  MessageSquare,
  MessageCircleQuestion,
  BarChart3,
  CreditCard,
  ShieldCheck,
  Globe,
  Briefcase,
  Sparkles,
  History,
  Activity,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Megaphone,
  HeartHandshake,
  HandHeart,
  Gift,
  Handshake,
  UsersRound,
  Wallet,
  FileText,
  ClipboardCheck,
  TrendingUp,
  Check
} from 'lucide-react';

import { AppContext } from '../context/AppContext';
import PaymentAlertModal from '../shared/PaymentAlertModal/PaymentAlertModal';

import {
  SUBSCRIPTION_PLANS,
  PAYMENTS_ENABLED
} from '../Config/constant';

const DashboardLayout = ({ children }) => {
  const {
    currentUser,
    logout,
    notifications = [],
    organizations = [],
    users = [],
    tasks = [],
    discussionGroups = [],
    queries = [],
    visibilityRequests = [],
    hasAccess,

    // =========================================================
    // NOTIFICATION READ STATE FROM APPCONTEXT
    // =========================================================
    unreadNotifications = [],
    markNotificationAsRead,
    markAllNotificationsAsRead,
    isNotificationRead
  } = useContext(AppContext);

  const navigate = useNavigate();
  const location = useLocation();

  // =========================================================
  // SIDEBAR
  // =========================================================

  const [sidebarHovered, setSidebarHovered] = useState(false);

  const [collapsedGroups, setCollapsedGroups] =
    useState({});

  // =========================================================
  // NOTIFICATION DROPDOWN
  // =========================================================

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [
    sidebarNotificationsOpen,
    setSidebarNotificationsOpen
  ] = useState(false);

  const headerNotificationRef = useRef(null);
  const sidebarNotificationRef = useRef(null);

  // =========================================================
  // CLOSE NOTIFICATION DROPDOWNS
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        headerNotificationRef.current &&
        !headerNotificationRef.current.contains(
          event.target
        )
      ) {
        setNotificationsOpen(false);
      }

      if (
        sidebarNotificationRef.current &&
        !sidebarNotificationRef.current.contains(
          event.target
        )
      ) {
        setSidebarNotificationsOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  // =========================================================
  // GROUP TOGGLE
  // =========================================================

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!currentUser) {
    navigate('/login/org');
    return null;
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // =========================================================
  // ORGANIZATION
  // =========================================================

  const currentOrg = organizations.find(
    (o) =>
      String(o.id) ===
      String(currentUser.orgId)
  );

  const orgName = currentOrg
    ? currentOrg.name
    : 'WorkSphere SaaS Admin';

  // =========================================================
  // SUBSCRIPTION
  // =========================================================

  const orgSubscription =
    currentOrg?.subscription || null;

  const orgPlanKey =
    currentOrg?.subPlan &&
    SUBSCRIPTION_PLANS[currentOrg.subPlan]
      ? currentOrg.subPlan
      : 'Basic';

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const userNotifications = notifications.filter(
    (n) => {

      // SuperAdmin gets global notifications
      if (currentUser.role === 'SuperAdmin') {
        return n.orgId === null;
      }

      // OrgAdmin gets organization notifications
      if (currentUser.role === 'OrgAdmin') {
        return (
          n.orgId === currentUser.orgId
        );
      }

      // Specific user notification
      if (n.targetUserId) {
        return (
          String(n.targetUserId) ===
          String(currentUser.id)
        );
      }

      // Staff notifications
      return (
        String(n.orgId) ===
          String(currentUser.orgId) &&
        (
          n.targetRole === 'All' ||
          n.targetRole === currentUser.role
        )
      );
    }
  );

  // =========================================================
  // STABLE NOTIFICATION KEY
  // =========================================================

  const getNotificationKey = (notification) => {
    if (
      notification.id !== undefined &&
      notification.id !== null
    ) {
      return `id:${String(notification.id)}`;
    }

    return [
      notification.orgId || '',
      notification.targetUserId || '',
      notification.targetRole || '',
      notification.title || '',
      notification.message || '',
      notification.createdAt ||
        notification.date ||
        ''
    ].join('|');
  };

  // =========================================================
  // LATEST FIRST
  // =========================================================

  const sortedUserNotifications = [
    ...userNotifications
  ].sort((a, b) => {

    const dateA = new Date(
      a.createdAt ||
        a.date ||
        0
    ).getTime();

    const dateB = new Date(
      b.createdAt ||
        b.date ||
        0
    ).getTime();

    return dateB - dateA;
  });

  // =========================================================
  // CHECK READ STATUS
  // =========================================================

  const checkNotificationRead = (
    notification
  ) => {
    if (typeof isNotificationRead === 'function') {
      return isNotificationRead(notification);
    }

    return false;
  };

  // =========================================================
  // UNREAD NOTIFICATIONS
  // =========================================================

  const unreadUserNotifications =
    sortedUserNotifications.filter(
      (notification) =>
        !checkNotificationRead(notification)
    );

  const unreadNotificationsCount =
    unreadUserNotifications.length;

  // =========================================================
  // BADGES
  // =========================================================

  const pendingRequestsCount =
    users.filter(
      (u) =>
        u.orgId === currentUser.orgId &&
        u.status === 'Pending'
    ).length;

  const unreadTaskCommentsCount =
    currentUser.role === 'OrgAdmin'
      ? tasks.filter(
          (t) =>
            t.orgId ===
              currentUser.orgId &&
            t.hasUnreadForAdmin
        ).length
      : tasks.filter(
          (t) =>
            t.assignedToId ===
              currentUser.id &&
            t.hasUnreadForAssignee
        ).length;

  const unreadDiscussionCount =
    discussionGroups.reduce(
      (sum, g) =>
        sum + (g.unreadCount || 0),
      0
    );

  // =========================================================
  // NAVIGATION
  // =========================================================

  const getNavItems = () => {

    // =======================================================
    // SUPER ADMIN
    // =======================================================

    if (
      currentUser.role ===
      'SuperAdmin'
    ) {
      return [
        {
          path: '/super-admin/dashboard',
          label: 'Overview Dashboard',
          icon: (
            <LayoutDashboard size={18} />
          )
        },

        {
          path: '/super-admin/organizations',
          label: 'Organization Management',
          icon: <Building size={18} />
        },

        {
          path: '/super-admin/user-management',
          label: 'User Management',
          icon: <Users size={18} />
        },

        ...(PAYMENTS_ENABLED
          ? [
              {
                path: '/super-admin/billing',
                label: 'Billing & Payments',
                icon: (
                  <CreditCard size={18} />
                )
              }
            ]
          : []),

        {
          key: 'external-relations',
          label: 'External Relations',
          icon: <Globe size={18} />,
          children: [
            {
              path: '/super-admin/queries',
              label: 'External Queries',
              icon: (
                <MessageCircleQuestion
                  size={18}
                />
              ),
              badge: 'newQueries'
            },

            {
              path:
                '/super-admin/visibility-requests',
              label: 'Visibility Requests',
              icon: (
                <Globe size={18} />
              ),
              badge:
                'pendingVisibilityRequests'
            }
          ]
        },

        {
          key: 'reports-monitoring',
          label: 'Reports & Monitoring',
          icon: (
            <BarChart3 size={18} />
          ),
          children: [
            {
              path:
                '/super-admin/analytics',
              label: 'Analytics & Reports',
              icon: (
                <BarChart3 size={18} />
              )
            },

            {
              path:
                '/super-admin/system-monitoring',
              label: 'System Monitoring',
              icon: (
                <Activity size={18} />
              )
            },

            {
              path:
                '/super-admin/audit-logs',
              label: 'Audit Logs',
              icon: (
                <History size={18} />
              )
            }
          ]
        },

        {
          path:
            '/super-admin/platform-settings',
          label: 'Platform Settings',
          icon: (
            <SettingsIcon size={18} />
          )
        },

        {
          key: 'notifications',
          label: 'Notifications',
          icon: <Bell size={18} />
        },

        {
          path: '/settings',
          label: 'Settings',
          icon: (
            <SettingsIcon size={18} />
          )
        }
      ];
    }

    // =======================================================
    // ORG ADMIN
    // =======================================================

    if (
      currentUser.role ===
      'OrgAdmin'
    ) {
      return [
        {
          path: '/org-admin/dashboard',
          label: 'Overview Dashboard',
          icon: (
            <LayoutDashboard size={18} />
          )
        },

        {
          key:
            'user-access-management',
          label:
            'User & Access Management',
          icon: <Users size={18} />,
          children: [
            {
              path:
                '/org-admin/requests',
              label:
                'Registration Requests',
              icon: (
                <PlusCircle size={18} />
              ),
              badge:
                'pendingRequests'
            },

            {
              path:
                '/org-admin/users',
              label:
                'Employees & Staff',
              icon: <Users size={18} />
            },

            {
              path:
                '/org-admin/accessibility',
              label: 'Accessibility',
              icon: (
                <ShieldCheck
                  size={18}
                />
              )
            }
          ]
        },

        {
          key: 'camps-events',
          label: 'Camps & Events',
          icon: (
            <Calendar size={18} />
          ),
          children: [
            {
              path:
                '/org-admin/camps',
              label: 'Camps',
              icon: (
                <Calendar size={18} />
              )
            },

            {
              path:
                '/org-admin/events',
              label: 'Events',
              icon: (
                <CalendarDays
                  size={18}
                />
              )
            },

            {
              path:
                '/org-admin/visibility-requests',
              label:
                'Event/Camp Visibility',
              icon: (
                <Globe size={18} />
              )
            },

            {
              path:
                '/org-admin/opportunities',
              label:
                'Opportunities',
              icon: (
                <Briefcase size={18} />
              )
            }
          ]
        },

        {
          key:
            'projects-campaigns',
          label:
            'Projects & Campaigns',
          icon: (
            <FolderKanban size={18} />
          ),
          children: [
            {
              path:
                '/org-admin/projects',
              label: 'Projects',
              icon: (
                <FolderKanban
                  size={18}
                />
              )
            },

            {
              path:
                '/org-admin/campaigns',
              label: 'Campaigns',
              icon: (
                <Megaphone size={18} />
              )
            },

            {
              path:
                '/org-admin/meetings',
              label: 'Meetings',
              icon: (
                <Video size={18} />
              )
            },

            {
              path:
                '/org-admin/tasks',
              label: 'Task Matrix',
              icon: (
                <CheckSquare
                  size={18}
                />
              ),
              badge:
                'unreadTaskComments'
            }
          ]
        },

        {
          key:
            'people-partnerships',
          label:
            'People & Partnerships',
          icon: (
            <UsersRound size={18} />
          ),
          children: [
            {
              path:
                '/org-admin/volunteers',
              label: 'Volunteers',
              icon: (
                <HandHeart size={18} />
              )
            },

            {
              path:
                '/org-admin/donors',
              label: 'Donors',
              icon: (
                <HeartHandshake
                  size={18}
                />
              )
            },

            {
              path:
                '/org-admin/sponsors',
              label: 'Sponsors',
              icon: (
                <Gift size={18} />
              )
            },

            {
              path:
                '/org-admin/partners',
              label: 'Partners',
              icon: (
                <Handshake size={18} />
              )
            },

            {
              path:
                '/org-admin/beneficiaries',
              label:
                'Beneficiaries',
              icon: (
                <Heart
                  size={18}
                />
              )
            }
          ]
        },

        {
          key:
            'finance-documents',
          label:
            'Finance & Documents',
          icon: (
            <Wallet size={18} />
          ),
          children: [
            ...(PAYMENTS_ENABLED
              ? [
                  {
                    path:
                      '/org-admin/billing',
                    label:
                      'Billing & Subscription',
                    icon: (
                      <CreditCard
                        size={18}
                      />
                    )
                  }
                ]
              : []),

            {
              path:
                '/org-admin/expenses',
              label: 'Expenses',
              icon: (
                <Wallet size={18} />
              )
            },

            {
              path:
                '/org-admin/documents',
              label: 'Documents',
              icon: (
                <FileText size={18} />
              )
            }
          ]
        },

        {
          path:
            '/org-admin/approvals',
          label: 'Approval System',
          icon: (
            <ClipboardCheck
              size={18}
            />
          )
        },

        {
          key: 'reports-audit',
          label: 'Reports & Insights',
          icon: (
            <BarChart3 size={18} />
          ),
          children: [
            {
              path:
                '/org-admin/analytics',
              label:
                'Analytics & Reports',
              icon: (
                <BarChart3 size={18} />
              )
            },

            {
              path:
                '/org-admin/fundraising',
              label: 'Fundraising',
              icon: (
                <TrendingUp
                  size={18}
                />
              )
            },

            {
              path:
                '/org-admin/impact',
              label:
                'Impact Management',
              icon: (
                <Sparkles size={18} />
              )
            },

            {
              path:
                '/org-admin/audit-logs',
              label:
                'Audit & Activity Logs',
              icon: (
                <History size={18}
                />
              )
            }
          ]
        },

        {
          path:
            '/org-admin/ai-assistant',
          label: 'AI Module',
          icon: (
            <Sparkles size={18} />
          )
        },

        {
          path: '/discussion',
          label: 'Discussion',
          icon: (
            <MessageSquare size={18} />
          ),
          badge:
            'unreadDiscussion'
        },

        {
          key: 'notifications',
          label: 'Notifications',
          icon: <Bell size={18} />
        },

        {
          path: '/settings',
          label: 'Settings',
          icon: (
            <SettingsIcon size={18} />
          )
        }
      ];
    }

    // =======================================================
    // STAFF
    // =======================================================

    return [
      {
        path: '/staff/dashboard',
        label: 'My Workspace',
        icon: (
          <LayoutDashboard size={18} />
        ),
        badge:
          'unreadTaskComments'
      },

      ...(hasAccess(
        'registration_requests'
      )
        ? [
            {
              path:
                '/org-admin/requests',
              label:
                'Registration Requests',
              icon: (
                <PlusCircle
                  size={18}
                />
              ),
              badge:
                'pendingRequests'
            }
          ]
        : []),

      // -----------------------------------------------------
      // CAMPS & EVENTS
      // -----------------------------------------------------

      ...(() => {

        const children = [
          ...(hasAccess('camps')
            ? [
                {
                  path:
                    '/org-admin/camps',
                  label: 'Camps',
                  icon: (
                    <Calendar
                      size={18}
                    />
                  )
                }
              ]
            : []),

          ...(hasAccess('events')
            ? [
                {
                  path:
                    '/org-admin/events',
                  label: 'Events',
                  icon: (
                    <CalendarDays
                      size={18}
                    />
                  )
                }
              ]
            : []),

          ...(hasAccess('meetings')
            ? [
                {
                  path:
                    '/org-admin/meetings',
                  label: 'Meetings',
                  icon: (
                    <Video size={18} />
                  )
                }
              ]
            : [])
        ];

        return children.length > 0
          ? [
              {
                key:
                  'camps-events',
                label:
                  'Camps & Events',
                icon: (
                  <Calendar
                    size={18}
                  />
                ),
                children
              }
            ]
          : [];
      })(),

      // -----------------------------------------------------
      // PROJECTS & CAMPAIGNS
      // -----------------------------------------------------

      ...(() => {

        const children = [
          ...(hasAccess('projects')
            ? [
                {
                  path:
                    '/org-admin/projects',
                  label: 'Projects',
                  icon: (
                    <FolderKanban
                      size={18}
                    />
                  )
                }
              ]
            : []),

          ...(hasAccess('campaigns')
            ? [
                {
                  path:
                    '/org-admin/campaigns',
                  label: 'Campaigns',
                  icon: (
                    <Megaphone
                      size={18}
                    />
                  )
                }
              ]
            : [])
        ];

        return children.length > 0
          ? [
              {
                key:
                  'projects-campaigns',
                label:
                  'Projects & Campaigns',
                icon: (
                  <FolderKanban
                    size={18}
                  />
                ),
                children
              }
            ]
          : [];
      })(),

      // -----------------------------------------------------
      // PEOPLE & PARTNERSHIPS
      // -----------------------------------------------------

      ...(() => {

        const children = [
          ...(hasAccess('volunteers')
            ? [
                {
                  path:
                    '/org-admin/volunteers',
                  label:
                    'Volunteers',
                  icon: (
                    <HandHeart
                      size={18}
                    />
                  )
                }
              ]
            : []),

          ...(hasAccess('donors')
            ? [
                {
                  path:
                    '/org-admin/donors',
                  label: 'Donors',
                  icon: (
                    <HeartHandshake
                      size={18}
                    />
                  )
                }
              ]
            : []),

          ...(hasAccess('sponsors')
            ? [
                {
                  path:
                    '/org-admin/sponsors',
                  label: 'Sponsors',
                  icon: (
                    <Gift size={18} />
                  )
                }
              ]
            : []),

          ...(hasAccess('partners')
            ? [
                {
                  path:
                    '/org-admin/partners',
                  label: 'Partners',
                  icon: (
                    <Handshake
                      size={18}
                    />
                  )
                }
              ]
            : []),

          ...(hasAccess(
            'beneficiaries'
          )
            ? [
                {
                  path:
                    '/org-admin/beneficiaries',
                  label:
                    'Beneficiaries',
                  icon: (
                    <Heart
                      size={18}
                    />
                  )
                }
              ]
            : [])
        ];

        return children.length > 0
          ? [
              {
                key:
                  'people-partnerships',
                label:
                  'People & Partnerships',
                icon: (
                  <UsersRound
                    size={18}
                  />
                ),
                children
              }
            ]
          : [];
      })(),

      // -----------------------------------------------------
      // FINANCE & DOCUMENTS
      // -----------------------------------------------------

      ...(() => {

        const children = [
          ...(hasAccess('expenses')
            ? [
                {
                  path:
                    '/org-admin/expenses',
                  label: 'Expenses',
                  icon: (
                    <Wallet
                      size={18}
                    />
                  )
                }
              ]
            : []),

          ...(hasAccess('documents')
            ? [
                {
                  path:
                    '/org-admin/documents',
                  label:
                    'Documents',
                  icon: (
                    <FileText
                      size={18}
                    />
                  )
                }
              ]
            : [])
        ];

        return children.length > 0
          ? [
              {
                key:
                  'finance-documents',
                label:
                  'Finance & Documents',
                icon: (
                  <Wallet
                    size={18}
                  />
                ),
                children
              }
            ]
          : [];
      })(),

      {
        path: '/discussion',
        label: 'Discussion',
        icon: (
          <MessageSquare size={18} />
        ),
        badge:
          'unreadDiscussion'
      },

      {
        key: 'notifications',
        label: 'Notifications',
        icon: <Bell size={18} />
      },

      {
        path: '/settings',
        label: 'Settings',
        icon: (
          <SettingsIcon size={18} />
        )
      }
    ];
  };

  const navItems = getNavItems();

  // =========================================================
  // BADGE HELPER
  // =========================================================

  const getBadgeCount = (badge) => {

    if (
      badge === 'pendingRequests'
    ) {
      return pendingRequestsCount;
    }

    if (
      badge ===
      'unreadTaskComments'
    ) {
      return unreadTaskCommentsCount;
    }

    if (
      badge ===
      'unreadDiscussion'
    ) {
      return unreadDiscussionCount;
    }

    if (
      badge === 'newQueries'
    ) {
      return queries.filter(
        (q) => q.status === 'New'
      ).length;
    }

    if (
      badge ===
      'pendingVisibilityRequests'
    ) {
      return visibilityRequests.filter(
        (r) =>
          r.visibilityStatus ===
          'Pending'
      ).length;
    }

    return 0;
  };

  // =========================================================
  // NOTIFICATION ITEM
  // =========================================================

  const renderNotificationItem = (
    notification
  ) => {

    const isRead =
      checkNotificationRead(
        notification
      );

    return (
      <div
        key={getNotificationKey(
          notification
        )}
        className={`
          px-4
          py-3
          border-b
          border-slate-100
          transition

          ${
            isRead
              ? 'bg-white hover:bg-slate-50'
              : 'bg-indigo-50/50 hover:bg-indigo-50'
          }
        `}
      >

        <div
          className="
            flex
            items-start
            gap-3
          "
        >

          {/* ICON */}

          <div
            className={`
              w-8
              h-8
              rounded-full
              flex
              items-center
              justify-center
              shrink-0

              ${
                isRead
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-indigo-100 text-indigo-600'
              }
            `}
          >
            <Bell size={14} />
          </div>

          {/* CONTENT */}

          <div
            className="
              min-w-0
              flex-1
            "
          >

            <div
              className="
                flex
                items-start
                justify-between
                gap-2
              "
            >

              <p
                className={`
                  text-sm
                  line-clamp-2

                  ${
                    isRead
                      ? 'font-medium text-slate-600'
                      : 'font-bold text-slate-800'
                  }
                `}
              >
                {notification.title ||
                  'Notification'}
              </p>

              {!isRead && (
                <span
                  className="
                    w-2
                    h-2
                    bg-rose-500
                    rounded-full
                    shrink-0
                    mt-1
                  "
                />
              )}

            </div>

            {notification.message && (
              <p
                className="
                  text-xs
                  text-slate-500
                  mt-1
                  leading-5
                  line-clamp-3
                "
              >
                {notification.message}
              </p>
            )}

            {(notification.createdAt ||
              notification.date) && (
              <p
                className="
                  text-[10px]
                  text-slate-400
                  mt-1.5
                "
              >
                {new Date(
                  notification.createdAt ||
                    notification.date
                ).toLocaleString()}
              </p>
            )}

            {/* MARK AS READ */}

            {!isRead && (
              <button
                type="button"
                onClick={() =>
                  markNotificationAsRead(
                    notification
                  )
                }
                className="
                  mt-2
                  inline-flex
                  items-center
                  gap-1.5
                  text-[11px]
                  font-semibold
                  text-indigo-600
                  hover:text-indigo-800
                  transition
                "
              >
                <Check size={13} />

                Mark as read
              </button>
            )}

            {isRead && (
              <span
                className="
                  mt-2
                  inline-flex
                  items-center
                  gap-1
                  text-[10px]
                  font-medium
                  text-emerald-600
                "
              >
                <Check size={12} />

                Read
              </span>
            )}

          </div>

        </div>

      </div>
    );
  };

  // =========================================================
  // NOTIFICATION DROPDOWN
  // =========================================================

  const NotificationDropdown = ({
    isSidebar = false
  }) => {

    const visibleNotifications =
      sortedUserNotifications.slice(
        0,
        10
      );

    return (
      <div
        className={`
          absolute
          ${
            isSidebar
              ? 'left-full ml-2 bottom-0'
              : 'right-0 top-12'
          }
          w-80
          sm:w-96
          bg-white
          border
          border-slate-200
          rounded-2xl
          shadow-2xl
          shadow-slate-300/40
          z-[100]
          overflow-hidden
        `}
      >

        {/* HEADER */}

        <div
          className="
            flex
            items-center
            justify-between
            px-4
            py-3
            border-b
            border-slate-100
            bg-slate-50
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <div
              className="
                w-8
                h-8
                rounded-lg
                bg-indigo-100
                text-indigo-600
                flex
                items-center
                justify-center
              "
            >
              <Bell size={16} />
            </div>

            <div>

              <h3
                className="
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                Notifications
              </h3>

              <p
                className="
                  text-[11px]
                  text-slate-400
                "
              >
                Your latest updates
              </p>

            </div>

          </div>

          {/* MARK ALL */}

          {unreadNotificationsCount >
            0 && (
            <button
              type="button"
              onClick={() =>
                markAllNotificationsAsRead(
                  sortedUserNotifications
                )
              }
              className="
                text-[11px]
                font-bold
                text-indigo-600
                hover:text-indigo-800
                whitespace-nowrap
              "
            >
              Mark all as read
            </button>
          )}

        </div>

        {/* LIST */}

        <div
          className="
            max-h-[420px]
            overflow-y-auto
          "
        >

          {visibleNotifications.length >
          0 ? (

            visibleNotifications.map(
              renderNotificationItem
            )

          ) : (

            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                py-10
                px-4
              "
            >

              <div
                className="
                  w-12
                  h-12
                  rounded-full
                  bg-slate-100
                  text-slate-400
                  flex
                  items-center
                  justify-center
                  mb-3
                "
              >
                <Bell size={20} />
              </div>

              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-600
                "
              >
                No notifications
              </p>

              <p
                className="
                  text-xs
                  text-slate-400
                  mt-1
                  text-center
                "
              >
                You're all caught up.
              </p>

            </div>
          )}

        </div>

        {/* FOOTER */}

        {sortedUserNotifications.length >
          10 && (
          <div
            className="
              px-4
              py-2.5
              border-t
              border-slate-100
              bg-slate-50
              text-center
            "
          >
            <span
              className="
                text-xs
                font-semibold
                text-indigo-600
              "
            >
              Showing latest 10
              notifications
            </span>
          </div>
        )}

      </div>
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className="
        flex
        min-h-screen
        bg-slate-50
        text-slate-900
      "
    >

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        onMouseEnter={() =>
          setSidebarHovered(true)
        }
        onMouseLeave={() =>
          setSidebarHovered(false)
        }
        className={`
          fixed
          left-0
          top-0
          z-50
          h-screen
          flex
          flex-col
          bg-[#0b1220]
          text-white
          border-r
          border-white/10
          shadow-2xl
          shadow-black/20
          transition-all
          duration-300
          ease-in-out
          overflow-visible

          ${
            sidebarHovered
              ? 'w-72'
              : 'w-16'
          }
        `}
      >

        {/* BRAND */}

        <div
          className={`
            flex
            items-center
            gap-3
            py-5
            border-b
            border-white/10
            transition-all
            duration-300

            ${
              sidebarHovered
                ? 'px-5 justify-start'
                : 'px-3 justify-center'
            }
          `}
        >

          <div
            className="
              shrink-0
              w-10
              h-10
              flex
              items-center
              justify-center
              rounded-lg
              overflow-hidden
            "
            title="WorkSphere"
          >
            <img
              src={logo}
              alt="WorkSphere"
              className="
                w-full
                h-full
                object-contain
              "
            />
          </div>

          {sidebarHovered && (
            <>
              <span
                className="
                  font-bold
                  text-lg
                  tracking-tight
                  whitespace-nowrap
                "
              >
                WorkSphere
              </span>

              <span
                className="
                  text-xs
                  bg-white/10
                  border
                  border-white/10
                  px-2
                  py-0.5
                  rounded
                  text-slate-300
                  whitespace-nowrap
                "
              >
                v1.0
              </span>
            </>
          )}

        </div>

        {/* USER INFO */}

        <div
          className={`
            flex
            items-center
            gap-3
            py-5
            border-b
            border-white/10
            transition-all
            duration-300

            ${
              sidebarHovered
                ? 'px-5 justify-start'
                : 'px-3 justify-center'
            }
          `}
        >

          <div
            className="
              text-indigo-400
              shrink-0
            "
            title={currentUser.fullName}
          >
            <UserCircle2 size={34} />
          </div>

          {sidebarHovered && (
            <div className="min-w-0">

              <p
                className="
                  text-sm
                  truncate
                  font-semibold
                  tracking-tight
                "
              >
                {currentUser.fullName}
              </p>

              <span
                className="
                  text-xs
                  text-slate-400
                "
              >
                {currentUser.role}
              </span>

            </div>
          )}

        </div>

        {/* NAVIGATION */}

        <nav
          className="
            flex
            flex-col
            gap-1
            p-2
            flex-1
            overflow-y-auto
            overflow-x-visible
            scrollbar-thin
            scrollbar-thumb-slate-700
            scrollbar-track-transparent
          "
        >

          {navItems.map(
            (item, idx) => {

              // =================================================
              // NOTIFICATIONS SIDEBAR ITEM
              // =================================================

              if (
                item.key ===
                'notifications'
              ) {

                return (
                  <div
                    key="notifications"
                    ref={
                      sidebarNotificationRef
                    }
                    className="
                      relative
                      w-full
                    "
                  >

                    <button
                      type="button"
                      title={
                        !sidebarHovered
                          ? 'Notifications'
                          : undefined
                      }
                      onClick={() =>
                        setSidebarNotificationsOpen(
                          (prev) => !prev
                        )
                      }
                      className={`
                        flex
                        items-center
                        gap-3
                        py-2.5
                        rounded-lg
                        text-sm
                        transition-all
                        duration-200
                        w-full

                        ${
                          sidebarHovered
                            ? 'px-3 justify-start'
                            : 'px-3 justify-center'
                        }

                        ${
                          sidebarNotificationsOpen
                            ? `
                              bg-white/10
                              text-white
                            `
                            : `
                              text-slate-400
                              hover:text-white
                              hover:bg-white/10
                            `
                        }
                      `}
                    >

                      <span
                        className="
                          text-slate-300
                          shrink-0
                        "
                      >
                        <Bell size={18} />
                      </span>

                      {sidebarHovered && (
                        <span
                          className="
                            flex-1
                            font-medium
                            whitespace-nowrap
                            text-left
                          "
                        >
                          Notifications
                        </span>
                      )}

                      {unreadNotificationsCount >
                        0 && (
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
                            shrink-0
                          "
                        >
                          {unreadNotificationsCount >
                          99
                            ? '99+'
                            : unreadNotificationsCount}
                        </span>
                      )}

                    </button>

                    {sidebarNotificationsOpen && (
                      <NotificationDropdown
                        isSidebar
                      />
                    )}

                  </div>
                );
              }

              // =================================================
              // GROUP
              // =================================================

              if (item.children) {

                const isCollapsed =
                  !!collapsedGroups[
                    item.key
                  ];

                const groupBadgeTotal =
                  item.children.reduce(
                    (sum, child) =>
                      sum +
                      getBadgeCount(
                        child.badge
                      ),
                    0
                  );

                const groupHasActiveChild =
                  item.children.some(
                    (child) =>
                      location.pathname ===
                      child.path
                  );

                return (
                  <div
                    key={
                      item.key || idx
                    }
                    className="
                      flex
                      flex-col
                    "
                  >

                    <button
                      type="button"
                      title={
                        !sidebarHovered
                          ? item.label
                          : undefined
                      }
                      onClick={() => {

                        if (
                          sidebarHovered
                        ) {
                          toggleGroup(
                            item.key
                          );
                        }

                      }}
                      className={`
                        flex
                        items-center
                        gap-3
                        py-2.5
                        rounded-lg
                        text-sm
                        transition-all
                        duration-200
                        w-full

                        ${
                          sidebarHovered
                            ? 'px-3 justify-start'
                            : 'px-3 justify-center'
                        }

                        ${
                          groupHasActiveChild
                            ? 'text-white bg-white/5'
                            : `
                              text-slate-400
                              hover:text-white
                              hover:bg-white/10
                            `
                        }
                      `}
                    >

                      <span
                        className={
                          groupHasActiveChild
                            ? 'text-white shrink-0'
                            : 'text-slate-400 shrink-0'
                        }
                      >
                        {item.icon}
                      </span>

                      {sidebarHovered && (
                        <>
                          <span
                            className="
                              flex-1
                              font-semibold
                              uppercase
                              tracking-wide
                              text-xs
                              text-left
                              whitespace-nowrap
                            "
                          >
                            {item.label}
                          </span>

                          {groupBadgeTotal >
                            0 && (
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
                                shrink-0
                              "
                            >
                              {
                                groupBadgeTotal
                              }
                            </span>
                          )}

                          {isCollapsed ? (
                            <ChevronRight
                              size={14}
                              className="shrink-0"
                            />
                          ) : (
                            <ChevronDown
                              size={14}
                              className="shrink-0"
                            />
                          )}
                        </>
                      )}

                    </button>

                    {sidebarHovered &&
                      !isCollapsed && (
                        <div
                          className="
                            flex
                            flex-col
                            gap-1
                            pl-3
                            mt-1
                            mb-1
                            ml-4
                            border-l
                            border-white/10
                          "
                        >

                          {item.children.map(
                            (child) => {

                              const childActive =
                                location.pathname ===
                                child.path;

                              const childBadge =
                                getBadgeCount(
                                  child.badge
                                );

                              return (
                                <Link
                                  key={
                                    child.path
                                  }
                                  to={
                                    child.path
                                  }
                                  className={`
                                    flex
                                    items-center
                                    gap-3
                                    px-3
                                    py-2
                                    rounded-lg
                                    text-sm
                                    transition-all
                                    duration-200

                                    ${
                                      childActive
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
                                          hover:bg-white/10
                                        `
                                    }
                                  `}
                                >

                                  <span
                                    className={
                                      childActive
                                        ? 'text-white shrink-0'
                                        : 'text-slate-400 shrink-0'
                                    }
                                  >
                                    {
                                      child.icon
                                    }
                                  </span>

                                  <span
                                    className="
                                      flex-1
                                      font-medium
                                      whitespace-nowrap
                                    "
                                  >
                                    {
                                      child.label
                                    }
                                  </span>

                                  {childBadge >
                                    0 && (
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
                                        shrink-0
                                      "
                                    >
                                      {
                                        childBadge
                                      }
                                    </span>
                                  )}

                                </Link>
                              );
                            }
                          )}

                        </div>
                      )}

                  </div>
                );
              }

              // =================================================
              // STANDALONE
              // =================================================

              const isActive =
                location.pathname ===
                item.path;

              const badgeCount =
                getBadgeCount(
                  item.badge
                );

              return (
                <Link
                  key={
                    item.path || idx
                  }
                  to={item.path}
                  title={
                    !sidebarHovered
                      ? item.label
                      : undefined
                  }
                  className={`
                    flex
                    items-center
                    gap-3
                    py-2.5
                    rounded-lg
                    text-sm
                    transition-all
                    duration-200
                    w-full

                    ${
                      sidebarHovered
                        ? 'px-3 justify-start'
                        : 'px-3 justify-center'
                    }

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
                          hover:bg-white/10
                        `
                    }
                  `}
                >

                  <span
                    className={
                      isActive
                        ? 'text-white shrink-0'
                        : 'text-slate-400 shrink-0'
                    }
                  >
                    {item.icon}
                  </span>

                  {sidebarHovered && (
                    <span
                      className="
                        flex-1
                        font-medium
                        whitespace-nowrap
                      "
                    >
                      {item.label}
                    </span>
                  )}

                  {sidebarHovered &&
                    badgeCount > 0 && (
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
                        shrink-0
                      "
                    >
                      {badgeCount}
                    </span>
                  )}

                </Link>
              );
            }
          )}

        </nav>

        {/* LOGOUT */}

        <div
          className={`
            border-t
            border-white/10
            transition-all
            duration-300

            ${
              sidebarHovered
                ? 'p-4'
                : 'p-2'
            }
          `}
        >

          <button
            onClick={handleLogout}
            title={
              !sidebarHovered
                ? 'Log Out'
                : undefined
            }
            className={`
              w-full
              bg-white/5
              hover:bg-rose-600
              border
              border-white/10
              hover:border-rose-500
              text-slate-300
              hover:text-white
              py-2
              rounded-md
              flex
              items-center
              transition-all
              duration-200

              ${
                sidebarHovered
                  ? 'justify-center gap-2'
                  : 'justify-center'
              }
            `}
          >

            <LogOut
              size={16}
              className="shrink-0"
            />

            {sidebarHovered && (
              <span
                className="
                  whitespace-nowrap
                "
              >
                Log Out
              </span>
            )}

          </button>

        </div>

      </aside>

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div
        className="
          flex
          flex-col
          flex-1
          min-w-0
          ml-16
        "
      >

        {/* HEADER */}

        <header
          className="
            flex
            items-center
            justify-between
            px-6
            py-4
            border-b
            border-slate-200
            bg-white
          "
        >

          {/* LEFT */}

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

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

          {/* RIGHT */}

          <div
            className="
              flex
              items-center
              gap-4
            "
          >

            {/* =================================================
                TOP RIGHT NOTIFICATION
            ================================================= */}

            <div
              ref={
                headerNotificationRef
              }
              className="relative"
            >

              <button
                type="button"
                onClick={() =>
                  setNotificationsOpen(
                    (prev) => !prev
                  )
                }
                className="
                  relative
                  p-2
                  rounded-lg
                  text-slate-600
                  hover:text-indigo-600
                  hover:bg-indigo-50
                  transition
                "
                title="Notifications"
              >

                <Bell size={20} />

                {/* ONLY UNREAD BADGE */}

                {unreadNotificationsCount >
                  0 && (
                  <span
                    className="
                      absolute
                      -top-0.5
                      -right-0.5
                      min-w-[17px]
                      h-[17px]
                      px-1
                      flex
                      items-center
                      justify-center
                      bg-rose-500
                      text-white
                      text-[10px]
                      font-bold
                      rounded-full
                      ring-2
                      ring-white
                    "
                  >
                    {unreadNotificationsCount >
                    99
                      ? '99+'
                      : unreadNotificationsCount}
                  </span>
                )}

              </button>

              {notificationsOpen && (
                <NotificationDropdown />
              )}

            </div>

            {/* DIVIDER */}

            <div
              className="
                w-px
                h-5
                bg-slate-200
              "
            />

            {/* DATE */}

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

        {/* CONTENT */}

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

      {PAYMENTS_ENABLED &&
        currentUser.role ===
          'OrgAdmin' && (
          <PaymentAlertModal
            subscription={
              orgSubscription
            }
            planLabel={
              SUBSCRIPTION_PLANS[
                orgPlanKey
              ]?.label ||
              currentOrg?.subPlan
            }
          />
        )}

    </div>
  );
};

export default DashboardLayout;