const supabase = require('../config/supabase');

const httpErr = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const snake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validDate = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

// Label used to show the name of a referenced row (employeeId -> employeeName)
const LABELS = {
  employees: { cols: 'id, full_name, employee_code', label: (r) => `${r.full_name} (${r.employee_code})` },
  job_openings: { cols: 'id, title', label: (r) => r.title },
  training_programs: { cols: 'id, title', label: (r) => r.title },
  benefit_plans: { cols: 'id, name', label: (r) => r.name },
  chart_of_accounts: { cols: 'id, code, name', label: (r) => `${r.code} · ${r.name}` },
  departments: { cols: 'id, name', label: (r) => r.name },
  designations: { cols: 'id, title', label: (r) => r.title }
};

// Validate one field value against its spec. Returns the DB value.
const coerce = (name, spec, raw) => {
  const label = spec.label || name;
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') {
    if (spec.required) throw httpErr(`${label} is required.`);
    return null;
  }
  switch (spec.type) {
    case 'str': case 'text': {
      if (typeof raw !== 'string') throw httpErr(`${label} must be text.`);
      const v = raw.trim();
      if (!v) { if (spec.required) throw httpErr(`${label} is required.`); return null; }
      if (v.length > (spec.max || (spec.type === 'text' ? 2000 : 200))) throw httpErr(`${label} is too long.`);
      if (spec.pattern && !spec.pattern.test(v)) throw httpErr(spec.patternMsg || `${label} is invalid.`);
      return v;
    }
    case 'email': {
      const v = String(raw).trim();
      if (v.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw httpErr(`${label} must be a valid email.`);
      return v;
    }
    case 'int': case 'num': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) throw httpErr(`${label} must be a number.`);
      if (spec.type === 'int' && !Number.isInteger(n)) throw httpErr(`${label} must be a whole number.`);
      if (spec.type === 'num' && Math.round(n * 100) !== n * 100 && Math.abs(Math.round(n * 100) - n * 100) > 1e-6) throw httpErr(`${label} can have at most 2 decimals.`);
      if (spec.min !== undefined && n < spec.min) throw httpErr(`${label} must be at least ${spec.min}.`);
      if (spec.max !== undefined && n > spec.max) throw httpErr(`${label} must be at most ${spec.max}.`);
      return n;
    }
    case 'date':
      if (typeof raw !== 'string' || !validDate(raw)) throw httpErr(`${label} must be a valid date (YYYY-MM-DD).`);
      return raw;
    case 'enum':
      if (!spec.values.includes(raw)) throw httpErr(`${label} must be one of: ${spec.values.join(', ')}.`);
      return raw;
    case 'bool':
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true' || raw === 'false') return raw === 'true';
      throw httpErr(`${label} must be true or false.`);
    case 'uuid': case 'ref':
      if (typeof raw !== 'string' || !UUID.test(raw)) throw httpErr(`${label} is invalid.`);
      return raw;
    case 'enumarr':
      if (!Array.isArray(raw) || !raw.length || raw.some((x) => !spec.values.includes(x))) throw httpErr(`${label} is invalid.`);
      return [...new Set(raw)];
    default:
      throw new Error(`unknown field type ${spec.type}`);
  }
};

const decorate = async (orgId, rows, fields) => {
  const refs = Object.entries(fields).filter(([, s]) => s.type === 'ref' && LABELS[s.table]);
  for (const [name, spec] of refs) {
    const ids = [...new Set(rows.map((r) => r[snake(name)]).filter(Boolean))];
    if (!ids.length) continue;
    const L = LABELS[spec.table];
    const { data } = await supabase.from(spec.table).select(L.cols).eq('org_id', orgId).in('id', ids);
    const map = new Map((data || []).map((x) => [x.id, L.label(x)]));
    const outName = name.replace(/Id$/, 'Name');
    rows.forEach((r) => { r[`__${outName}`] = map.get(r[snake(name)]) || null; });
  }
};

const toApi = (row) => {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k.startsWith('__') ? k.slice(2) : camel(k)] = v;
  return out;
};

