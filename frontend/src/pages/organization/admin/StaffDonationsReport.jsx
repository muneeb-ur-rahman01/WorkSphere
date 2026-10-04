import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../../Config/apiConfig';
import Button from '../../../shared/Button/Button';
import Card from '../../../shared/Card/Card';
import Table from '../../../shared/Table/Table';
import { useConfirm } from '../../../shared/ConfirmDialog/ConfirmDialog';
import { Pill } from '../../../shared/ModuleKit/ModuleKit';
import { Toast } from '../../../shared/HrUi/HrUi';
import { apiError, fmtDate, money, toneFor, useToast } from '../../../utils/hrFormat';

// "Staff donations" section of Reports & Insights -> Fundraising.
// Totals and per-campaign analytics count verified (Succeeded) transactions only.
const StaffDonationsReport = () => {
  const confirm = useConfirm();
  const [toast, showToast] = useToast();
  const [f, setF] = useState({ from: '', to: '', campaignId: '', userId: '', status: '' });
  const [data, setData] = useState(null);
  const [camps, setCamps] = useState([]);
  const [tick, setTick] = useState(0);
  const params = useMemo(() => Object.fromEntries(Object.entries(f).filter(([, v]) => v)), [f]);

  useEffect(() => {
    let alive = true;
    api.get('/staff-donations/report', { params }).then((r) => { if (alive) { setData(r.data); } }).catch((e) => showToast(apiError(e, 'Could not load staff donations.'), 'error'));
    return () => { alive = false; };
  }, [params, tick, showToast]);
  useEffect(() => { api.get('/campaigns').then((r) => setCamps(r.data.campaigns || [])).catch(() => {}); }, []);

  const donors = useMemo(() => {
    const m = new Map();
    (data?.rows || []).forEach((r) => m.set(r.userId, r.donorName));
    return [...m.entries()];
  }, [data]);

  const refund = useCallback(async (d) => {
    if (!(await confirm({ title: 'Mark as refunded?', message: `Only do this after refunding ${d.currency} ${money(d.amount)} through the payment gateway. The donation will be removed from fundraising totals.`, confirmLabel: 'Mark refunded', variant: 'danger' }))) return;
    try { await api.post(`/staff-donations/${d.id}/refund`); setTick((t) => t + 1); showToast('Donation marked as refunded.'); }
    catch (e) { showToast(apiError(e), 'error'); }
  }, [confirm, showToast]);

  const sel = (k, label, opts) => (
    <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="border border-slate-300 rounded-md px-3 py-1.5 text-sm" aria-label={label}>
      <option value="">{label}: All</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const t = data?.totals;

  return (
    <div className="mt-10">
      <Toast toast={toast} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[['Verified staff donations', data ? `${data.currency} ${money(t.verifiedAmount)}` : '—'], ['Verified count', t?.verifiedCount ?? '—'], ['Pending / Failed', t ? `${t.pendingCount} / ${t.failedCount}` : '—'], ['Refunded', data ? `${data.currency} ${money(t.refundedAmount)}` : '—']].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-blue-200 bg-white p-4"><p className="text-sm text-gray-500">{l}</p><p className="text-xl font-bold mt-1">{v}</p></div>
        ))}
      </div>
      {data?.byCampaign?.length > 0 && <div className="flex flex-wrap gap-2 mb-4">{data.byCampaign.map((c) => <span key={c.campaign} className="rounded-full border border-slate-200 px-3 py-1 text-sm">{c.campaign}: <b>{money(c.amount)}</b></span>)}</div>}
      <Card
        title="Staff donations" subtitle="Online donations made by staff through the payment gateway."
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" aria-label="From date" />
            <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" aria-label="To date" />
            {sel('campaignId', 'Campaign', camps.map((c) => [c.id, c.title]))}
            {sel('userId', 'Donor', donors)}
            {sel('status', 'Status', ['Pending', 'Succeeded', 'Failed', 'Refunded'].map((s) => [s, s]))}
          </div>
        }
      >
        <Table
          headers={['Donor', 'Campaign', 'Amount', 'Date', 'Method', 'Transaction reference', 'Status', '']}
          data={data?.rows || []}
          emptyMessage={data ? 'No staff donations match these filters.' : 'Loading…'}
          renderRow={(d) => (
            <tr key={d.id}>
              <td className="font-medium">{d.donorName}</td>
              <td>{d.campaignTitle}</td>
              <td>{d.currency} {money(d.amount)}</td>
              <td>{fmtDate(String(d.createdAt).slice(0, 10))}</td>
              <td className="capitalize">{d.paymentMethod || '—'}</td>
              <td className="font-mono text-xs">{d.transactionReference}</td>
              <td><Pill tone={toneFor(d.status)}>{d.status}</Pill></td>
              <td className="text-right">{d.status === 'Succeeded' && <Button size="small" variant="outline" onClick={() => refund(d)}>Mark refunded</Button>}</td>
            </tr>
          )}
        />
      </Card>
    </div>
  );
};

export default StaffDonationsReport;
