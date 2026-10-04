import { useCallback, useEffect, useState } from 'react';
import { Target, Star, MessageSquare, GraduationCap, Gift, ThumbsUp, Check } from 'lucide-react';
import api from '../../../Config/apiConfig';
import { apiError, fmtDate } from '../../../utils/hrFormat';

const CARD = 'bg-white border-2 border-blue-400 hover:border-blue-500 transition-colors rounded-2xl shadow-lg shadow-blue-100/60 p-5 h-[440px] overflow-y-auto';
const ITEM = 'border border-gray-100 rounded-xl p-4 bg-gray-50';

const STATUS_CLS = {
  'Not Started': 'bg-slate-100 text-slate-700', 'In Progress': 'bg-blue-100 text-blue-700', Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700', Submitted: 'bg-amber-100 text-amber-700', Acknowledged: 'bg-green-100 text-green-700',
  Planned: 'bg-slate-100 text-slate-700', Ongoing: 'bg-blue-100 text-blue-700', Enrolled: 'bg-green-100 text-green-700'
};
const Badge = ({ children }) => <span className={`text-xs font-bold rounded-full px-2 py-0.5 shrink-0 ${STATUS_CLS[children] || 'bg-slate-100 text-slate-700'}`}>{children}</span>;

const Shell = ({ icon, grad, title, error, loading, empty, children, testId }) => (
  <div className={CARD} data-testid={testId}>
    <div className="flex items-center gap-2 mb-4">
      <div className={`bg-gradient-to-br ${grad} text-white rounded-lg p-1.5`}>{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
    {error && <p role="alert" className="text-sm text-red-600 mb-3">{error}</p>}
    {loading ? <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
      : empty && !error ? <p className="text-sm text-gray-400 text-center py-6">{empty}</p>
        : <div className="space-y-3">{children}</div>}
  </div>
);

// Loads one /hr/me/* endpoint; `pick` extracts the data from the response.
const useMine = (url, pick, initial) => {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(() => api.get(url)
    .then((r) => { setData(pick(r.data)); setError(''); })
    .catch((e) => setError(apiError(e, 'Could not load this section.')))
    .finally(() => setLoading(false)), [url]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, setError, reload: load };
};

const GoalsCard = () => {
  const { data: goals, loading, error, setError, reload } = useMine('/hr/me/goals', (d) => d.goals, []);
  const [busy, setBusy] = useState('');
  const [draft, setDraft] = useState({});
  const save = async (g, patch) => {
    setBusy(g.id);
    try { await api.patch(`/hr/me/goals/${g.id}`, patch); setDraft((d) => { const n = { ...d }; delete n[g.id]; return n; }); await reload(); }
    catch (e) { setError(apiError(e, 'Could not update the goal.')); }
    finally { setBusy(''); }
  };
  return (
    <Shell testId="staff-goals" icon={<Target size={16} />} grad="from-blue-500 to-indigo-600" title="My Goals" error={error} loading={loading} empty={goals.length ? '' : 'No goals assigned yet'}>
      {goals.map((g) => {
        const locked = g.status === 'Cancelled';
        const prog = draft[g.id] ?? g.progress;
        return (
          <div key={g.id} className={ITEM}>
            <div className="flex items-start justify-between gap-2"><h3 className="font-medium">{g.title}</h3><Badge>{g.status}</Badge></div>
            {g.description && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{g.description}</p>}
            {g.dueDate && <p className="text-xs text-gray-400 mt-1">Due {fmtDate(g.dueDate)}</p>}
            <div className="mt-2">
              <div className="h-2 bg-slate-200 rounded"><div className="h-2 rounded bg-blue-500" style={{ width: `${prog}%` }} /></div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1"><span>{prog}%</span></div>
            </div>
            {!locked && (
              <div className="mt-2 space-y-2">
                <input type="range" min="0" max="100" step="5" value={prog} aria-label={`Progress for ${g.title}`} disabled={busy === g.id}
                  onChange={(e) => setDraft((d) => ({ ...d, [g.id]: Number(e.target.value) }))} className="w-full" />
                <div className="flex gap-2">
                  <select aria-label={`Status for ${g.title}`} value={g.status} disabled={busy === g.id} onChange={(e) => save(g, { status: e.target.value })} className="flex-1 border border-gray-200 rounded-lg text-sm px-2 py-1.5 bg-white">
                    {['Not Started', 'In Progress', 'Completed'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {draft[g.id] !== undefined && draft[g.id] !== g.progress && (
                    <button type="button" disabled={busy === g.id} onClick={() => save(g, { progress: draft[g.id] })} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </Shell>
  );
};

const ReviewsCard = () => {
  const { data: reviews, loading, error, setError, reload } = useMine('/hr/me/reviews', (d) => d.reviews, []);
  const ack = async (r) => {
    try { await api.post(`/hr/me/reviews/${r.id}/acknowledge`); await reload(); } catch (e) { setError(apiError(e, 'Could not acknowledge the review.')); }
  };
  return (
    <Shell testId="staff-reviews" icon={<Star size={16} />} grad="from-amber-500 to-orange-600" title="My Performance Reviews" error={error} loading={loading} empty={reviews.length ? '' : 'No reviews yet'}>
      {reviews.map((r) => (
        <div key={r.id} className={ITEM}>
          <div className="flex items-start justify-between gap-2"><h3 className="font-medium">{r.periodLabel}</h3><Badge>{r.status}</Badge></div>
          <p className="text-amber-500 text-sm mt-1" aria-label={`Rating ${r.rating || 0} of 5`}>{r.rating ? '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) : '—'}</p>
          {r.strengths && <p className="text-sm mt-2"><span className="font-semibold text-gray-700">Strengths: </span><span className="text-gray-600 whitespace-pre-wrap">{r.strengths}</span></p>}
          {r.improvements && <p className="text-sm mt-1"><span className="font-semibold text-gray-700">To improve: </span><span className="text-gray-600 whitespace-pre-wrap">{r.improvements}</span></p>}
          {r.status === 'Submitted' && (
            <button type="button" onClick={() => ack(r)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-green-700 border border-green-300 bg-green-50 rounded-full px-3 py-1 hover:bg-green-100"><Check size={12} /> Acknowledge</button>
          )}
        </div>
      ))}
    </Shell>
  );
};

const FeedbackCard = () => {
  const { data: items, loading, error } = useMine('/hr/me/feedback', (d) => d.feedback, []);
  return (
    <Shell testId="staff-feedback" icon={<MessageSquare size={16} />} grad="from-emerald-500 to-teal-600" title="Feedback from Admin" error={error} loading={loading} empty={items.length ? '' : 'No feedback yet'}>
      {items.map((f) => (
        <div key={f.id} className={ITEM}>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.message}</p>
          <p className="text-xs text-gray-400 mt-2">{f.givenBy} • {fmtDate(String(f.createdAt).slice(0, 10))}</p>
        </div>
      ))}
    </Shell>
  );
};

const TrainingCard = () => {
  const { data: programs, loading, error, setError, reload } = useMine('/hr/me/training', (d) => d.programs, []);
  const [busy, setBusy] = useState('');
  const toggle = async (p) => {
    setBusy(p.id);
    try { await (p.interested ? api.delete(`/hr/me/training/${p.id}/interest`) : api.put(`/hr/me/training/${p.id}/interest`)); await reload(); }
    catch (e) { setError(apiError(e, 'Could not update your interest.')); }
    finally { setBusy(''); }
  };
  return (
    <Shell testId="staff-training" icon={<GraduationCap size={16} />} grad="from-pink-500 to-rose-600" title="Training & Development" error={error} loading={loading} empty={programs.length ? '' : 'No training programs right now'}>
      {programs.map((p) => {
        const open = ['Planned', 'Ongoing'].includes(p.status);
        return (
          <div key={p.id} className={ITEM}>
            <div className="flex items-start justify-between gap-2"><h3 className="font-medium">{p.title}</h3><Badge>{p.enrollmentStatus || p.status}</Badge></div>
            {p.provider && <p className="text-xs text-gray-500 mt-1">By {p.provider}</p>}
            {(p.startDate || p.endDate) && <p className="text-xs text-gray-400 mt-1">{fmtDate(p.startDate)} → {fmtDate(p.endDate)}</p>}
            {p.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{p.description}</p>}
            {p.score != null && <p className="text-xs text-gray-500 mt-1">Score: {p.score}</p>}
            {open && !p.enrollmentStatus && (
              <button type="button" disabled={busy === p.id} onClick={() => toggle(p)} aria-pressed={p.interested}
                className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border disabled:opacity-50 ${p.interested ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100'}`}>
                <ThumbsUp size={12} /> {p.interested ? 'Interested ✓ (tap to undo)' : "I'm interested"}
              </button>
            )}
          </div>
        );
      })}
    </Shell>
  );
};

const BenefitsCard = () => {
  const { data, loading, error } = useMine('/hr/me/benefits', (d) => ({ items: d.items, monthlyAllowance: d.monthlyAllowance }), { items: [], monthlyAllowance: 0 });
  return (
    <Shell testId="staff-benefits" icon={<Gift size={16} />} grad="from-cyan-500 to-sky-600" title="My Benefits & Allowances" error={error} loading={loading} empty={data.items.length ? '' : 'No benefits assigned yet'}>
      {data.monthlyAllowance > 0 && <p className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">Monthly allowances: {data.monthlyAllowance.toLocaleString()}</p>}
      {data.items.map((b) => (
        <div key={b.id} className={ITEM}>
          <div className="flex items-start justify-between gap-2"><h3 className="font-medium">{b.name}</h3><span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5 shrink-0">{b.kind}</span></div>
          {b.description && <p className="text-sm text-gray-500 mt-1">{b.description}</p>}
          <p className="text-sm mt-1 font-semibold text-gray-800">{b.amount > 0 ? b.amount.toLocaleString() : '—'}{b.status !== 'Active' && <span className="ml-2 text-xs text-gray-400 font-normal">(Ended)</span>}</p>
          <p className="text-xs text-gray-400 mt-1">From {fmtDate(b.startDate)}{b.endDate ? ` to ${fmtDate(b.endDate)}` : ''}</p>
        </div>
      ))}
    </Shell>
  );
};

// Cards that sit inside the existing Staff Dashboard grid (after Upcoming Meetings).
const StaffHrCards = () => (<><GoalsCard /><ReviewsCard /><FeedbackCard /><TrainingCard /><BenefitsCard /></>);

export default StaffHrCards;
