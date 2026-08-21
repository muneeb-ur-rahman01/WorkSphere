import React, { useEffect, useState } from 'react';
import { Clock3, AlertTriangle, CheckCircle2 } from 'lucide-react';

const getTimeLeft = (targetDate) => {
  if (!targetDate) return null;

  const diff = new Date(targetDate).getTime() - Date.now();

  if (Number.isNaN(diff)) return null;

  const clamped = Math.max(diff, 0);

  return {
    diff,
    days: Math.floor(clamped / 86400000),
    hours: Math.floor((clamped / 3600000) % 24),
    minutes: Math.floor((clamped / 60000) % 60),
    seconds: Math.floor((clamped / 1000) % 60),
    expired: diff <= 0,
  };
};

const pad = (n) => String(n).padStart(2, '0');

const CountdownTimer = ({
  targetDate,
  label = 'Payment due in',
  amountLabel,
  compact = false,
}) => {
  const [timeLeft, setTimeLeft] = useState(() =>
    getTimeLeft(targetDate)
  );

  useEffect(() => {
    setTimeLeft(getTimeLeft(targetDate));

    if (!targetDate) return;

    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate || !timeLeft) return null;

  const urgent = !timeLeft.expired && timeLeft.days < 3;

  /*
   * ============================================
   * COMPACT
   * ============================================
   */

  if (compact) {
    return (
      <div className="relative overflow-w-hidden w-full rounded-[20px] bg-white border border-[#e8eaf0] shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-[20px_22px]">
        {/* Accent */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-[3px] ${
            urgent ? 'bg-red-500' : 'bg-indigo-500'
          }`}
        />

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-[7px]">
              <span
                className={`w-[6px] h-[6px] rounded-full ${
                  urgent ? 'bg-red-500' : 'bg-green-500'
                }`}
              />
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-gray-400">
                {label}
              </span>
            </div>

            {amountLabel && (
              <div className="mt-[5px] text-[12px] text-gray-500">
                {amountLabel}
              </div>
            )}
          </div>

          <div
            className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center ${
              urgent ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            {timeLeft.expired ? (
              <AlertTriangle size={17} />
            ) : (
              <Clock3 size={17} />
            )}
          </div>
        </div>

        {timeLeft.expired ? (
          <div className="mt-[18px] text-[26px] font-extrabold text-red-600">
            Overdue
          </div>
        ) : (
          <div className="flex items-baseline mt-[20px]">
            <span
              className={`font-mono text-[36px] leading-none font-extrabold tracking-[-2px] ${
                urgent ? 'text-red-600' : 'text-gray-900'
              }`}
            >
              {timeLeft.days}
            </span>

            <span className="ml-[8px] text-[10px] font-bold tracking-[0.14em] uppercase text-gray-400">
              days
            </span>

            <span className="ml-[14px] font-mono text-[16px] font-bold text-gray-700">
              {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </span>
          </div>
        )}
      </div>
    );
  }

  /*
   * ============================================
   * FULL MODERN VERSION (Image Style Match)
   * ============================================
   */

  return (
    <div className="relative w-full overflow-hidden rounded-[24px] bg-white border border-[#e7e9ef] shadow-[0_12px_40px_rgba(15,23,42,0.07)]">
      {/* Top accent */}
      <div
        className={`h-[4px] w-full ${
          urgent
            ? 'bg-gradient-to-r from-red-500 to-orange-500'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600'
        }`}
      />

      <div className="p-[28px_30px_24px]">
        {/* ================= HEADER ================= */}

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-[7px] h-[7px] rounded-full ${
                  urgent
                    ? 'bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.10)]'
                    : 'bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.10)]'
                }`}
              />

              <span className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-gray-400">
                {timeLeft.expired ? 'Payment status' : 'Live countdown'}
              </span>
            </div>

            <h3 className="mt-2 text-[19px] leading-tight font-extrabold tracking-[-0.02em] text-gray-900">
              {timeLeft.expired ? 'Payment overdue' : label}
            </h3>

            {amountLabel && (
              <p className="mt-[6px] text-[12px] text-gray-500">
                {amountLabel}
              </p>
            )}
          </div>

          {/* Icon */}
          <div
            className={`w-[42px] h-[42px] rounded-[14px] flex items-center justify-center ${
              urgent ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            {timeLeft.expired ? (
              <AlertTriangle size={19} />
            ) : (
              <Clock3 size={19} />
            )}
          </div>
        </div>

        {timeLeft.expired ? (
          /* ================= EXPIRED ================= */

          <div className="mt-7 p-[18px_20px] rounded-[16px] bg-[#fff5f5] border border-red-100 flex items-center gap-[14px]">
            <AlertTriangle size={20} className="text-red-600" />
            <div>
              <div className="text-[14px] font-bold text-red-700">
                Payment deadline has passed
              </div>
              <div className="mt-[3px] text-[12px] text-red-500">
                Please complete the payment as soon as possible.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ================= COUNTDOWN (Image Match Style) ================= */}

            <div className="mt-9 flex flex-col items-center justify-center">
              {/* Numbers Row */}
              <div className="flex items-center justify-center font-mono font-extrabold text-[#e53958] text-[42px] sm:text-[56px] tracking-tight gap-2 sm:gap-4">
                <span>{pad(timeLeft.days)}</span>
                <span className="text-[#e53958] font-normal">:</span>
                <span>{pad(timeLeft.hours)}</span>
                <span className="text-[#e53958] font-normal">:</span>
                <span>{pad(timeLeft.minutes)}</span>
                <span className="text-[#e53958] font-normal">:</span>
                <span>{pad(timeLeft.seconds)}</span>
              </div>

              {/* Labels Row aligned correspondingly */}
              <div className="w-full max-w-[450px] grid grid-cols-4 text-center mt-2 text-[10px] sm:text-[11px] font-bold tracking-[0.14em] text-gray-400 uppercase">
                <div>Days</div>
                <div>Hours</div>
                <div>Minutes</div>
                <div>Seconds</div>
              </div>
            </div>

            {/* ================= BOTTOM ================= */}

            <div className="mt-[30px] pt-[17px] border-t border-[#f0f1f4] flex items-center justify-between">
              <div className="flex items-center gap-[7px] text-gray-400 text-[11px] font-semibold">
                <CheckCircle2
                  size={14}
                  className={urgent ? 'text-red-500' : 'text-green-500'}
                />
                {urgent ? 'Payment due soon' : 'Countdown is active'}
              </div>

              <div
                className={`py-[6px] px-[10px] rounded-full text-[9px] font-extrabold tracking-[0.1em] uppercase ${
                  urgent ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                }`}
              >
                {urgent ? 'Due soon' : 'On track'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CountdownTimer;