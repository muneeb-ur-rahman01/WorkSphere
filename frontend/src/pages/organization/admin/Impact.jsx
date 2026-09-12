import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Sparkles, Download, Heart, FolderKanban, HandHeart, CheckCircle2 } from 'lucide-react';

const downloadCsv = (filename, rows) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const KpiCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <div className={`bg-gradient-to-br ${accent} text-white rounded-xl p-2 shadow-md`}><Icon size={18} /></div>
    </div>
    <h2 className="text-3xl font-extrabold text-black mt-4">{value}</h2>
    {sub && <p className="text-sm mt-2 text-gray-600">{sub}</p>}
  </div>
);

// Composes existing Beneficiaries/Enrollments/Projects/Volunteers data
// (already loaded via AppContext — see Phase 3/4) into the outcomes view
// the spec's IMPACT MANAGEMENT module asks for, rather than introducing a
// parallel impact-tracking data model.
const Impact = () => {
  const { beneficiaries, enrollments, projects, volunteers } = useContext(AppContext);

  const totals = useMemo(() => {
    const activeEnrollments = enrollments.filter((e) => e.status === 'Active').length;
    const completedEnrollments = enrollments.filter((e) => e.status === 'Completed').length;
    const totalVolunteerHours = volunteers.reduce((sum, v) => sum + Number(v.profile?.totalHours || 0), 0);
    return { activeEnrollments, completedEnrollments, totalVolunteerHours };
  }, [enrollments, volunteers]);

  const perProject = useMemo(() => projects.map((p) => {
    const projectEnrollments = enrollments.filter((e) => e.projectId === p.id);
    return {
      project: p,
      total: projectEnrollments.length,
      active: projectEnrollments.filter((e) => e.status === 'Active').length,
      completed: projectEnrollments.filter((e) => e.status === 'Completed').length,
      dropped: projectEnrollments.filter((e) => e.status === 'Dropped').length
    };
  }).filter((row) => row.total > 0), [projects, enrollments]);

  const beneficiaryName = (id) => beneficiaries.find((b) => b.id === id)?.name || 'Unknown';
  const projectTitle = (id) => projects.find((p) => p.id === id)?.title || 'Unknown project';

  const handleExport = () => downloadCsv('impact-enrollments.csv', enrollments.map((e) => ({
    beneficiary: beneficiaryName(e.beneficiaryId), project: projectTitle(e.projectId),
    status: e.status, enrolledAt: e.enrolledAt, outcomeNotes: e.outcomeNotes || ''
  })));

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Sparkles size={26} className="text-indigo-600" /> Impact Management
          </h1>
          <p className="text-gray-600 mt-1">Beneficiaries reached and program outcomes across your projects.</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition text-sm">
          <Download size={16} /> Export Outcomes (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <KpiCard icon={Heart} label="Beneficiaries Reached" value={beneficiaries.length} sub={`${enrollments.length} total enrollment${enrollments.length === 1 ? '' : 's'}`} accent="from-rose-500 to-pink-500" />
        <KpiCard icon={FolderKanban} label="Active Enrollments" value={totals.activeEnrollments} sub="Currently enrolled in a project" accent="from-indigo-500 to-indigo-600" />
        <KpiCard icon={CheckCircle2} label="Completed Outcomes" value={totals.completedEnrollments} sub="Enrollments marked Completed" accent="from-emerald-500 to-green-600" />
        <KpiCard icon={HandHeart} label="Volunteer Hours Logged" value={totals.totalVolunteerHours.toLocaleString()} sub={`Across ${volunteers.length} volunteer${volunteers.length === 1 ? '' : 's'}`} accent="from-amber-500 to-orange-500" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-black">Project Outcomes</h2>
          <p className="text-xs text-gray-500 mt-0.5">Only projects with at least one enrollment are shown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-6 py-3">Project</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Active</th>
                <th className="px-6 py-3">Completed</th>
                <th className="px-6 py-3">Dropped</th>
              </tr>
            </thead>
            <tbody>
              {perProject.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No enrollments recorded yet.</td></tr>
              )}
              {perProject.map((row) => (
                <tr key={row.project.id} className="border-t border-gray-50">
                  <td className="px-6 py-3 text-black font-medium">{row.project.title}</td>
                  <td className="px-6 py-3 text-gray-700">{row.total}</td>
                  <td className="px-6 py-3 text-gray-700">{row.active}</td>
                  <td className="px-6 py-3 text-gray-700">{row.completed}</td>
                  <td className="px-6 py-3 text-gray-700">{row.dropped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Impact;
