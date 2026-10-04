import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building2, Calendar, Camera, Hash, UserCheck } from 'lucide-react';
import api from '../../../Config/apiConfig';
import AttendanceChart from '../../../shared/AttendanceChart/AttendanceChart';
import { apiError, currentMonthStr, fmtDate } from '../../../utils/hrFormat';

const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');

const STATUS_CLS = {
  Active: 'bg-green-100 text-green-700', 'On Leave': 'bg-lime-100 text-lime-800', Probation: 'bg-amber-100 text-amber-700',
  Suspended: 'bg-orange-100 text-orange-700', Resigned: 'bg-slate-100 text-slate-600', Terminated: 'bg-red-100 text-red-700'
};

const Field = ({ icon, label, value }) => (
  <div className="flex items-start gap-2.5 min-w-0">
    <span className="mt-0.5 text-blue-500 shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 truncate" title={value || ''}>{value || '—'}</p>
    </div>
  </div>
);

// Profile card + monthly attendance chart for the Staff Dashboard.
// Everything comes from the authenticated user's own records.
const StaffOverview = () => {
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef(null);

  const [month, setMonth] = useState(currentMonthStr());
  const [monthData, setMonthData] = useState(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [chartError, setChartError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/hr/me')
      .then((res) => { if (alive) setProfile(res.data.profile); })
      .catch((err) => { if (alive) setProfileError(apiError(err, 'Could not load your profile.')); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    api.get('/attendance/me', { params: { month } })
      .then((res) => { if (alive) { setMonthData(res.data); setChartError(''); setMonthLoading(false); } })
      .catch((err) => { if (alive) { setChartError(apiError(err, 'Could not load attendance.')); setMonthLoading(false); } });
    return () => { alive = false; };
  }, [month]);

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png'].includes(f.type) || f.size > 2 * 1024 * 1024) {
      return setProfileError('Photo must be a JPG or PNG image up to 2 MB.');
    }
    const fd = new FormData();
    fd.append('photo', f);
    setPhotoBusy(true);
    setProfileError('');
    try {
      const res = await api.post('/hr/me/photo', fd, { headers: { 'Content-Type': undefined }, timeout: 60000 });
      setProfile((p) => ({ ...p, photoUrl: res.data.photoUrl }));
    } catch (err) {
      setProfileError(apiError(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="space-y-6 mb-6">
      {/* PROFILE CARD */}
      <div className="bg-white border-2 border-blue-400 rounded-2xl shadow-lg shadow-blue-100/60 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative shrink-0 self-center sm:self-auto">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.fullName} className="w-24 h-24 rounded-full object-cover border-4 border-blue-100" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold flex items-center justify-center border-4 border-blue-100">
                {profile ? initials(profile.fullName) : ''}
              </div>
            )}
            {profile?.hasEmployeeRecord && (
              <>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} title="Change photo" aria-label="Change profile photo" className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow disabled:opacity-60">
                  <Camera size={15} />
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPhoto} />
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 className="text-xl font-bold text-gray-900">{profile ? profile.fullName : 'Loading…'}</h2>
              {profile?.employmentStatus && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLS[profile.employmentStatus] || 'bg-slate-100 text-slate-600'}`}>{profile.employmentStatus}</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field icon={<Hash size={16} />} label="Employee ID" value={profile?.employeeCode} />
              <Field icon={<Building2 size={16} />} label="Department" value={profile?.department} />
              <Field icon={<Briefcase size={16} />} label="Designation" value={profile?.designation} />
              <Field icon={<UserCheck size={16} />} label="Employment status" value={profile?.employmentStatus} />
            </div>
            {profile && (
              <p className="text-xs text-gray-400 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>{profile.role}</span>
                {profile.joiningDate && <span className="inline-flex items-center gap-1"><Calendar size={12} /> Joined {fmtDate(profile.joiningDate)}</span>}
                {!profile.hasEmployeeRecord && <span className="text-amber-600">Your employee record has not been created yet. Please contact your administrator.</span>}
              </p>
            )}
            {profileError && <p className="text-xs text-red-600 mt-2" role="alert">{profileError}</p>}
          </div>
        </div>
      </div>

      {/* MONTHLY ATTENDANCE CHART */}
      {chartError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2" role="alert">{chartError}</p>}
      <AttendanceChart
        title="Attendance Flag Summary"
        days={monthData?.days || []}
        month={month}
        maxMonth={currentMonthStr()}
        loading={monthLoading}
        onMonthChange={(m) => { setMonthLoading(true); setMonth(m); }}
        extraControls={<Link to="/staff/attendance" className="text-sm font-semibold text-blue-700 hover:underline px-1">View Attendance Detail</Link>}
      />
    </div>
  );
};

export default StaffOverview;
