import React, { useContext, useEffect, useState } from 'react';
import {
  CalendarDays,
  MapPin,
  Clock,
  Building,
  X,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { AppContext } from '../../context/AppContext';

/* =========================================================
   DATE FORMAT
========================================================= */

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

/* =========================================================
   EVENT CARD
========================================================= */

const EventCard = ({ item, active, onOpen }) => {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`
        group
        w-full
        text-left
        rounded-2xl
        border
        bg-white
        p-5
        transition-all
        duration-300
        focus:outline-none
        focus:ring-2
        focus:ring-indigo-400
        ${
          active
            ? 'border-indigo-200 shadow-xl shadow-indigo-100/60'
            : 'border-gray-200 shadow-sm hover:-translate-y-1 hover:shadow-lg'
        }
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">

          {/* TYPE */}
          <div className="mb-3 flex items-center gap-2">
            <span
              className={`
                rounded-full
                px-2.5
                py-1
                text-[9px]
                font-extrabold
                uppercase
                tracking-wider
                ${
                  item.itemType === 'camp'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-purple-50 text-purple-700'
                }
              `}
            >
              {item.itemType === 'camp'
                ? 'Medical Camp'
                : item.eventType || 'Event'}
            </span>

            {active && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-green-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                LIVE
              </span>
            )}
          </div>

          {/* TITLE */}
          <h3 className="line-clamp-2 font-extrabold leading-snug text-gray-900 transition-colors group-hover:text-indigo-600">
            {item.title}
          </h3>

          {/* ORGANIZATION */}
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <Building size={13} />
            <span className="truncate">
              {item.orgName || 'Organization'}
            </span>
          </p>

          {/* DETAILS */}
          <div className="mt-4 space-y-2 text-xs text-gray-500">
            <p className="flex items-center gap-2">
              <CalendarDays
                size={14}
                className="shrink-0 text-indigo-500"
              />

              <span>
                {formatDate(item.date)}
                {item.time ? ` · ${item.time}` : ''}
              </span>
            </p>

            <p className="flex items-center gap-2">
              <MapPin
                size={14}
                className="shrink-0 text-indigo-500"
              />

              <span className="truncate">
                {item.location || 'Location not available'}
              </span>
            </p>
          </div>
        </div>

        {/* ARROW */}
        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            transition-all
            duration-300
            ${
              active
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
            }
          `}
        >
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </button>
  );
};

/* =========================================================
   DETAIL MODAL
========================================================= */

