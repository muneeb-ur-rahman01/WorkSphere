import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Settings as SettingsIcon, Loader2, Save } from 'lucide-react';

const PlatformSettings = () => {
  const { fetchPlatformSettings, updatePlatformSetting } = useContext(AppContext);
  const [settings, setSettings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await fetchPlatformSettings();
    setLoading(false);
    if (res.success) {
      setSettings(res.settings);
      setDrafts(Object.fromEntries(res.settings.map((s) => [s.key, s.value])));
    } else {
      setError(res.error);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (key) => {
    setSavingKey(key);
    setSavedKey(null);
    const res = await updatePlatformSetting(key, drafts[key]);
    setSavingKey(null);
    if (res.success) {
      setSavedKey(key);
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value: drafts[key], updatedAt: new Date().toISOString() } : s)));
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000);
    } else {
      setError(res.error);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black flex items-center gap-2">
          <SettingsIcon size={26} className="text-indigo-600" /> Platform Settings
        </h1>
        <p className="text-gray-600 mt-1">General, platform-wide configuration.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-300 text-red-600 rounded-lg p-3 text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-10 text-center text-gray-400 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading settings...
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg divide-y divide-gray-100">
          {settings.map((setting) => (
            <div key={setting.key} className="px-6 py-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="md:w-1/3">
                <p className="font-semibold text-black">{setting.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
              </div>
              <div className="flex-1 flex items-center gap-3">
                <input
                  type="text"
                  value={drafts[setting.key] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [setting.key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleSave(setting.key)}
                  disabled={savingKey === setting.key || drafts[setting.key] === setting.value}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  <Save size={14} /> {savingKey === setting.key ? 'Saving...' : savedKey === setting.key ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PlatformSettings;
