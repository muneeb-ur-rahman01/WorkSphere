import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import {
  HeartHandshake,
  Plus,
  Search,
  Edit,
  Trash2,
  DollarSign,
  X
} from 'lucide-react';

const emptyDonorForm = {
  donorType: 'Individual',
  name: '',
  email: '',
  phone: '',
  address: '',
  notes: ''
};

const emptyDonationForm = {
  amount: '',
  currency: 'PKR',
  donationDate: '',
  paymentMethod: '',
  projectId: '',
  campaignId: '',
  isRecurring: false,
  notes: ''
};

// Email validation
const isValidEmail = (email) => {
  if (!email || !email.trim()) {
    return true;
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  return emailRegex.test(email.trim());
};

// Pakistan phone validation: 03xx-xxxxxxx
const isValidPhone = (phone) => {
  if (!phone || !phone.trim()) {
    return true;
  }

  const phoneRegex =
    /^03\d{2}-\d{7}$/;

  return phoneRegex.test(phone.trim());
};

const Donors = () => {
  const {
    donors,
    donations,
    projects,
    campaigns,
    createDonor,
    updateDonor,
    deleteDonor,
    createDonation,
    deleteDonation,
    currentUser,
    hasAccess
  } = useContext(AppContext);

  // Org Admins always can; staff need the 'donors' section granted under
  // Accessibility. (Approve / reject decisions stay Org-Admin-only.)
  const canManage =
    currentUser?.role === 'OrgAdmin' || hasAccess('donors');

  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyDonorForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [donationModalDonor, setDonationModalDonor] = useState(null);
  const [donationForm, setDonationForm] = useState(emptyDonationForm);
  const [donationError, setDonationError] = useState('');

  const filtered = useMemo(
    () =>
      donors.filter(
        (d) =>
          d.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (d.email || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      ),
    [donors, searchTerm]
  );

  const donorDonations = (donorId) =>
    donations
      .filter((d) => d.donorId === donorId)
      .sort(
        (a, b) =>
          new Date(b.donationDate) -
          new Date(a.donationDate)
      );

  const openCreate = () => {
    setForm({ ...emptyDonorForm });
    setModalMode('create');
    setEditingId(null);
    setError('');
  };

  const openEdit = (d) => {
    setForm({
      donorType: d.donorType,
      name: d.name,
      email: d.email || '',
      phone: d.phone || '',
      address: d.address || '',
      notes: d.notes || ''
    });

    setEditingId(d.id);
    setModalMode('edit');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    const email = form.email.trim();
    const phone = form.phone.trim();

    // Validate email if entered
    if (email && !isValidEmail(email)) {
      setError(
        'Please enter a valid email address, e.g. name@example.com.'
      );
      return;
    }

    // Validate phone if entered
    if (phone && !isValidPhone(phone)) {
      setError(
        'Please enter a valid phone number in this format: 03xx-xxxxxxx'
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email,
        phone,
        address: form.address.trim(),
        notes: form.notes.trim()
      };

      const res =
        modalMode === 'create'
          ? await createDonor(payload)
          : await updateDonor(editingId, payload);

      if (res?.success) {
        setModalMode(null);
        setForm({ ...emptyDonorForm });
        setEditingId(null);
        setError('');
      } else {
        setError(
          res?.error || 'Could not save donor.'
        );
      }
    } catch (error) {
      console.error('Donor save failed:', error);

      setError(
        'Could not save donor. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (d) => {
    const ok = await confirm({
      title: 'Delete this donor?',
      message: `"${d.name}" and their donation history will be permanently removed.`,
      confirmLabel: 'Delete',
      variant: 'danger'
    });

    if (ok) deleteDonor(d.id);
  };

  const openDonationModal = (d) => {
    setDonationModalDonor(d);

    setDonationForm({
      ...emptyDonationForm,
      donationDate: new Date()
        .toISOString()
        .slice(0, 10)
    });

    setDonationError('');
  };

  const handleLogDonation = async (e) => {
    e.preventDefault();

    if (!donationForm.amount) return;

    const res = await createDonation({
      ...donationForm,
      donorId: donationModalDonor.id
    });

    if (res.success) {
      setDonationModalDonor(null);
    } else {
      setDonationError(res.error);
    }
  };

  const handleDeleteDonation = async (donationId) => {
    const ok = await confirm({
      title: 'Delete this donation record?',
      confirmLabel: 'Delete',
      variant: 'danger'
    });

    if (ok) deleteDonation(donationId);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <HeartHandshake
              size={26}
              className="text-indigo-600"
            />
            Donors
          </h1>

          <p className="text-gray-600 mt-1">
            Track donors and their donation history.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
          >
            <Plus size={18} />
            New Donor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Total Donors
          </p>

          <p className="text-3xl font-bold text-black mt-1">
            {donors.length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Total Donations
          </p>

          <p className="text-3xl font-bold text-blue-600 mt-1">
            {donations.length}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-500 font-semibold">
            Total Raised
          </p>

          <p className="text-3xl font-bold text-green-600 mt-1">
            {donations
              .reduce(
                (sum, d) =>
                  sum + Number(d.amount || 0),
                0
              )
              .toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 mb-6 flex items-center gap-3">
        <Search
          size={20}
          className="text-gray-500"
        />

        <input
          type="text"
          placeholder="Search donors by name or email..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr className="text-left text-black">
                <th className="px-6 py-3">
                  Donor
                </th>

                <th className="px-6 py-3">
                  Type
                </th>

                <th className="px-6 py-3">
                  Contact
                </th>

                <th className="px-6 py-3">
                  Total Donated
                </th>

                <th className="px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-gray-400"
                  >
                    No donors match this search.
                  </td>
                </tr>
              )}

              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-gray-200 hover:bg-gray-50 align-top"
                >
                  <td className="px-6 py-4">
                    <p className="font-semibold text-black">
                      {d.name}
                    </p>

                    {donorDonations(d.id).length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {donorDonations(d.id).length}{' '}
                        donation
                        {donorDonations(d.id).length === 1
                          ? ''
                          : 's'}{' '}
                        recorded
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                      {d.donorType}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {d.email && <p>{d.email}</p>}
                    {d.phone && <p>{d.phone}</p>}
                  </td>

                  <td className="px-6 py-4 font-semibold text-black">
                    {Number(
                      d.totalDonated
                    ).toLocaleString()}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          openDonationModal(d)
                        }
                        className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition"
                        title="Log donation"
                      >
                        <DollarSign size={16} />
                      </button>

                      {canManage && (
                        <>
                          <button
                            onClick={() =>
                              openEdit(d)
                            }
                            className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(d)
                            }
                            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-black mb-4">
              {modalMode === 'create'
                ? 'New Donor'
                : 'Edit Donor'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-semibold text-black">
                  Donor Type
                </label>

                <select
                  value={form.donorType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      donorType: e.target.value
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Individual">
                    Individual
                  </option>

                  <option value="Organization">
                    Organization
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-black">
                  Name
                </label>

                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">
                    Email
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        email: e.target.value
                      });

                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <p className="text-xs text-gray-400 mt-1">
                    Format: name@example.com
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-black">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        phone: e.target.value
                      });

                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder="0300-1234567"
                    autoComplete="tel"
                    maxLength={12}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <p className="text-xs text-gray-400 mt-1">
                    Format: 03xx-xxxxxxx
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-black">
                  Address
                </label>

                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      address: e.target.value
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-black">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value
                    })
                  }
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setModalMode(null)
                  }
                  className="rounded-lg border border-gray-300 px-5 py-2 font-bold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60"
                >
                  {submitting
                    ? 'Saving...'
                    : 'Save Donor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {donationModalDonor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">
                Donations — {donationModalDonor.name}
              </h2>

              <button
                onClick={() =>
                  setDonationModalDonor(null)
                }
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
              {donorDonations(
                donationModalDonor.id
              ).length === 0 && (
                <p className="text-sm text-gray-400">
                  No donations recorded yet.
                </p>
              )}

              {donorDonations(
                donationModalDonor.id
              ).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-black">
                      {d.currency}{' '}
                      {Number(
                        d.amount
                      ).toLocaleString()}
                    </p>

                    <p className="text-xs text-gray-500">
                      {d.donationDate}
                      {d.paymentMethod
                        ? ` · ${d.paymentMethod}`
                        : ''}
                      {d.isRecurring
                        ? ' · Recurring'
                        : ''}
                    </p>
                  </div>

                  {canManage && (
                    <button
                      onClick={() =>
                        handleDeleteDonation(d.id)
                      }
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {donationError && (
              <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">
                {donationError}
              </div>
            )}

            <form
              onSubmit={handleLogDonation}
              className="space-y-3 pt-3 border-t border-gray-100"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-black">
                    Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    required
                    value={donationForm.amount}
                    onChange={(e) =>
                      setDonationForm({
                        ...donationForm,
                        amount: e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-black">
                    Date
                  </label>

                  <input
                    type="date"
                    value={
                      donationForm.donationDate
                    }
                    onChange={(e) =>
                      setDonationForm({
                        ...donationForm,
                        donationDate:
                          e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-black">
                    Linked Project
                  </label>

                  <select
                    value={donationForm.projectId}
                    onChange={(e) =>
                      setDonationForm({
                        ...donationForm,
                        projectId:
                          e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
                  >
                    <option value="">
                      None
                    </option>

                    {projects.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                      >
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-black">
                    Linked Campaign
                  </label>

                  <select
                    value={
                      donationForm.campaignId
                    }
                    onChange={(e) =>
                      setDonationForm({
                        ...donationForm,
                        campaignId:
                          e.target.value
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
                  >
                    <option value="">
                      None
                    </option>

                    {campaigns.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                      >
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-black">
                  Payment Method (record only)
                </label>

                <input
                  value={
                    donationForm.paymentMethod
                  }
                  onChange={(e) =>
                    setDonationForm({
                      ...donationForm,
                      paymentMethod:
                        e.target.value
                    })
                  }
                  placeholder="e.g. Bank transfer, Cash"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={
                    donationForm.isRecurring
                  }
                  onChange={(e) =>
                    setDonationForm({
                      ...donationForm,
                      isRecurring:
                        e.target.checked
                    })
                  }
                />
                Recurring donation
              </label>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-700 transition"
                >
                  Log Donation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Donors;