// cfg: { table, fields, orderBy, filters: [apiNames], defaults(req)->{}, hooks, allowDelete, allowUpdate, rowFilter(q)->q }
const makeResource = (cfg) => {
  const { table, fields } = cfg;
  const hooks = cfg.hooks || {};

  const readBody = (body, { partial }) => {
    const row = {};
    for (const [name, spec] of Object.entries(fields)) {
      if (spec.readOnly) continue;
      if (partial && spec.createOnly) {
        if (body[name] !== undefined) throw httpErr(`${spec.label || name} cannot be changed.`);
        continue;
      }
      if (body[name] === undefined) {
        if (!partial && spec.required && spec.default === undefined) throw httpErr(`${spec.label || name} is required.`);
        continue;
      }
      row[spec.col || snake(name)] = coerce(name, spec, body[name]);
    }
    return row;
  };

  const checkRefs = async (orgId, row) => {
    for (const [name, spec] of Object.entries(fields)) {
      if (spec.type !== 'ref') continue;
      const v = row[spec.col || snake(name)];
      if (!v) continue;
      const { data } = await supabase.from(spec.table).select('id').eq('id', v).eq('org_id', orgId).maybeSingle();
      if (!data) throw httpErr(`${spec.label || name} is invalid.`);
    }
  };

  const friendly = (error, fallback) => {
    if (error.code === '23505') return httpErr(cfg.duplicateMessage || 'A record with these details already exists.', 409);
    if (error.code === '23514') return httpErr('One of the values is out of the allowed range.', 400);
    if (error.code === 'P0001') return httpErr(error.message.replace(/^.*?: /, ''), 400); // our trigger messages
    if (error.code === '23503') return httpErr('This record is still referenced elsewhere.', 409);
    console.error(`[${table}]`, error.message);
    return httpErr(fallback, 500);
  };

  return {
    list: async ({ user, query = {} }) => {
      let q = supabase.from(table).select('*').eq('org_id', user.orgId);
      for (const name of cfg.filters || []) {
        const spec = fields[name];
        if (query[name] === undefined || query[name] === '') continue;
        q = q.eq(spec.col || snake(name), coerce(name, { ...spec, required: false }, query[name]));
      }
      if (cfg.listFilter) q = cfg.listFilter(q, query);
      const [col, asc] = cfg.orderBy || ['created_at', false];
      q = q.order(col, { ascending: asc }).limit(cfg.limit || 1000);
      const { data, error } = await q;
      if (error) throw friendly(error, 'Could not load records.');
      await decorate(user.orgId, data, fields);
      if (hooks.decorateList) await hooks.decorateList({ user, rows: data });
      return data.map(toApi);
    },

    create: async ({ user, body }) => {
      if (cfg.allowCreate === false) throw httpErr('This record cannot be created.', 405);
      let row = readBody(body || {}, { partial: false });
      for (const [name, spec] of Object.entries(fields)) {
        const col = spec.col || snake(name);
        if (row[col] === undefined && spec.default !== undefined) row[col] = typeof spec.default === 'function' ? spec.default() : spec.default;
      }
      await checkRefs(user.orgId, row);
      if (hooks.beforeCreate) row = (await hooks.beforeCreate({ user, row, body })) || row;
      const attempts = cfg.retryCreate || 1;
      let data, error;
      for (let i = 0; i < attempts; i++) {
        const r0 = cfg.autoFill ? await cfg.autoFill({ user, row, attempt: i }) : row;
        ({ data, error } = await supabase.from(table).insert({ ...r0, org_id: user.orgId, ...(cfg.createdBy ? { [cfg.createdBy]: user.id } : {}) }).select().single());
        if (!error || error.code !== '23505' || !cfg.autoFill) break;
      }
      if (error) throw friendly(error, 'Could not save the record.');
      if (hooks.afterCreate) await hooks.afterCreate({ user, row: data });
      const out = [data]; await decorate(user.orgId, out, fields);
      return toApi(out[0]);
    },

    update: async ({ user, id, body }) => {
      if (cfg.allowUpdate === false) throw httpErr('This record cannot be edited.', 405);
      const { data: before } = await supabase.from(table).select('*').eq('id', id).eq('org_id', user.orgId).maybeSingle();
      if (!before) throw httpErr('Record not found.', 404);
      let row = readBody(body || {}, { partial: true });
      if (!Object.keys(row).length) throw httpErr('Nothing to update.');
      await checkRefs(user.orgId, row);
      if (hooks.beforeUpdate) row = (await hooks.beforeUpdate({ user, row, before, body })) || row;
      let q = supabase.from(table).update(row).eq('id', id).eq('org_id', user.orgId);
      if (cfg.rowFilter) q = cfg.rowFilter(q);
      const { data, error } = await q.select().maybeSingle();
      if (error) throw friendly(error, 'Could not update the record.');
      if (!data) throw httpErr(cfg.rowFilterMessage || 'Record not found.', cfg.rowFilter ? 409 : 404);
      if (hooks.afterUpdate) await hooks.afterUpdate({ user, row: data, before });
      const out = [data]; await decorate(user.orgId, out, fields);
      return toApi(out[0]);
    },

    remove: async ({ user, id }) => {
      if (!cfg.allowDelete) throw httpErr('This record cannot be deleted.', 405);
      const { data: before } = await supabase.from(table).select('*').eq('id', id).eq('org_id', user.orgId).maybeSingle();
      if (!before) throw httpErr('Record not found.', 404);
      if (hooks.canDelete) await hooks.canDelete({ user, row: before });
      let q = supabase.from(table).delete().eq('id', id).eq('org_id', user.orgId);
      if (cfg.rowFilter) q = cfg.rowFilter(q);
      const { data, error } = await q.select().maybeSingle();
      if (error) throw friendly(error, 'Could not delete the record.');
      if (!data) throw httpErr(cfg.rowFilterMessage || 'Record not found.', 409);
      if (hooks.afterDelete) await hooks.afterDelete({ user, row: before });
    }
  };
};

module.exports = { makeResource, httpErr, camel, snake, toApi, UUID, validDate };
