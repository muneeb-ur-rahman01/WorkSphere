import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import logo from '../../assets/Images/logo.png';

export const ROUTE_LOADER_MS = 1000;

// Full-screen loader shown for 3 seconds on every page-to-page navigation.
// The logo stays still; only the ring around it rotates.
const RouteLoader = ({ duration = ROUTE_LOADER_MS }) => {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const prev = useRef(pathname);

  useEffect(() => {
    if (prev.current === pathname) return undefined; // first render / same page: no loader
    prev.current = pathname;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [pathname, duration]);

  if (!visible) return null;
  return (
    <div role="status" aria-live="polite" aria-label="Loading page" data-testid="route-loader"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <div data-testid="route-loader-ring" className="absolute inset-0 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin motion-reduce:animate-pulse" />
        <img src={logo} alt="WorkSphere" className="w-20 h-20 object-contain select-none" draggable={false} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
};

export default RouteLoader;
