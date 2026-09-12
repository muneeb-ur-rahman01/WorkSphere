import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Building2, Save, Eye, EyeOff } from 'lucide-react';

const emptyForm = { missionStatement: '', focusArea: '', city: '', website: '', logoUrl: '', directoryVisible: true };

const OrgProfile = () => {
  const { organizations, currentUser, updateMyDirectoryProfile } = useContext(AppContext);
  const myOrg = organizations.find((o) => o.id === currentUser.orgId);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (myOrg) {
      setForm({
        missionStatement: myOrg.missionStatement || '',
        focusArea: myOrg.focusArea || '',
        city: myOrg.city || '',
        website: myOrg.website || '',
        logoUrl: myOrg.logoUrl || '',
        directoryVisible: myOrg.directoryVisible !== false
      });
    }
  }, [myOrg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    const res = await updateMyDirectoryProfile(form);
    setSaving(false);
    if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else setError(res.error);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black flex items-center gap-2">
          <Building2 size={26} className="text-indigo-600" /> Organization Profile
        </h1>
        <p className="text-gray-600 mt-1">
          What other organizations see about you in the Directory. Everything else about your
          organization (finances, staff, projects) always stays private.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 max-w-2xl">
        {error && <div className="bg-red-50 border border-red-400 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}
        {saved && <div className="bg-green-50 border border-green-400 text-green-700 rounded-lg p-3 text-sm mb-4">Profile updated.</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-black">Mission Statement</label>
            <textarea value={form.missionStatement} onChange={(e) => setForm({ ...form, missionStatement: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-black">Focus Area</label>
              <input value={form.focusArea} onChange={(e) => setForm({ ...form, focusArea: e.target.value })} placeholder="e.g. Education, Healthcare" className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-black">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-black">Website</label>
            <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-black">Logo URL</label>
            <input type="url" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              {form.directoryVisible ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} className="text-gray-400" />}
              <span className="text-sm font-semibold text-black">Visible in the Organization Directory</span>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, directoryVisible: !form.directoryVisible })}
              className={`relative w-11 h-6 rounded-full transition ${form.directoryVisible ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.directoryVisible ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60">
              <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default OrgProfile;
