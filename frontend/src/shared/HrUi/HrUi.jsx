
import {
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import {
  LEAVE_STATUS_BADGE,
  STATE_META,
} from '../../utils/hrFormat';

/* -------------------------------------------------------------------------- */
/* Status Badge                                                               */
/* -------------------------------------------------------------------------- */

export const StatusBadge = ({
  state,
  label,
}) => {
  const badgeClass =
    STATE_META[state]?.badge ||
    LEAVE_STATUS_BADGE[state] ||
    'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200';

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-2
        whitespace-nowrap
        rounded-full
        px-3 py-1.5
        text-[11px]
        font-bold
        leading-none
        tracking-wide
        shadow-sm
        ring-1
        ring-inset
        transition-all
        duration-200
        hover:shadow
        ${badgeClass}
      `}
    >
      {/* Status dot */}
      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
        <span className="absolute h-2.5 w-2.5 rounded-full bg-current opacity-10" />

        <span className="relative h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      </span>

      <span>
        {label || state}
      </span>
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Toast                                                                       */
/* -------------------------------------------------------------------------- */

export const Toast = ({
  toast,
}) => {
  if (!toast) return null;

  const isSuccess =
    toast.type === 'success';

  const config = isSuccess
    ? {
        title: 'Success',
        Icon: CheckCircle2,
        accent: 'bg-emerald-500',
        accentSoft:
          'bg-emerald-50',
        iconColor:
          'text-emerald-600',
        iconRing:
          'ring-emerald-100',
        border:
          'border-emerald-100',
        shadow:
          'shadow-[0_20px_60px_rgba(16,185,129,0.14)]',
      }
    : {
        title: 'Something went wrong',
        Icon: XCircle,
        accent: 'bg-red-500',
        accentSoft:
          'bg-red-50',
        iconColor:
          'text-red-600',
        iconRing:
          'ring-red-100',
        border:
          'border-red-100',
        shadow:
          'shadow-[0_20px_60px_rgba(239,68,68,0.14)]',
      };

  const {
    title,
    Icon,
    accent,
    accentSoft,
    iconColor,
    iconRing,
    border,
    shadow,
  } = config;

  return (
    <div
      className="
        fixed
        right-4
        top-4
        z-[9999]
        w-[calc(100%-2rem)]
        max-w-[430px]
        sm:right-6
        sm:top-6
      "
      role="status"
      aria-live="polite"
    >
      <div
        className={`
          relative
          overflow-hidden
          rounded-2xl
          border
          bg-white
          ${border}
          ${shadow}
        `}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Top Accent                                                        */}
        {/* ---------------------------------------------------------------- */}

        <div
          className={`
            absolute
            inset-x-0
            top-0
            h-1
            ${accent}
          `}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Toast Content                                                     */}
        {/* ---------------------------------------------------------------- */}

        <div className="flex items-start gap-4 px-4 py-4 sm:px-5 sm:py-5">
          {/* Icon */}
          <div
            className={`
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              ${accentSoft}
              ${iconColor}
              ring-1
              ring-inset
              ${iconRing}
            `}
          >
            <Icon
              size={22}
              strokeWidth={2.2}
            />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold tracking-tight text-slate-950">
                {title}
              </p>

              <span
                className={`
                  h-1.5
                  w-1.5
                  shrink-0
                  rounded-full
                  ${accent}
                `}
              />
            </div>

            <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
              {toast.message}
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Bottom Progress                                                   */}
        {/* ---------------------------------------------------------------- */}

        <div className="h-0.5 w-full bg-slate-100">
          <div
            className={`
              h-full
              w-full
              origin-left
              ${accent}
              animate-[toastProgress_4s_linear_forwards]
            `}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Toast Animation                                                     */}
      {/* ------------------------------------------------------------------ */}

      <style>
        {`
          @keyframes toastProgress {
            from {
              transform: scaleX(1);
            }

            to {
              transform: scaleX(0);
            }
          }
        `}
      </style>
    </div>
  );
};
