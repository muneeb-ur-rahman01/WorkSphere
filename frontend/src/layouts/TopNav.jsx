import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';

const Badge = ({ count, className = '' }) =>
  count > 0 ? (
    <span
      className={`bg-rose-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm shrink-0 leading-none ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  ) : null;

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'U';

const TopNav = ({
  navItems = [],
  getBadgeCount = () => 0,
  currentUser,
  onLogout,
  logo
}) => {
  const location = useLocation();
  // Menu state remembers the path it was opened on, so it is automatically
  // treated as closed after navigation (no setState-in-effect needed).
  const [openState, setOpenState] = useState({ key: null, path: null });
  const [mobileState, setMobileState] = useState({ open: false, group: null, path: null });
  const [userMenu, setUserMenu] = useState(false);
  const navRef = useRef(null);
  const userRef = useRef(null);

  const openGroup = openState.path === location.pathname ? openState.key : null;
  const mobileOpen = mobileState.open && mobileState.path === location.pathname;
  const mobileGroup = mobileOpen ? mobileState.group : null;

  const setOpenGroup = (key) => setOpenState({ key, path: location.pathname });
  const setMobileOpen = (fn) =>
    setMobileState((m) => {
      const cur = m.open && m.path === location.pathname;
      const next = typeof fn === 'function' ? fn(cur) : fn;
      return { open: next, group: null, path: location.pathname };
    });
  const setMobileGroup = (group) =>
    setMobileState({ open: true, group, path: location.pathname });

  // Close dropdowns on outside click / Escape
  useEffect(() => {
    const onDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenState({ key: null, path: null });
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserMenu(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenState({ key: null, path: null });
        setMobileState({ open: false, group: null, path: null });
        setUserMenu(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Items that have no destination are skipped
  const items = navItems.filter((i) => i && (i.path || i.children));

  const isChildActive = (item) =>
    item.children?.some((c) => location.pathname === c.path);

  const groupBadge = (item) =>
    item.children.reduce((s, c) => s + getBadgeCount(c.badge), 0);

  // Original theme classes
  const activeCls =
    'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20';
  const idleCls = 'text-slate-400 hover:text-white hover:bg-white/10';

  // Desktop item: icon on top, label below
  const stackBase =
    'relative flex flex-col items-center justify-center gap-1 px-3 py-2 my-1.5 min-w-[72px] rounded-lg text-[11px] font-medium uppercase tracking-wide whitespace-nowrap transition-all duration-200';
  const iconSize = '[&>svg]:w-6 [&>svg]:h-6';

  // Row item (dropdown + mobile)
  const rowBase =
    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200';

  const Avatar = ({ size = 40 }) => (
    <span
      className="flex items-center justify-center rounded-full bg-red-600 text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {getInitials(currentUser?.fullName)}
    </span>
  );

  return (
    <div
      ref={navRef}
      className="sticky top-0 z-50 bg-[#0b1220] text-white border-b border-white/10 shadow-lg shadow-black/20"
    >
      <div className="flex items-stretch min-h-[64px]">
        {/* BRAND */}
        <Link
          to={items.find((i) => i.path)?.path || '/'}
          className="flex items-center shrink-0 px-4 lg:px-5 lg:border-r border-white/10"
          title="Home"
        >
          <img src={logo} alt="Logo" className="h-10 w-auto max-w-[140px] object-contain" />
        </Link>

        {/* DESKTOP NAV */}
        <nav
          className="hidden lg:flex flex-1 flex-wrap items-center gap-1 min-w-0 px-2"
          aria-label="Main navigation"
        >
          {items.map((item, idx) => {
            if (item.children) {
              const open = openGroup === item.key;
              const active = isChildActive(item);
              return (
                <div key={item.key || idx} className="relative flex">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={() => setOpenGroup(open ? null : item.key)}
                    className={`${stackBase} ${
                      active ? activeCls : open ? 'bg-white/10 text-white' : idleCls
                    }`}
                  >
                    <span className={`shrink-0 ${iconSize}`}>{item.icon}</span>
                    <span className="flex items-center gap-1">
                      {item.label}
                      <ChevronDown
                        size={11}
                        className={`transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </span>
                    <Badge count={groupBadge(item)} className="absolute top-0.5 right-1" />
                  </button>

                  {open && (
                    <div
                      role="menu"
                      className="absolute left-0 top-full mt-2 min-w-[220px] max-h-[70vh] overflow-y-auto bg-[#0b1220] border border-white/10 rounded-xl shadow-2xl shadow-black/40 p-1.5 z-[60]"
                    >
                      {item.children.map((child) => {
                        const childActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            role="menuitem"
                            className={`${rowBase} ${childActive ? activeCls : idleCls}`}
                          >
                            <span className="shrink-0">{child.icon}</span>
                            <span className="flex-1">{child.label}</span>
                            <Badge count={getBadgeCount(child.badge)} />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path || idx}
                to={item.path}
                className={`${stackBase} ${active ? activeCls : idleCls}`}
              >
                <span className={`shrink-0 ${iconSize}`}>{item.icon}</span>
                <span>{item.label}</span>
                <Badge count={getBadgeCount(item.badge)} className="absolute top-0.5 right-1" />
              </Link>
            );
          })}
        </nav>

        {/* SPACER (mobile) */}
        <div className="flex-1 lg:hidden" />

        {/* USER (desktop) */}
        <div
          ref={userRef}
          className="hidden lg:flex relative items-center shrink-0 border-l border-white/10 px-4"
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={userMenu}
            onClick={() => setUserMenu((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg py-1 px-1.5 hover:bg-white/10 transition-colors"
          >
            <Avatar size={40} />
            <span className="text-sm text-slate-200 max-w-[130px] truncate">
              {currentUser?.fullName}
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform ${userMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {userMenu && (
            <div
              role="menu"
              className="absolute right-3 top-full mt-2 w-56 bg-[#0b1220] border border-white/10 rounded-xl shadow-2xl shadow-black/40 p-1.5 z-[60]"
            >
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <p className="text-sm font-semibold truncate">{currentUser?.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser?.role}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className={`${rowBase} w-full text-slate-300 hover:bg-rose-600 hover:text-white`}
              >
                <LogOut size={15} className="shrink-0" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* HAMBURGER (mobile / tablet) */}
        <button
          type="button"
          className="lg:hidden px-4 text-slate-300 hover:text-white transition"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* MOBILE / TABLET PANEL */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 max-h-[calc(100vh-70px)] overflow-y-auto p-2 flex flex-col gap-1">
          {items.map((item, idx) => {
            if (item.children) {
              const open = mobileGroup === item.key;
              const active = isChildActive(item);
              return (
                <div key={item.key || idx} className="flex flex-col">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setMobileGroup(open ? null : item.key)}
                    className={`${rowBase} w-full ${
                      active ? activeCls : open ? 'bg-white/10 text-white' : idleCls
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <Badge count={groupBadge(item)} />
                    <ChevronDown
                      size={14}
                      className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {open && (
                    <div className="ml-4 mt-1 pl-2 border-l border-white/10 flex flex-col gap-1">
                      {item.children.map((child) => {
                        const childActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`${rowBase} ${childActive ? activeCls : idleCls}`}
                          >
                            <span className="shrink-0">{child.icon}</span>
                            <span className="flex-1">{child.label}</span>
                            <Badge count={getBadgeCount(child.badge)} />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path || idx}
                to={item.path}
                className={`${rowBase} w-full ${active ? activeCls : idleCls}`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                <Badge count={getBadgeCount(item.badge)} />
              </Link>
            );
          })}

          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar size={36} />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{currentUser?.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser?.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 bg-white/5 hover:bg-rose-600 border border-white/10 hover:border-rose-500 text-slate-300 hover:text-white px-3 py-2 rounded-md text-xs transition-all"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopNav;