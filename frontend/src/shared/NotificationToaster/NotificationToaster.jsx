import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  CalendarDays,
  Video,
  CheckSquare,
  ShieldCheck,
  AtSign,
  MessageCircleQuestion,
  Globe,
  X
} from 'lucide-react';
import { AppContext } from '../../context/AppContext';

// ============================================================
// Toast popups for new notifications (top-right of the dashboard).
// A toast stays for ~10s, pauses while hovered, can be closed, and
// clicking it marks the underlying notification as read.
// ============================================================

const AUTO_DISMISS_MS = 10000;

const TYPE_STYLES = {
  CampAlert: { icon: Calendar, ring: 'border-blue-200', badge: 'bg-blue-100 text-blue-600', bar: 'bg-blue-500' },
  EventAlert: { icon: CalendarDays, ring: 'border-purple-200', badge: 'bg-purple-100 text-purple-600', bar: 'bg-purple-500' },
  MeetingAlert: { icon: Video, ring: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-600', bar: 'bg-cyan-500' },
  TaskAlert: { icon: CheckSquare, ring: 'border-amber-200', badge: 'bg-amber-100 text-amber-600', bar: 'bg-amber-500' },
  Accessibility: { icon: ShieldCheck, ring: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-600', bar: 'bg-emerald-500' },
  Mention: { icon: AtSign, ring: 'border-pink-200', badge: 'bg-pink-100 text-pink-600', bar: 'bg-pink-500' },
  Query: { icon: MessageCircleQuestion, ring: 'border-sky-200', badge: 'bg-sky-100 text-sky-600', bar: 'bg-sky-500' },
  VisibilityRequest: { icon: Globe, ring: 'border-teal-200', badge: 'bg-teal-100 text-teal-600', bar: 'bg-teal-500' }
};

const DEFAULT_STYLE = {
  icon: Bell,
  ring: 'border-indigo-200',
  badge: 'bg-indigo-100 text-indigo-600',
  bar: 'bg-indigo-500'
};

const formatWhen = (iso) => {
  if (!iso) return 'Just now';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const Toast = ({ toast, onClose, onOpen }) => {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(AUTO_DISMISS_MS);
  const startedRef = useRef(Date.now());
  const style = TYPE_STYLES[toast.type] || DEFAULT_STYLE;
  const Icon = style.icon;

  useEffect(() => {
    if (paused) return undefined;

    startedRef.current = Date.now();

    const timer = setTimeout(onClose, remainingRef.current);

    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(
        1500,
        remainingRef.current - (Date.now() - startedRef.current)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={onOpen}
      className={`ws-toast-in pointer-events-auto relative w-[min(92vw,380px)] cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-2xl shadow-slate-400/30 ${style.ring}`}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.badge}`}>
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-slate-900">
            {toast.title}
          </p>

          {toast.message && (
            <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-line break-words text-[13px] leading-5 text-slate-600">
              {toast.message}
            </p>
          )}

          <p className="mt-1.5 text-[11px] font-medium text-slate-400">
            {formatWhen(toast.createdAt)}
          </p>
        </div>
      </div>

      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <X size={15} />
      </button>

      <div className="h-1 w-full bg-slate-100">
        <div
          className={`h-full origin-left ${style.bar}`}
          style={{
            animation: `ws-toast-bar ${AUTO_DISMISS_MS}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running'
          }}
        />
      </div>
    </div>
  );
};

const NotificationToaster = () => {
  const { toasts = [], dismissToast, markNotificationAsRead } =
    useContext(AppContext);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col items-end gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <Toast
          key={toast.toastId}
          toast={toast}
          onClose={() => dismissToast(toast.toastId)}
          onOpen={() => {
            if (toast.notification) {
              markNotificationAsRead(toast.notification);
            }
            dismissToast(toast.toastId);
          }}
        />
      ))}
    </div>
  );
};

export default NotificationToaster;
