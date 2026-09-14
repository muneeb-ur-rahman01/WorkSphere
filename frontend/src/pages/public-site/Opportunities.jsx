import React, { useContext, useEffect, useMemo, useState } from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import { AppContext } from '../../context/AppContext';
import {
  Search,
  MapPin,
  Calendar,
  Building,
  ExternalLink,
  X,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';

const TYPE_FILTERS = [
  'All',
  'Job',
  'Internship',
  'Fellowship',
  'Scholarship',
  'Volunteer',
  'Training',
  'Other',
];

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

// Simple inline "Apply Now" form for opportunities without an external
// application_link. Rendered inside the detail panel.
const ApplyForm = ({ opportunity, onApply }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    coverNote: '',
    resumeUrl: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    const res = await onApply(opportunity.id, form);

    setSubmitting(false);

    if (res.success) {
      setDone(true);
    } else {
      setError(res.error || 'Could not submit your application.');
    }
  };

  if (done) {
    return (
      <div className="py-6 text-center">
        <div className="inline-flex p-3 mb-3 text-green-600 bg-green-100 rounded-full">
          <CheckCircle2 size={26} />
        </div>

        <p className="font-bold text-black">
          Application submitted!
        </p>

        <p className="mt-1 text-sm text-gray-600">
          A confirmation has been sent to your email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full Name */}
      <div>
        <label
          htmlFor="name"
          className="block mb-1.5 text-sm font-medium text-gray-700"
        >
          Full Name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block mb-1.5 text-sm font-medium text-gray-700"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="phone"
          className="block mb-1.5 text-sm font-medium text-gray-700"
        >
          Phone (optional)
        </label>

        <input
          id="phone"
          name="phone"
          type="text"
          value={form.phone}
          onChange={handleChange}
          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Cover Note */}
      <div>
        <label
          htmlFor="coverNote"
          className="block mb-1.5 text-sm font-medium text-gray-700"
        >
          Cover Note (optional)
        </label>

        <textarea
          id="coverNote"
          name="coverNote"
          rows={3}
          value={form.coverNote}
          onChange={handleChange}
          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg outline-none resize-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Resume URL */}
      <div>
        <label
          htmlFor="resumeUrl"
          className="block mb-1.5 text-sm font-medium text-gray-700"
        >
          Resume/CV Link (optional)
        </label>

        <input
          id="resumeUrl"
          name="resumeUrl"
          type="url"
          value={form.resumeUrl}
          onChange={handleChange}
          placeholder="https://..."
          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-4 py-3 font-bold text-white transition bg-indigo-600 rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
};

