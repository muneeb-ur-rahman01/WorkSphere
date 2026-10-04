import { useEffect, useState } from 'react';
import api from '../Config/apiConfig';

const LOADERS = {
  employees: ['/hr/employees', (r) => r.data.employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))],
  departments: ['/hr/departments', (r) => r.data.departments.map((d) => ({ value: d.id, label: d.name }))],
  designations: ['/hr/designations', (r) => r.data.designations.map((d) => ({ value: d.id, label: d.title }))],
  jobs: ['/hrm/job-openings', (r) => r.data.rows.map((d) => ({ value: d.id, label: d.title }))],
  programs: ['/hrm/training-programs', (r) => r.data.rows.map((d) => ({ value: d.id, label: d.title }))],
  plans: ['/hrm/benefit-plans', (r) => r.data.rows.map((d) => ({ value: d.id, label: `${d.name} (${d.kind})` }))],
  incomeAccounts: ['/finance/chart-of-accounts?status=Active&category=Income', (r) => r.data.rows.map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` }))],
  expenseAccounts: ['/finance/chart-of-accounts?status=Active&category=Expense', (r) => r.data.rows.map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` }))],
  accounts: ['/finance/chart-of-accounts?status=Active', (r) => r.data.rows.map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` }))]
};

// Loads dropdown options once, e.g. useLookups(['employees','departments']) -> { employees: [...], departments: [...] }
export const useLookups = (names) => {
  const [data, setData] = useState({});
  const key = names.join('|');
  useEffect(() => {
    let alive = true;
    names.forEach((n) => {
      const L = LOADERS[n];
      if (!L) return;
      api.get(L[0]).then((r) => { if (alive) setData((d) => ({ ...d, [n]: L[1](r) })); }).catch(() => {});
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return data;
};
