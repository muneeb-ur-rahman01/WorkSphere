import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';

import {
  Briefcase,
  Plus,
  MapPin,
  Trash2,
  Pencil,
  Calendar,
  Eye,
  EyeOff,
  Users,
  ExternalLink,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Award,
  Clock3,
  FileText,
  Mail,
  Sparkles,
  X,
} from 'lucide-react';

const OPPORTUNITY_TYPES = [
  'Job',
  'Internship',
  'Fellowship',
  'Scholarship',
  'Volunteer',
  'Training',
  'Other',
];

const REMOTE_STATUSES = ['Remote', 'OnSite', 'Hybrid'];

const EMPTY_FORM = {
  title: '',
  description: '',
  opportunityType: 'Job',
  eligibility: '',
  requirements: '',
  applicationDeadline: '',
  location: '',
  remoteStatus: 'OnSite',
  applicationInstructions: '',
  applicationLink: '',
  contactInfo: '',
  imageUrl: '',
};

const statusBadge = (status) => {
  switch (status) {
    case 'Published':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    case 'Draft':
      return 'bg-slate-100 text-slate-600 border-slate-200';

    case 'Unpublished':
      return 'bg-amber-50 text-amber-700 border-amber-200';

    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const typeIcon = (type) => {
  switch (type) {
    case 'Internship':
    case 'Scholarship':
      return <GraduationCap size={20} />;

    case 'Fellowship':
      return <Award size={20} />;

    case 'Volunteer':
      return <HeartHandshake size={20} />;

    default:
      return <Briefcase size={20} />;
  }
};

const Opportunities = () => {
  const {
    currentUser,
    opportunities,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    getOpportunityApplications,
  } = useContext(AppContext);

  // =====================================================
  // STATE
  // =====================================================

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [applicantsFor, setApplicantsFor] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // DELETE CONFIRMATION STATE
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // =====================================================
  // ROLE CHECK
  // =====================================================

  if (currentUser?.role !== 'OrgAdmin') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  const opportunityList = opportunities || [];

  // =====================================================
  // STATS
  // =====================================================

  const totalCount = opportunityList.length;

  const publishedCount = opportunityList.filter(
    (o) => o.status === 'Published'
  ).length;

  const draftCount = opportunityList.filter(
    (o) => o.status === 'Draft'
  ).length;

  const unpublishedCount = opportunityList.filter(
    (o) => o.status === 'Unpublished'
  ).length;

  // =====================================================
  // FORM HANDLERS
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (opp) => {
    setEditingId(opp.id);

    setForm({
      title: opp.title || '',
      description: opp.description || '',
      opportunityType: opp.opportunityType || 'Job',
      eligibility: opp.eligibility || '',
      requirements: opp.requirements || '',
      applicationDeadline: opp.applicationDeadline || '',
      location: opp.location || '',
      remoteStatus: opp.remoteStatus || 'OnSite',
      applicationInstructions:
        opp.applicationInstructions || '',
      applicationLink: opp.applicationLink || '',
      contactInfo: opp.contactInfo || '',
      imageUrl: opp.imageUrl || '',
    });

    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setFormError('Opportunity title is required.');
      return;
    }

    if (!form.description.trim()) {
      setFormError('Please add a description.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const res = editingId
        ? await updateOpportunity(editingId, form)
        : await createOpportunity(form);

      if (res?.success) {
        setModalOpen(false);
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
      } else {
        setFormError(
          res?.error || 'Could not save the opportunity.'
        );
      }
    } catch (error) {
      console.error('Opportunity save error:', error);
      setFormError(
        'Something went wrong. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = (opp) => {
    setOpportunityToDelete(opp);
    setDeleteModalOpen(true);
  };

  const cancelDelete = () => {
    if (deleting) return;

    setDeleteModalOpen(false);
    setOpportunityToDelete(null);
  };

  const confirmDelete = async () => {
    if (!opportunityToDelete || deleting) return;

    setDeleting(true);

    try {
      await deleteOpportunity(opportunityToDelete.id);
    } catch (error) {
      console.error('Opportunity delete error:', error);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setOpportunityToDelete(null);
    }
  };

  // =====================================================
  // PUBLISH / UNPUBLISH
  // =====================================================

  const togglePublish = async (opp) => {
    const nextStatus =
      opp.status === 'Published'
        ? 'Unpublished'
        : 'Published';

    await updateOpportunity(opp.id, {
      status: nextStatus,
    });
  };

  // =====================================================
  // APPLICANTS
  // =====================================================

  const openApplicants = async (opp) => {
    setApplicantsFor(opp);
    setApplicants([]);
    setLoadingApplicants(true);

    try {
      const res = await getOpportunityApplications(opp.id);

      setApplicants(
        res?.success
          ? res.applications || []
          : []
      );
    } catch (error) {
      console.error(
        'Failed to load applicants:',
        error
      );

      setApplicants([]);
    } finally {
      setLoadingApplicants(false);
    }
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <DashboardLayout>
      <div className="min-h-screen w-full bg-slate-50">

        {/* =================================================
            CONTENT
        ================================================== */}

        <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">

          {/* =================================================
              HEADER
          ================================================== */}

          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo-600">
                <Briefcase size={16} />
                Opportunity Management
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Opportunities
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
                Create and manage jobs, internships,
                fellowships, scholarships, volunteer roles
                and training programs.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="
                inline-flex
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-indigo-600
                px-5
                py-3
                text-sm
                font-bold
                text-white
                shadow-lg
                shadow-indigo-200
                transition-all
                hover:bg-indigo-700
                hover:shadow-xl
                active:scale-[0.98]
              "
            >
              <Plus size={18} />
              New Opportunity
            </button>

          </div>

          {/* =================================================
              STATS
          ================================================== */}

          <div className="mb-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              label="Total Opportunities"
              value={totalCount}
              icon={<Briefcase size={21} />}
              iconClass="bg-indigo-50 text-indigo-600"
            />

            <StatCard
              label="Published"
              value={publishedCount}
              icon={<Eye size={21} />}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <StatCard
              label="Drafts"
              value={draftCount}
              icon={<FileText size={21} />}
              iconClass="bg-slate-100 text-slate-600"
            />

            <StatCard
              label="Unpublished"
              value={unpublishedCount}
              icon={<EyeOff size={21} />}
              iconClass="bg-amber-50 text-amber-600"
            />

          </div>

          {/* =================================================
              OPPORTUNITY LIST
          ================================================== */}

          {totalCount === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <div
              className="
                grid
                w-full
                grid-cols-1
                gap-6
                xl:grid-cols-2
                2xl:grid-cols-3
              "
            >
              {opportunityList.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  onEdit={openEdit}
                  onTogglePublish={togglePublish}
                  onApplicants={openApplicants}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

        </div>

        {/* =================================================
            CREATE / EDIT MODAL
        ================================================== */}

        {modalOpen && (
          <div
            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              bg-slate-950/60
              p-4
              backdrop-blur-sm
            "
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeModal();
              }
            }}
          >

            <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">

                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
                    <Sparkles size={14} />

                    {editingId
                      ? 'Edit Opportunity'
                      : 'New Opportunity'}
                  </div>

                  <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                    {editingId
                      ? 'Update opportunity'
                      : 'Create new opportunity'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="
                    rounded-xl
                    p-2
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-700
                    disabled:opacity-50
                  "
                >
                  <X size={20} />
                </button>

              </div>

              {/* FORM */}

              <form
                onSubmit={handleSubmit}
                className="overflow-y-auto"
              >

                <div className="space-y-8 p-5 sm:p-6">

                  {/* INTRO */}

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">

                    <div className="flex gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
                        <Sparkles size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-indigo-900">
                          Create a clear and professional listing
                        </p>

                        <p className="mt-1 text-xs leading-5 text-indigo-700">
                          Provide enough information for applicants
                          to understand the opportunity and
                          application process.
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* BASIC */}

                  <FormSection
                    icon={<Briefcase size={17} />}
                    title="Basic Information"
                    description="General information about the opportunity."
                  >

                    <div className="space-y-4">

                      <Field
                        label="Opportunity Title"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="e.g. Community Health Coordinator"
                        required
                      />

                      <Field
                        label="Description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Describe the opportunity, responsibilities and organization..."
                        textarea
                        rows={4}
                      />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                        <SelectField
                          label="Opportunity Type"
                          name="opportunityType"
                          value={form.opportunityType}
                          onChange={handleChange}
                          options={OPPORTUNITY_TYPES}
                        />

                        <SelectField
                          label="Work Mode"
                          name="remoteStatus"
                          value={form.remoteStatus}
                          onChange={handleChange}
                          options={REMOTE_STATUSES}
                        />

                      </div>

                    </div>

                  </FormSection>

                  {/* LOCATION */}

                  <FormSection
                    icon={<MapPin size={17} />}
                    title="Location & Timeline"
                    description="Specify where the opportunity is based and when applications close."
                  >

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                      <Field
                        label="Location"
                        name="location"
                        value={form.location}
                        onChange={handleChange}
                        placeholder="e.g. Karachi, Pakistan"
                      />

                      <Field
                        label="Application Deadline"
                        name="applicationDeadline"
                        type="date"
                        value={form.applicationDeadline}
                        onChange={handleChange}
                      />

                    </div>

                  </FormSection>

                  {/* REQUIREMENTS */}

                  <FormSection
                    icon={<GraduationCap size={17} />}
                    title="Eligibility & Requirements"
                    description="Define who can apply and what applicants need."
                  >

                    <div className="space-y-4">

                      <Field
                        label="Eligibility Criteria"
                        name="eligibility"
                        value={form.eligibility}
                        onChange={handleChange}
                        placeholder="Who is eligible to apply?"
                        textarea
                        rows={3}
                      />

                      <Field
                        label="Requirements"
                        name="requirements"
                        value={form.requirements}
                        onChange={handleChange}
                        placeholder="Skills, education, experience or documents required..."
                        textarea
                        rows={3}
                      />

                    </div>

                  </FormSection>

                  {/* APPLICATION */}

                  <FormSection
                    icon={<FileText size={17} />}
                    title="Application Details"
                    description="Explain how candidates should submit their application."
                  >

                    <div className="space-y-4">

                      <Field
                        label="Application Instructions"
                        name="applicationInstructions"
                        value={form.applicationInstructions}
                        onChange={handleChange}
                        placeholder="Explain the application process..."
                        textarea
                        rows={3}
                      />

                      <Field
                        label="External Application Link"
                        name="applicationLink"
                        value={form.applicationLink}
                        onChange={handleChange}
                        placeholder="https://example.com/apply"
                      />

                      <Field
                        label="Contact Information"
                        name="contactInfo"
                        value={form.contactInfo}
                        onChange={handleChange}
                        placeholder="Email or phone number"
                      />

                    </div>

                  </FormSection>

                  {/* IMAGE */}

                  <FormSection
                    icon={<Globe2 size={17} />}
                    title="Image / Banner"
                    description="Optionally provide an image URL for this opportunity."
                  >

                    <Field
                      label="Image / Banner URL"
                      name="imageUrl"
                      value={form.imageUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/banner.jpg"
                    />

                  </FormSection>

                  {/* ERROR */}

                  {formError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-semibold text-red-600">
                        {formError}
                      </p>
                    </div>
                  )}

                </div>

                {/* FOOTER */}

                <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="
                      rounded-xl
                      border
                      border-slate-200
                      px-5
                      py-3
                      text-sm
                      font-bold
                      text-slate-600
                      transition
                      hover:bg-slate-50
                      disabled:opacity-50
                    "
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-indigo-600
                      px-6
                      py-3
                      text-sm
                      font-bold
                      text-white
                      shadow-lg
                      shadow-indigo-100
                      transition
                      hover:bg-indigo-700
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >

                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Saving...
                      </>
                    ) : editingId ? (
                      <>
                        <Pencil size={16} />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Plus size={17} />
                        Create Opportunity
                      </>
                    )}

                  </button>

                </div>

              </form>

            </div>
          </div>
        )}

        {/* =================================================
            DELETE CONFIRMATION MODAL
        ================================================== */}

        {deleteModalOpen && opportunityToDelete && (
          <div
            className="
              fixed
              inset-0
              z-[200]
              flex
              items-center
              justify-center
              bg-slate-950/60
              p-4
              backdrop-blur-sm
            "
            onMouseDown={(e) => {
              if (
                e.target === e.currentTarget &&
                !deleting
              ) {
                cancelDelete();
              }
            }}
          >

            <div
              className="
                w-full
                max-w-md
                rounded-2xl
                bg-white
                p-6
                shadow-2xl
              "
            >

              {/* DELETE ICON */}

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <Trash2
                  size={26}
                  className="text-red-600"
                />
              </div>

              {/* MESSAGE */}

              <div className="mt-5 text-center">

                <h2 className="text-xl font-extrabold text-slate-900">
                  Are you sure to delete this opportunity?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This will permanently remove{' '}
                  <span className="font-bold text-slate-700">
                    "{opportunityToDelete.title}"
                  </span>{' '}
                  and its applications.
                </p>

              </div>

              {/* BUTTONS */}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">

                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-5
                    py-3
                    text-sm
                    font-bold
                    text-slate-600
                    transition
                    hover:bg-slate-50
                    hover:text-slate-800
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-red-600
                    px-5
                    py-3
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    shadow-red-100
                    transition
                    hover:bg-red-700
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >

                  {deleting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete
                    </>
                  )}

                </button>

              </div>

            </div>

          </div>
        )}

        {/* =================================================
            APPLICANTS MODAL
        ================================================== */}

        {applicantsFor && (
          <div
            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              bg-slate-950/60
              p-4
              backdrop-blur-sm
            "
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setApplicantsFor(null);
              }
            }}
          >

            <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    Applications
                  </p>

                  <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                    {applicantsFor.title}
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={() => setApplicantsFor(null)}
                  className="
                    rounded-xl
                    p-2
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-700
                  "
                >
                  <X size={20} />
                </button>

              </div>

              <div className="overflow-y-auto p-5 sm:p-6">

                {loadingApplicants ? (
                  <div className="flex flex-col items-center justify-center py-12">

                    <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

                    <p className="mt-4 text-sm font-medium text-slate-500">
                      Loading applicants...
                    </p>

                  </div>
                ) : applicants.length === 0 ? (
                  <div className="py-12 text-center">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <Users size={24} />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-900">
                      No applications yet
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Applications will appear here when
                      candidates apply.
                    </p>

                  </div>
                ) : (
                  <div className="space-y-3">

                    {applicants.map((a) => (
                      <div
                        key={a.id}
                        className="
                          rounded-xl
                          border
                          border-slate-200
                          bg-white
                          p-4
                          transition
                          hover:border-indigo-200
                          hover:shadow-sm
                        "
                      >

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                          <div>

                            <p className="font-bold text-slate-900">
                              {a.name}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">

                              <span className="flex items-center gap-1">
                                <Mail size={12} />
                                {a.email}
                              </span>

                              {a.phone && (
                                <span>
                                  · {a.phone}
                                </span>
                              )}

                            </div>

                          </div>

                          {a.resumeUrl && (
                            <a
                              href={a.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="
                                inline-flex
                                items-center
                                justify-center
                                gap-1.5
                                rounded-lg
                                bg-indigo-50
                                px-3
                                py-2
                                text-xs
                                font-bold
                                text-indigo-600
                                transition
                                hover:bg-indigo-100
                              "
                            >
                              <ExternalLink size={13} />
                              View Resume
                            </a>
                          )}

                        </div>

                        {a.coverNote && (
                          <div className="mt-3 rounded-lg bg-slate-50 p-3">
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                              {a.coverNote}
                            </p>
                          </div>
                        )}

                        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">

                          <Clock3 size={12} />

                          {a.createdAt
                            ? new Date(
                                a.createdAt
                              ).toLocaleString('en-GB')
                            : 'Unknown date'}

                        </p>

                      </div>
                    ))}

                  </div>
                )}

              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const StatCard = ({
  label,
  value,
  icon,
  iconClass,
}) => {
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {value}
          </p>

        </div>

        <div className={`rounded-xl p-3 ${iconClass}`}>
          {icon}
        </div>

      </div>

    </div>
  );
};

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyState = ({ onCreate }) => {
  return (
    <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Briefcase size={28} />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        No opportunities yet
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Start building your organization's opportunity board
        by creating your first job, internship, volunteer role
        or training program.
      </p>

      <button
        type="button"
        onClick={onCreate}
        className="
          mt-6
          inline-flex
          items-center
          gap-2
          rounded-xl
          bg-indigo-600
          px-5
          py-3
          text-sm
          font-bold
          text-white
          transition
          hover:bg-indigo-700
        "
      >
        <Plus size={17} />
        Create Opportunity
      </button>

    </div>
  );
};

/* =========================================================
   OPPORTUNITY CARD
========================================================= */

const OpportunityCard = ({
  opp,
  onEdit,
  onTogglePublish,
  onApplicants,
  onDelete,
}) => {
  return (
    <div className="group w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

      <div className="border-b border-slate-100 p-6">

        <div className="flex items-start justify-between gap-4">

          <div className="flex min-w-0 gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              {typeIcon(opp.opportunityType)}
            </div>

            <div className="min-w-0">

              <div className="mb-2 flex flex-wrap gap-2">

                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">
                  {opp.opportunityType}
                </span>

                <span
                  className={`
                    rounded-full
                    border
                    px-2.5
                    py-1
                    text-[10px]
                    font-extrabold
                    ${statusBadge(opp.status)}
                  `}
                >
                  {opp.status}
                </span>

              </div>

              <h3 className="text-lg font-extrabold leading-snug text-slate-900">
                {opp.title}
              </h3>

            </div>

          </div>

        </div>

        {opp.description && (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
            {opp.description}
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-2.5 text-sm text-slate-500 sm:grid-cols-2">

          {opp.location && (
            <div className="flex items-center gap-2">
              <MapPin
                size={15}
                className="shrink-0 text-indigo-500"
              />

              <span className="truncate">
                {opp.location}
              </span>
            </div>
          )}

          {opp.remoteStatus && (
            <div className="flex items-center gap-2">
              <Globe2
                size={15}
                className="shrink-0 text-indigo-500"
              />

              <span>{opp.remoteStatus}</span>
            </div>
          )}

          {opp.applicationDeadline && (
            <div className="flex items-center gap-2">
              <Calendar
                size={15}
                className="shrink-0 text-indigo-500"
              />

              <span>
                Deadline: {opp.applicationDeadline}
              </span>
            </div>
          )}

          {opp.applicationLink && (
            <div className="flex items-center gap-2">
              <ExternalLink
                size={15}
                className="shrink-0 text-indigo-500"
              />

              <span>
                External application
              </span>
            </div>
          )}

        </div>

      </div>

      <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-6 py-4">

        <ActionButton
          onClick={() => onEdit(opp)}
          icon={<Pencil size={14} />}
        >
          Edit
        </ActionButton>

        <ActionButton
          onClick={() => onTogglePublish(opp)}
          icon={
            opp.status === 'Published'
              ? <EyeOff size={14} />
              : <Eye size={14} />
          }
          hover="green"
        >
          {opp.status === 'Published'
            ? 'Unpublish'
            : 'Publish'}
        </ActionButton>

        {!opp.applicationLink && (
          <ActionButton
            onClick={() => onApplicants(opp)}
            icon={<Users size={14} />}
          >
            Applicants
          </ActionButton>
        )}

        <button
          type="button"
          onClick={() => onDelete(opp)}
          className="
            ml-auto
            inline-flex
            items-center
            gap-1.5
            rounded-lg
            border
            border-red-100
            bg-white
            px-3
            py-2
            text-xs
            font-bold
            text-red-500
            transition
            hover:border-red-300
            hover:bg-red-50
            hover:text-red-700
          "
        >
          <Trash2 size={14} />
          Delete
        </button>

      </div>

    </div>
  );
};

/* =========================================================
   ACTION BUTTON
========================================================= */

const ActionButton = ({
  children,
  icon,
  onClick,
  hover = 'indigo',
}) => {
  const hoverClasses =
    hover === 'green'
      ? 'hover:border-emerald-300 hover:text-emerald-600'
      : 'hover:border-indigo-300 hover:text-indigo-600';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-lg
        border
        border-slate-200
        bg-white
        px-3
        py-2
        text-xs
        font-bold
        text-slate-600
        transition
        ${hoverClasses}
      `}
    >
      {icon}
      {children}
    </button>
  );
};

/* =========================================================
   FORM SECTION
========================================================= */

const FormSection = ({
  icon,
  title,
  description,
  children,
}) => {
  return (
    <section className="border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">

      <div className="mb-4 flex items-start gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>

        <div>

          <h3 className="text-sm font-extrabold text-slate-900">
            {title}
          </h3>

          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            {description}
          </p>

        </div>

      </div>

      {children}

    </section>
  );
};

/* =========================================================
   FIELD
========================================================= */

const Field = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  textarea = false,
  rows = 3,
  required = false,
}) => {
  const baseClasses = `
    w-full
    rounded-xl
    border
    border-slate-200
    bg-white
    px-4
    py-3
    text-sm
    text-slate-900
    outline-none
    transition
    placeholder:text-slate-400
    hover:border-slate-300
    focus:border-indigo-500
    focus:ring-4
    focus:ring-indigo-100
  `;

  return (
    <div>

      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-bold text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {textarea ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className={`${baseClasses} resize-none`}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={baseClasses}
        />
      )}

    </div>
  );
};

/* =========================================================
   SELECT FIELD
========================================================= */

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
}) => {
  return (
    <div>

      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          py-3
          text-sm
          font-medium
          text-slate-900
          outline-none
          transition
          hover:border-slate-300
          focus:border-indigo-500
          focus:ring-4
          focus:ring-indigo-100
        "
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>

    </div>
  );
};

export default Opportunities;