const OpportunityDetail = ({
  opportunity,
  onClose,
  onApply,
}) => {
  if (!opportunity) return null;

  const deadline = formatDate(opportunity.applicationDeadline);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        {opportunity.imageUrl && (
          <div className="w-full h-40 overflow-hidden bg-gray-100">
            <img
              src={opportunity.imageUrl}
              alt=""
              className="object-cover w-full h-full"
            />
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute p-1.5 text-gray-600 transition bg-white/90 rounded-full shadow top-3 right-3 hover:bg-white"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          {/* Type */}
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-100 text-indigo-700">
            {opportunity.opportunityType}
          </span>

          {/* Title */}
          <h2 className="mt-2 text-2xl font-bold text-black">
            {opportunity.title}
          </h2>

          {/* Organization */}
          <p className="flex items-center gap-1.5 mt-1 text-sm font-semibold text-indigo-600">
            <Building size={14} />
            {opportunity.orgName}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            {opportunity.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {opportunity.location} · {opportunity.remoteStatus}
              </span>
            )}

            {deadline && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                Apply by {deadline}
              </span>
            )}
          </div>

          {/* Description */}
          {opportunity.description && (
            <div className="mt-5">
              <h4 className="mb-1 text-sm font-bold text-black">
                About this opportunity
              </h4>

              <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                {opportunity.description}
              </p>
            </div>
          )}

          {/* Eligibility */}
          {opportunity.eligibility && (
            <div className="mt-4">
              <h4 className="mb-1 text-sm font-bold text-black">
                Eligibility
              </h4>

              <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                {opportunity.eligibility}
              </p>
            </div>
          )}

          {/* Requirements */}
          {opportunity.requirements && (
            <div className="mt-4">
              <h4 className="mb-1 text-sm font-bold text-black">
                Requirements
              </h4>

              <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                {opportunity.requirements}
              </p>
            </div>
          )}

          {/* Application Instructions */}
          {opportunity.applicationInstructions && (
            <div className="mt-4">
              <h4 className="mb-1 text-sm font-bold text-black">
                How to Apply
              </h4>

              <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                {opportunity.applicationInstructions}
              </p>
            </div>
          )}

          {/* Contact */}
          {opportunity.contactInfo && (
            <p className="mt-4 text-xs text-gray-500">
              Contact: {opportunity.contactInfo}
            </p>
          )}

          {/* Application */}
          <div className="pt-6 mt-6 border-t border-gray-200">
            {opportunity.applicationLink ? (
              <a
                href={opportunity.applicationLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-full gap-2 py-3 font-bold text-white transition bg-indigo-600 rounded-xl shadow-md hover:bg-indigo-700"
              >
                Apply Now
                <ExternalLink size={16} />
              </a>
            ) : (
              <ApplyForm
                opportunity={opportunity}
                onApply={onApply}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const OpportunityCard = ({
  opportunity,
  onOpen,
}) => {
  const deadline = formatDate(
    opportunity.applicationDeadline
  );

  return (
    <button
      onClick={() => onOpen(opportunity)}
      className="overflow-hidden text-left transition-all duration-300 bg-white border border-gray-200 shadow-sm rounded-2xl hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {/* Image */}
      {opportunity.imageUrl && (
        <div className="w-full h-28 overflow-hidden bg-gray-100">
          <img
            src={opportunity.imageUrl}
            alt=""
            className="object-cover w-full h-full"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-5">
        {/* Type */}
        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-100 text-indigo-700">
          {opportunity.opportunityType}
        </span>

        {/* Title */}
        <h3 className="mt-2 font-bold leading-snug text-gray-900 line-clamp-2">
          {opportunity.title}
        </h3>

        {/* Organization */}
        <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-indigo-600">
          <Building size={12} />
          {opportunity.orgName}
        </p>

        {/* Details */}
        <div className="mt-3 space-y-1 text-xs text-gray-500">
          {opportunity.location && (
            <p className="flex items-center gap-1.5">
              <MapPin size={12} />
              {opportunity.location} · {opportunity.remoteStatus}
            </p>
          )}

          {deadline && (
            <p className="flex items-center gap-1.5">
              <Calendar size={12} />
              Apply by {deadline}
            </p>
          )}
        </div>
      </div>
    </button>
  );
};

const OpportunitiesPage = () => {
  const {
    getPublicOpportunities,
    applyToOpportunity,
  } = useContext(AppContext);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await getPublicOpportunities();

      if (res.success) {
        setItems(res.opportunities || []);
      }

      setLoading(false);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();

    return items
      .filter(
        (o) =>
          typeFilter === 'All' ||
          o.opportunityType === typeFilter
      )
      .filter(
        (o) =>
          o.title.toLowerCase().includes(query) ||
          (o.orgName || '').toLowerCase().includes(query) ||
          (o.location || '').toLowerCase().includes(query)
      );
  }, [items, typeFilter, search]);

  return (
    <PublicLayout>
      <section className="max-w-6xl px-[5%] py-14 mx-auto md:py-20">
        {/* Header */}
        <div className="max-w-2xl mx-auto mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-full bg-indigo-50">
            <Briefcase size={16} />
            Opportunities
          </div>

          <h1 className="mb-3 text-[1.8rem] font-bold text-gray-900 sm:text-[2.2rem]">
            Jobs, Internships &amp; Volunteer Roles
          </h1>

          <p className="leading-7 text-gray-600">
            Opportunities published by organizations using
            CampOS — browse, search, and apply directly.
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row">
          {/* Search */}
          <div className="flex items-center flex-1 gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg">
            <Search
              size={18}
              className="text-gray-400"
            />

            <input
              type="text"
              placeholder="Search by title, organization, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  typeFilter === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 bg-gray-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center text-gray-400">
            No opportunities match your search right now.
            Check back soon.
          </div>
        ) : (
          /* Opportunities */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onOpen={setActiveItem}
              />
            ))}
          </div>
        )}
      </section>

      {/* Detail Modal */}
      <OpportunityDetail
        opportunity={activeItem}
        onClose={() => setActiveItem(null)}
        onApply={applyToOpportunity}
      />
    </PublicLayout>
  );
};

export default OpportunitiesPage;