const DetailModal = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[95]
        flex
        items-center
        justify-center
        bg-black/50
        p-4
        backdrop-blur-sm
        animate-[fadeIn_250ms_ease-out]
      "
      onClick={onClose}
    >
      <div
        className="
          relative
          w-full
          max-w-lg
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
          animate-[slideUp_350ms_cubic-bezier(0.16,1,0.3,1)]
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* IMAGE */}
        {item.imageUrl && (
          <div className="h-44 w-full overflow-hidden bg-gray-100">
            <img
              src={item.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* CLOSE */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="
            absolute
            right-3
            top-3
            rounded-full
            bg-white/90
            p-1.5
            text-gray-600
            shadow
            transition
            hover:bg-white
          "
        >
          <X size={18} />
        </button>

        <div className="p-6">

          {/* TYPE */}
          <span
            className={`
              rounded-full
              px-2
              py-0.5
              text-[10px]
              font-bold
              uppercase
              ${
                item.itemType === 'camp'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }
            `}
          >
            {item.itemType === 'camp'
              ? 'Medical Camp'
              : item.eventType || 'Event'}
          </span>

          {/* TITLE */}
          <h3 className="mt-2 text-xl font-bold text-black">
            {item.title}
          </h3>

          {/* ORGANIZATION */}
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
            <Building size={14} />
            {item.orgName || 'Organization'}
          </p>

          {/* EVENT INFO */}
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <CalendarDays size={15} />
              {formatDate(item.date)}
            </p>

            {item.time && (
              <p className="flex items-center gap-2">
                <Clock size={15} />
                {item.time}
              </p>
            )}

            <p className="flex items-center gap-2">
              <MapPin size={15} />
              {item.location || 'Location not available'}
            </p>
          </div>

          {/* DESCRIPTION */}
          {item.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   PUBLIC EVENTS SECTION
========================================================= */

const PublicEventsSection = () => {
  const { getPublicEventsAndCamps } = useContext(AppContext);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  /* =======================================================
     FETCH EVENTS
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setLoading(true);
      setError(false);

      try {
        const res = await getPublicEventsAndCamps();

        if (cancelled) return;

        if (res?.success) {
          setItems(Array.isArray(res.items) ? res.items : []);
        } else {
          setItems([]);
          setError(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            'Failed to load public events/camps:',
            err
          );

          setItems([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <section
        id="events-camps"
        className="
          relative
          overflow-hidden
          scroll-mt-24
          border-t
          border-gray-200
          bg-white
          px-[5%]
          py-20
          md:py-24
        "
      >

        {/* BACKGROUND GLOW */}

        <div className="pointer-events-none absolute inset-0">
          <div
            className="
              absolute
              left-[5%]
              top-24
              h-64
              w-64
              rounded-full
              bg-indigo-100/40
              blur-3xl
            "
          />

          <div
            className="
              absolute
              bottom-10
              right-[5%]
              h-72
              w-72
              rounded-full
              bg-blue-100/40
              blur-3xl
            "
          />
        </div>

        <div
          className="
            relative
            mx-auto
            grid
            max-w-7xl
            grid-cols-1
            items-center
            gap-14
            lg:grid-cols-2
            lg:gap-20
          "
        >

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div className="max-w-xl">

            {/* BADGE */}

            <div
              className="
                mb-6
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-indigo-200
                bg-indigo-50
                px-4
                py-2
                text-sm
                font-semibold
                text-indigo-600
              "
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className="
                    absolute
                    inline-flex
                    h-full
                    w-full
                    animate-ping
                    rounded-full
                    bg-indigo-400
                    opacity-75
                  "
                />

                <span
                  className="
                    relative
                    inline-flex
                    h-2.5
                    w-2.5
                    rounded-full
                    bg-indigo-500
                  "
                />
              </span>

              Happening Soon
            </div>

            {/* HEADING */}

            <h2
              className="
                text-[2rem]
                font-extrabold
                leading-[1.12]
                tracking-tight
                text-gray-900
                sm:text-[2.5rem]
                md:text-[3rem]
              "
            >
              Upcoming Camps
              <br />

              <span className="text-indigo-600">
                &amp; Events
              </span>
            </h2>

            {/* DESCRIPTION */}

            <p
              className="
                mt-6
                max-w-lg
                text-base
                leading-8
                text-gray-600
                md:text-lg
              "
            >
              A live look at medical camps and community events
              from organizations using WorkSphere. Discover dates,
              locations, and the organizations behind every event.
            </p>

            {/* STATS */}

            <div
              className="
                mt-10
                flex
                flex-wrap
                gap-8
                border-t
                border-gray-200
                pt-8
              "
            >
              <div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {loading ? '—' : `${items.length}+`}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Upcoming Events
                </p>
              </div>

              <div>
                <p className="text-2xl font-extrabold text-gray-900">
                  Live
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Public Updates
                </p>
              </div>

              <div>
                <p className="text-2xl font-extrabold text-gray-900">
                  Verified
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Admin Approved
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              RIGHT SIDE — APP SCREEN
          ================================================= */}

          <div className="relative mx-auto w-full max-w-[570px]">

            {/* BROWSER */}

            <div
              className="
                relative
                overflow-hidden
                rounded-[28px]
                border
                border-gray-200
                bg-gray-50
                shadow-[0_30px_80px_-25px_rgba(0,0,0,0.25)]
              "
            >

              {/* BROWSER BAR */}

              <div
                className="
                  flex
                  h-14
                  items-center
                  gap-3
                  border-b
                  border-gray-200
                  bg-white
                  px-5
                "
              >
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                </div>

                <div className="ml-2 flex-1 rounded-lg bg-gray-100 px-4 py-2">
                  <span className="text-[11px] text-gray-400">
                    WorkSphere.org/events
                  </span>
                </div>
              </div>

              {/* APP HEADER */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-gray-200
                  bg-white
                  px-6
                  py-5
                "
              >
                <div>
                  <p
                    className="
                      text-[10px]
                      font-extrabold
                      uppercase
                      tracking-widest
                      text-indigo-600
                    "
                  >
                    WorkSphere
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold text-gray-900">
                    Upcoming Events & Camps
                  </h3>
                </div>

                <div className="rounded-xl bg-indigo-50 p-2.5">
                  <CalendarDays
                    size={20}
                    className="text-indigo-600"
                  />
                </div>
              </div>

              {/* =================================================
                  EVENT FEED
              ================================================= */}

              <div
                className="
                  relative
                  h-[385px]
                  overflow-hidden
                  px-5
                "
              >

                {/* TOP FADE */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    left-0
                    right-0
                    top-0
                    z-20
                    h-24
                    bg-gradient-to-b
                    from-gray-50
                    via-gray-50/90
                    to-transparent
                  "
                />

                {/* BOTTOM FADE */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    bottom-0
                    left-0
                    right-0
                    z-20
                    h-24
                    bg-gradient-to-t
                    from-gray-50
                    via-gray-50/90
                    to-transparent
                  "
                />

                {/* LOADING */}

                {loading ? (
                  <div className="space-y-4 py-5">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="
                          h-28
                          rounded-2xl
                          bg-gray-100
                          animate-pulse
                        "
                      />
                    ))}
                  </div>

                ) : items.length > 0 ? (

                  /* EVENTS */

                  <div className="events-vertical-wrapper">

                    {/* FIRST LIST */}

                    <div className="events-vertical-list">
                      {items.map((item, index) => (
                        <div
                          key={`first-${item.itemType}-${item.id}-${index}`}
                        >
                          <EventCard
                            item={item}
                            active={index === 0}
                            onOpen={setActiveItem}
                          />
                        </div>
                      ))}
                    </div>

                    {/* SECOND IDENTICAL LIST */}

                    <div
                      className="events-vertical-list"
                      aria-hidden="true"
                    >
                      {items.map((item, index) => (
                        <div
                          key={`second-${item.itemType}-${item.id}-${index}`}
                        >
                          <EventCard
                            item={item}
                            active={index === 0}
                            onOpen={setActiveItem}
                          />
                        </div>
                      ))}
                    </div>

                  </div>

                ) : (

                  /* EMPTY / ERROR STATE */

                  <div className="flex h-full items-center justify-center px-6">
                    <div className="max-w-sm text-center">

                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                        <CalendarDays
                          size={25}
                          className="text-indigo-600"
                        />
                      </div>

                      <h4 className="mt-4 text-base font-bold text-gray-900">
                        {error
                          ? 'Events temporarily unavailable'
                          : 'No upcoming events yet'}
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        {error
                          ? 'We could not load the public events right now. Please check again shortly.'
                          : 'New camps and community events will appear here when they are published.'}
                      </p>

                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-t
                  border-gray-200
                  bg-white
                  px-6
                  py-4
                "
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`
                      h-2
                      w-2
                      rounded-full
                      ${
                        error
                          ? 'bg-orange-400'
                          : 'animate-pulse bg-green-500'
                      }
                    `}
                  />

                  <span className="text-xs font-semibold text-gray-500">
                    {error
                      ? 'Feed unavailable'
                      : 'Public events/Camps'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                  Live feed
                  <ExternalLink size={12} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            ANIMATIONS
        ================================================= */}

        <style>{`

          @keyframes verticalEvents {
            0% {
              transform: translate3d(0, 0, 0);
            }

            100% {
              transform: translate3d(0, -50%, 0);
            }
          }

          .events-vertical-wrapper {
            display: flex;
            flex-direction: column;

            animation-name: verticalEvents;
            animation-duration: 10s;
            animation-timing-function: linear;
            animation-iteration-count: infinite;

            will-change: transform;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
          }

          .events-vertical-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding-top: 20px;
            padding-bottom: 20px;
            box-sizing: border-box;
          }

          .events-vertical-wrapper:hover {
            animation-play-state: paused;
          }

          .events-vertical-wrapper,
          .events-vertical-list {
            -webkit-transform: translateZ(0);
            -webkit-backface-visibility: hidden;
          }

          @media (prefers-reduced-motion: reduce) {
            .events-vertical-wrapper {
              animation: none;
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(35px) scale(0.97);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

        `}</style>
      </section>

      {/* DETAIL MODAL */}

      <DetailModal
        item={activeItem}
        onClose={() => setActiveItem(null)}
      />
    </>
  );
};

export default PublicEventsSection;
