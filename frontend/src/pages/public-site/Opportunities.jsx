import React, { useContext, useEffect, useMemo, useState } from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import { AppContext } from '../../context/AppContext';
import Input from '../../shared/Input/Input';
import Button from '../../shared/Button/Button';
import {
  Search, MapPin, Calendar, Building, ExternalLink, X, CheckCircle2, Briefcase
} from 'lucide-react';

const TYPE_FILTERS = ['All', 'Job', 'Internship', 'Fellowship', 'Scholarship', 'Volunteer', 'Training', 'Other'];

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

// Simple inline "Apply Now" form for opportunities without an external
// application_link. Rendered inside the detail panel.
const ApplyForm = ({ opportunity, onApply }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', coverNote: '', resumeUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

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
    if (res.success) setDone(true);
    else setError(res.error || 'Could not submit your application.');
  };

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="inline-flex p-3 rounded-full bg-green-100 text-green-600 mb-3">
          <CheckCircle2 size={26} />
        </div>
        <p className="font-bold text-black">Application submitted!</p>
        <p className="text-sm text-gray-600 mt-1">A confirmation has been sent to your email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input label="Full Name" name="name" value={form.name} onChange={handleChange} required />
      <Input label="Email" type="email" name="email" value={form.email} onChange={handleChange} required />
      <Input label="Phone (optional)" name="phone" value={form.phone} onChange={handleChange} />
      <Input label="Cover Note (optional)" type="textarea" rows={3} name="coverNote" value={form.coverNote} onChange={handleChange} />
      <Input label="Resume/CV Link (optional)" name="resumeUrl" value={form.resumeUrl} onChange={handleChange} placeholder="https://..." />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" fullWidth disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Application'}
      </Button>
    </form>
  );
};

const OpportunityDetail = ({ opportunity, onClose, onApply }) => {
  if (!opportunity) return null;
  const deadline = formatDate(opportunity.applicationDeadline);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {opportunity.imageUrl && (
          <div className="h-40 w-full overflow-hidden bg-gray-100">
            <img src={opportunity.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-600 rounded-full p-1.5 shadow">
          <X size={18} />
        </button>

        <div className="p-6">
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            {opportunity.opportunityType}
          </span>
          <h2 className="text-2xl font-bold text-black mt-2">{opportunity.title}</h2>
          <p className="text-sm text-indigo-600 font-semibold mt-1 flex items-center gap-1.5">
            <Building size={14} /> {opportunity.orgName}
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-4">
            {opportunity.location && (
              <span className="flex items-center gap-1.5"><MapPin size={14} /> {opportunity.location} · {opportunity.remoteStatus}</span>
            )}
            {deadline && <span className="flex items-center gap-1.5"><Calendar size={14} /> Apply by {deadline}</span>}
          </div>

          {opportunity.description && (
            <div className="mt-5">
              <h4 className="font-bold text-black text-sm mb-1">About this opportunity</h4>
              <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">{opportunity.description}</p>
            </div>
          )}
          {opportunity.eligibility && (
            <div className="mt-4">
              <h4 className="font-bold text-black text-sm mb-1">Eligibility</h4>
              <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">{opportunity.eligibility}</p>
            </div>
          )}
          {opportunity.requirements && (
            <div className="mt-4">
              <h4 className="font-bold text-black text-sm mb-1">Requirements</h4>
              <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">{opportunity.requirements}</p>
            </div>
          )}
          {opportunity.applicationInstructions && (
            <div className="mt-4">
              <h4 className="font-bold text-black text-sm mb-1">How to Apply</h4>
              <p className="text-sm text-gray-700 leading-6 whitespace-pre-wrap">{opportunity.applicationInstructions}</p>
            </div>
          )}
          {opportunity.contactInfo && (
            <p className="text-xs text-gray-500 mt-4">Contact: {opportunity.contactInfo}</p>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            {opportunity.applicationLink ? (
              <a
                href={opportunity.applicationLink}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition"
              >
                Apply Now <ExternalLink size={16} />
              </a>
            ) : (
              <ApplyForm opportunity={opportunity} onApply={onApply} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const OpportunityCard = ({ opportunity, onOpen }) => {
  const deadline = formatDate(opportunity.applicationDeadline);
  return (
    <button
      onClick={() => onOpen(opportunity)}
      className="text-left bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {opportunity.imageUrl && (
        <div className="h-28 w-full overflow-hidden bg-gray-100">
          <img src={opportunity.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-5">
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
          {opportunity.opportunityType}
        </span>
        <h3 className="font-bold text-gray-900 mt-2 leading-snug line-clamp-2">{opportunity.title}</h3>
        <p className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
          <Building size={12} /> {opportunity.orgName}
        </p>
        <div className="mt-3 space-y-1 text-xs text-gray-500">
          {opportunity.location && (
            <p className="flex items-center gap-1.5"><MapPin size={12} /> {opportunity.location} · {opportunity.remoteStatus}</p>
          )}
          {deadline && <p className="flex items-center gap-1.5"><Calendar size={12} /> Apply by {deadline}</p>}
        </div>
      </div>
    </button>
  );
};

const OpportunitiesPage = () => {
  const { getPublicOpportunities, applyToOpportunity } = useContext(AppContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await getPublicOpportunities();
      if (res.success) setItems(res.opportunities || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((o) => typeFilter === 'All' || o.opportunityType === typeFilter)
      .filter((o) =>
        o.title.toLowerCase().includes(search.toLowerCase()) ||
        (o.orgName || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.location || '').toLowerCase().includes(search.toLowerCase())
      );
  }, [items, typeFilter, search]);

  return (
    <PublicLayout>
      <section className="px-[5%] py-14 md:py-20 max-w-6xl mx-auto">

        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 mb-5">
            <Briefcase size={16} /> Opportunities
          </div>
          <h1 className="text-[1.8rem] sm:text-[2.2rem] font-bold text-gray-900 mb-3">
            Jobs, Internships &amp; Volunteer Roles
          </h1>
          <p className="text-gray-600 leading-7">
            Opportunities published by organizations using CampOS — browse, search, and apply directly.
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex items-center gap-3 flex-1 border border-gray-300 rounded-lg px-4 py-3 bg-white">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, organization, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full outline-none text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No opportunities match your search right now. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} onOpen={setActiveItem} />
            ))}
          </div>
        )}
      </section>

      <OpportunityDetail opportunity={activeItem} onClose={() => setActiveItem(null)} onApply={applyToOpportunity} />
    </PublicLayout>
  );
};

export default OpportunitiesPage;
