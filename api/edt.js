'use strict';
const crypto = require('crypto');
const { get, put, BlobPreconditionFailedError } = require('@vercel/blob');

const PATH = 'edt/data.json';
const SESSION_MS = 12 * 3600 * 1000;
const MAX_BYTES = 3 * 1024 * 1024;
const fails = new Map();

function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function secret() {
  return process.env.ADMIN_SECRET ||
    sha256('edt-session:' + (process.env.BLOB_READ_WRITE_TOKEN || '') + (process.env.ADMIN_HASH || ''));
}
function sign(exp) { return crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex'); }
function issueToken() {
  const exp = Date.now() + SESSION_MS;
  return { token: exp + '.' + sign(exp), expires: exp };
}
function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function isAdmin(req) {
  const m = /^Bearer (\d+)\.([0-9a-f]+)$/.exec(req.headers.authorization || '');
  if (!m || Number(m[1]) < Date.now()) return false;
  return safeEq(m[2], sign(m[1]));
}
function ip(req) {
  return String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || 'x').trim();
}
function blocked(k) {
  const f = fails.get(k);
  if (!f) return false;
  f.t = f.t.filter(t => Date.now() - t < 600000);
  return f.t.length >= 5;
}
function noteFail(k) { const f = fails.get(k) || { t: [] }; f.t.push(Date.now()); fails.set(k, f); }
function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}
function valid(d) {
  if (!d || typeof d !== 'object') return false;
  return ['semesters', 'languages', 'groups', 'teachers', 'rooms', 'courses', 'slots'].every(k => Array.isArray(d[k]));
}
async function streamText(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString('utf8');
}

const VAC_URL = 'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records';
const parisDay = (v) => {
  const s = String(v || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d)) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};
async function queryVac(where) {
  const url = VAC_URL + '?limit=100&order_by=' + encodeURIComponent('start_date desc') + '&where=' + encodeURIComponent(where);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    return Array.isArray(j.results) ? j.results : [];
  } finally { clearTimeout(t); }
}
// Vacances scolaires zone B (academie de Lille), normalisees : [{name,start,end}] (dates Paris, AAAA-MM-JJ)
async function vacances() {
  let rows = [];
  try { rows = await queryVac('location="Lille"'); } catch (e) { rows = []; }
  if (!rows.length) rows = await queryVac('zones="Zone B"');
  const seen = new Set(), list = [];
  rows.forEach(r => {
    const name = String(r.description || '').trim();
    if (!/^(vacances|pont)/i.test(name)) return;
    if (/enseignants/i.test(String(r.population || ''))) return;
    const start = parisDay(r.start_date), end = parisDay(r.end_date);
    if (!start || !end || end <= start) return;
    const key = start + '|' + end;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ name: name.replace(/^vacances d'/i, 'Vacances d\'').replace(/^vacances de /i, 'Vacances de '), start, end });
  });
  list.sort((x, y) => x.start < y.start ? -1 : 1);
  return list;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = (req.query && req.query.action) || '';
  try {
    if (req.method === 'GET') {
      if (action === 'vacances') {
        try {
          const list = await vacances();
          if (!list.length) return res.status(502).json({ error: 'Calendrier indisponible' });
          res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=604800');
          return res.status(200).json({ list, zone: 'B', academie: 'Lille', at: Date.now() });
        } catch (e) { return res.status(502).json({ error: 'Calendrier indisponible' }); }
      }
      if (action === 'ping') return res.status(isAdmin(req) ? 200 : 401).json({ ok: isAdmin(req) });
      const r = await get(PATH, { access: 'private', useCache: false });
      if (!r || r.statusCode === 404 || !r.stream) return res.status(200).json({ data: null, rev: null });
      const data = JSON.parse(await streamText(r.stream));
      return res.status(200).json({ data, rev: r.blob.etag });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

    const body = readBody(req);
    if (action === 'login') {
      const k = ip(req);
      if (blocked(k)) return res.status(429).json({ error: 'Trop de tentatives' });
      const hashes = String(process.env.ADMIN_HASH || '').split(/[,\s;]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
      const given = body.password ? sha256(body.password) : '';
      const ok = hashes.reduce((acc, hh) => safeEq(given, hh) || acc, false);
      if (!ok) {
        noteFail(k);
        return res.status(401).json({ error: 'Mot de passe incorrect' });
      }
      fails.delete(k);
      return res.status(200).json(issueToken());
    }

    if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorisé' });
    if (!valid(body.data)) return res.status(400).json({ error: 'Données invalides' });
    const text = JSON.stringify(body.data);
    if (Buffer.byteLength(text) > MAX_BYTES) return res.status(413).json({ error: 'Données trop volumineuses' });

    const opts = { access: 'private', contentType: 'application/json', addRandomSuffix: false };
    if (body.force) opts.allowOverwrite = true;
    else if (body.rev) { opts.allowOverwrite = true; opts.ifMatch = String(body.rev).replace(/^W\//, ''); }
    else opts.allowOverwrite = false;
    try {
      const out = await put(PATH, text, opts);
      return res.status(200).json({ ok: true, rev: out.etag });
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError || /already exists|precondition/i.test(String(e && e.message))) {
        return res.status(409).json({ error: 'Conflit' });
      }
      throw e;
    }
  } catch (e) {
    console.error('edt api error', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
