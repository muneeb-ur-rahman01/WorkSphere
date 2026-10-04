import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import api from '../../../Config/apiConfig';
import { AppContext } from '../../../context/AppContext';
import { STAFF_ROLE_NAMES } from '../../../Config/constant';
import DashboardLayout from '../../../layouts/DashboardLayout';
import Button from '../../../shared/Button/Button';
import Card from '../../../shared/Card/Card';
import Input from '../../../shared/Input/Input';
import Modal from '../../../shared/Modal/Modal';
import Table from '../../../shared/Table/Table';
import { Pill, } from '../../../shared/ModuleKit/ModuleKit';
import { Toast } from '../../../shared/HrUi/HrUi';
import { apiError, fmtDate, money, toneFor, useToast } from '../../../utils/hrFormat';

const newKey = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : `${Date.now()}${Math.random().toString(36).slice(2)}`).slice(0, 40);

// Staff donations: campaign list, donate through the payment gateway, own history.
// The page never marks a donation successful itself - only the server does,
// after verifying the gateway's signed callback.
const StaffDonations = () => {
  const { currentUser } = useContext(AppContext);
  const [toast, showToast] = useToast();
  const [params, setParams] = useSearchParams();
  const [gw, setGw] = useState(null);
  const [camps, setCamps] = useState([]);
  const [currency, setCurrency] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState(null);
  const [f, setF] = useState({ amount: '', donorName: '', donorEmail: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [redirect, setRedirect] = useState(null);
  const keyRef = useRef(newKey());
  const formRef = useRef(null);

  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [returned] = useState(() => params.get('status')); // outcome reported by the gateway redirect
  const announced = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all([api.get('/staff-donations/status'), api.get('/staff-donations/campaigns'), api.get('/staff-donations/mine')])
      .then(([sRes, cRes, hRes]) => {
        if (!alive) return;
        setGw(sRes.data); setCamps(cRes.data.campaigns); setCurrency(cRes.data.currency); setHistory(hRes.data.donations); setLoading(false);
        // Show the gateway outcome once, then clean the URL. Status always comes from the server data above.
        if (returned && !announced.current) {
          announced.current = true;
          if (returned === 'success') showToast('Thank you! Your donation was verified.');
          else if (returned === 'pending') showToast('Your payment is being verified. It will update here shortly.');
          else showToast('The donation was not completed.', 'error');
          setParams({}, { replace: true });
        }
      })
      .catch((e) => { if (alive) { setLoading(false); showToast(apiError(e, 'Could not load donations.'), 'error'); } });
    return () => { alive = false; };
  }, [tick, returned, setParams, showToast]);

  // Auto-submit the signed gateway form once the server has returned it.
  useEffect(() => { if (redirect && formRef.current) formRef.current.submit(); }, [redirect]);

  const open = (c) => { setErr(''); keyRef.current = newKey(); setF({ amount: '', donorName: currentUser?.fullName || '', donorEmail: currentUser?.email || '' }); setPick(c); };

  const donate = async (e) => {
    e.preventDefault();
    if (busy) return;
    const n = Number(f.amount);
    if (!(n >= 1)) return setErr('Enter an amount of at least 1.');
    if (Math.round(n * 100) !== n * 100 && Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return setErr('Amount can have at most 2 decimals.');
    setBusy(true); setErr('');
    try {
      const res = await api.post('/staff-donations/checkout', { campaignId: pick.id, amount: n, donorName: f.donorName, donorEmail: f.donorEmail, idempotencyKey: keyRef.current });
      if (res.data.alreadyProcessed) { setPick(null); reload(); return showToast('This donation was already processed.'); }
      setRedirect(res.data.checkout); // browser now posts to the payment gateway
    } catch (x) { setErr(apiError(x)); setBusy(false); }
  };

  if (!currentUser) return <Navigate to="/login/org" replace />;
  if (!STAFF_ROLE_NAMES.includes(currentUser.role)) return <Navigate to="/org-admin/dashboard" replace />;

  return (
    <DashboardLayout>
      <Toast toast={toast} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">Donations &amp; Fundraising</h1>
        <p className="text-gray-600 mt-2">Support an active campaign through the secure online payment gateway. Card details are entered on the gateway's page — never here.</p>
      </div>

      {gw && !gw.configured && <p className="mb-4 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3">Online payments are not set up yet. Please ask your administrator to configure the payment gateway.</p>}

      <h2 className="text-lg font-bold mb-3">Active campaigns</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        {camps.map((c) => {
          const pct = c.goalAmount ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : null;
          return (
            <div key={c.id} className="bg-white border-2 border-blue-400 rounded-2xl shadow-lg shadow-blue-100/60 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-blue-700"><HeartHandshake size={18} /><h3 className="font-bold text-gray-900">{c.title}</h3></div>
              <p className="text-sm text-gray-600">Raised <b>{currency} {money(c.raisedAmount)}</b>{c.goalAmount ? <> of {currency} {money(c.goalAmount)}</> : null}</p>
              {pct !== null && <div className="h-2 bg-slate-100 rounded"><div className="h-2 rounded bg-blue-500" style={{ width: `${pct}%` }} /></div>}
              <Button onClick={() => open(c)} disabled={!gw?.configured}>Donate</Button>
            </div>
          );
        })}
        {!camps.length && <p className="text-sm text-gray-500">{loading ? 'Loading…' : 'There are no active campaigns right now.'}</p>}
      </div>

      <Card title="My donations" subtitle="Status is confirmed by the payment gateway, not by this page.">
        <Table
          headers={['Date', 'Campaign', 'Amount', 'Method', 'Reference', 'Status']}
          data={history}
          emptyMessage={loading ? 'Loading…' : 'You have not made any donations yet.'}
          renderRow={(d) => (
            <tr key={d.id}>
              <td>{fmtDate(String(d.createdAt).slice(0, 10))}</td>
              <td className="font-medium">{d.campaignTitle}</td>
              <td>{d.currency} {money(d.amount)}</td>
              <td className="capitalize">{d.paymentMethod || '—'}</td>
              <td className="font-mono text-xs">{d.transactionReference}</td>
              <td><Pill tone={toneFor(d.status)}>{d.status}</Pill></td>
            </tr>
          )}
        />
      </Card>

      <Modal isOpen={!!pick} onClose={() => !busy && setPick(null)} title={pick ? `Donate to ${pick.title}` : ''} maxWidth="440px">
        {pick && (
          <form onSubmit={donate} className="flex flex-col gap-3" noValidate>
            <Input label={`Amount (${currency}) *`} type="number" step="0.01" min="1" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            <Input label="Donor name *" value={f.donorName} onChange={(e) => setF({ ...f, donorName: e.target.value })} />
            <Input label="Donor email *" type="email" value={f.donorEmail} onChange={(e) => setF({ ...f, donorEmail: e.target.value })} />
            <p className="text-xs text-gray-500">You will be redirected to the payment gateway to complete the payment securely.</p>
            {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">{err}</p>}
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPick(null)} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Redirecting…' : 'Continue to payment'}</Button></div>
          </form>
        )}
      </Modal>

      {redirect && (
        <form ref={formRef} method={redirect.method || 'POST'} action={redirect.postUrl} className="hidden">
          {Object.entries(redirect.fields || {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        </form>
      )}
    </DashboardLayout>
  );
};

export default StaffDonations;
