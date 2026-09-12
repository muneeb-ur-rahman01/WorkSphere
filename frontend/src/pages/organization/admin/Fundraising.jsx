import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { TrendingUp, Download, Megaphone, HeartHandshake, Gift, Target } from 'lucide-react';

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

// Composes existing Campaigns/Donors/Donations/Sponsors/Sponsorships data
// (all already loaded via AppContext — see Phase 3/4) into the rollup view
// the spec's FUNDRAISING module asks for, rather than introducing new
// fundraising-specific tables.
const Fundraising = () => {
  const { campaigns, donors, donations, sponsors, sponsorships } = useContext(AppContext);

  const totals = useMemo(() => {
    const donationTotal = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const sponsorshipTotal = sponsorships.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const activeCampaigns = campaigns.filter((c) => c.status === 'Active').length;
    const goalTotal = campaigns.reduce((sum, c) => sum + Number(c.goalAmount || 0), 0);
    const raisedTotal = campaigns.reduce((sum, c) => sum + Number(c.raisedAmount || 0), 0);
    return { donationTotal, sponsorshipTotal, activeCampaigns, goalTotal, raisedTotal };
  }, [campaigns, donations, sponsorships]);

  const recentDonations = useMemo(() => (
    [...donations].sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate)).slice(0, 8)
  ), [donations]);

  const donorName = (id) => donors.find((d) => d.id === id)?.name || 'Unknown donor';

  const handleExportDonations = () => downloadCsv('donations.csv', donations.map((d) => ({
    donor: donorName(d.donorId), amount: d.amount, currency: d.currency, date: d.donationDate,
    paymentMethod: d.paymentMethod || '', recurring: d.isRecurring ? 'Yes' : 'No', notes: d.notes || ''
  })));

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <TrendingUp size={26} className="text-indigo-600" /> Fundraising
          </h1>
          <p className="text-gray-600 mt-1">A rollup of campaigns, donations and sponsorships across your organization.</p>
        </div>
        <button onClick={handleExportDonations} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition text-sm">
          <Download size={16} /> Export Donations (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <KpiCard icon={HeartHandshake} label="Total Donations" value={totals.donationTotal.toLocaleString()} sub={`${donations.length} donation${donations.length === 1 ? '' : 's'} · ${donors.length} donor${donors.length === 1 ? '' : 's'}`} accent="from-indigo-500 to-indigo-600" />
        <KpiCard icon={Gift} label="Total Sponsorships" value={totals.sponsorshipTotal.toLocaleString()} sub={`${sponsorships.length} sponsorship${sponsorships.length === 1 ? '' : 's'} · ${sponsors.length} sponsor${sponsors.length === 1 ? '' : 's'}`} accent="from-amber-500 to-orange-500" />
        <KpiCard icon={Megaphone} label="Active Campaigns" value={totals.activeCampaigns} sub={`${campaigns.length} total campaign${campaigns.length === 1 ? '' : 's'}`} accent="from-fuchsia-500 to-purple-500" />
        <KpiCard icon={Target} label="Campaign Goal Progress" value={totals.goalTotal ? `${Math.min(100, Math.round((totals.raisedTotal / totals.goalTotal) * 100))}%` : '—'} sub={`${totals.raisedTotal.toLocaleString()} of ${totals.goalTotal.toLocaleString()} goal`} accent="from-emerald-500 to-green-600" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 p-6 mb-8">
        <h2 className="text-lg font-bold text-black mb-1">Campaign Progress</h2>
        <p className="text-xs text-gray-500 mb-4">Raised vs. goal, per campaign</p>
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No campaigns yet.</p>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => {
              const pct = c.goalAmount ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : null;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-black">{c.title}</span>
                    <span className="text-gray-500">
                      {Number(c.raisedAmount).toLocaleString()}{c.goalAmount ? ` / ${Number(c.goalAmount).toLocaleString()}` : ''}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${pct ?? 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-indigo-100/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-black">Recent Donations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="px-6 py-3">Donor</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Method</th>
              </tr>
            </thead>
            <tbody>
              {recentDonations.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">No donations recorded yet.</td></tr>
              )}
              {recentDonations.map((d) => (
                <tr key={d.id} className="border-t border-gray-50">
                  <td className="px-6 py-3 text-black font-medium">{donorName(d.donorId)}</td>
                  <td className="px-6 py-3 text-gray-700">{d.currency} {Number(d.amount).toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-500">{d.donationDate}</td>
                  <td className="px-6 py-3 text-gray-500">{d.paymentMethod || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Fundraising;
