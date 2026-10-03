import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './lib/config.js';
import { Store } from './lib/store.js';
import { mangadex } from './lib/mangadex.js';
import { mock, demoCover, demoPage } from './lib/mock.js';
import { createSync } from './lib/sync.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(root, 'public');
const source = config.mock ? mock : mangadex;
const store = new Store(config.dataDir);
const sync = createSync(source, store);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.val;
  const val = await fn();
  cache.set(key, { val, exp: Date.now() + ttlMs });
  if (cache.size > 2000) for (const k of cache.keys()) { cache.delete(k); if (cache.size < 1500) break; }
  return val;
}

const card = (m) => ({
  id: m.id, title: m.title, year: m.year, status: m.status, cover: m.cover,
  tags: m.tags, langs: m.langs, latestChapterAt: m.latestChapterAt,
});

function listManga(q) {
  const lang = q.get('lang');
  const year = Number(q.get('year')) || null;
  const text = (q.get('q') || '').trim().toLowerCase();
  const status = q.get('status');
  const tag = q.get('tag');
  let items = store.all().filter((m) =>
    (!lang || m.langs.includes(lang)) && (!year || m.year === year) && (!status || m.status === status) &&
    (!tag || m.tags.includes(tag)) &&
    (!text || m.title.en.toLowerCase().includes(text) || m.title.ru.toLowerCase().includes(text)));
  const sort = q.get('sort') || 'popular';
  const by = {
    popular: (a, b) => a.rank - b.rank,
    updated: (a, b) => (b.latestChapterAt || '').localeCompare(a.latestChapterAt || ''),
    new: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
    title: (a, b) => a.title.en.localeCompare(b.title.en),
  }[sort] || ((a, b) => a.rank - b.rank);
  items = items.sort(by);
  const offset = Math.max(0, Number(q.get('offset')) || 0);
  const limit = Math.min(100, Number(q.get('limit')) || 24);
  return { total: items.length, items: items.slice(offset, offset + limit).map(card) };
}

const json = (res, data, status = 200, maxAge = 0) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
  });
  res.end(JSON.stringify(data));
};

async function handleApi(req, res, url) {
  const p = url.pathname.replace(/^\/api/, '');
  const q = url.searchParams;
  let m;

  if (p === '/config') {
    return json(res, {
      langs: config.langs, startYear: config.startYear, total: store.manga.size,
      lastSync: store.meta.lastSync, syncing: sync.running, syncError: sync.lastError, demo: config.mock,
    });
  }
  if (p === '/years') {
    const lang = q.get('lang');
    const counts = new Map();
    for (const x of store.all()) if (!lang || x.langs.includes(lang)) counts.set(x.year, (counts.get(x.year) || 0) + 1);
    return json(res, [...counts].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year));
  }
  if (p === '/tags') {
    const counts = new Map();
    for (const x of store.all()) for (const t of x.tags) counts.set(t, (counts.get(t) || 0) + 1);
    return json(res, [...counts].sort((a, b) => b[1] - a[1]).map(([name]) => name), 200, 300);
  }
  if (p === '/manga') return json(res, listManga(q));
  if ((m = p.match(/^\/manga\/([\w-]+)$/))) {
    const x = store.get(m[1]);
    return x ? json(res, x) : json(res, { error: 'not found' }, 404);
  }
  if ((m = p.match(/^\/manga\/([\w-]+)\/chapters$/))) {
    if (!store.has(m[1])) return json(res, { error: 'not found' }, 404);
    const list = await cached(`feed:${m[1]}`, 10 * 60000, () => source.feed(m[1]));
    const num = (c) => (c.chapter == null ? -1 : parseFloat(c.chapter));
    list.sort((a, b) => (a.volume ? parseFloat(a.volume) : 1e9) - (b.volume ? parseFloat(b.volume) : 1e9) || num(a) - num(b));
    return json(res, list);
  }
  if ((m = p.match(/^\/chapter\/([\w~-]+)$/))) {
    const r = await cached(`pages:${m[1]}`, 5 * 60000, () => source.pages(m[1]));
    return json(res, r);
  }
  if (p === '/sync' && req.method === 'POST') {
    if (!config.adminToken || req.headers.authorization !== `Bearer ${config.adminToken}`) {
      return json(res, { error: 'forbidden' }, 403);
    }
    sync.run();
    return json(res, { started: true }, 202);
  }
  return json(res, { error: 'not found' }, 404);
}

function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(pub, rel));
  if (!file.startsWith(pub + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    let m;
    if (config.mock && (m = url.pathname.match(/^\/demo\/cover\/([\w-]+)\.svg$/))) {
      res.writeHead(200, { 'Content-Type': MIME['.svg'], 'Cache-Control': 'public, max-age=3600' });
      return res.end(demoCover(m[1]));
    }
    if (config.mock && (m = url.pathname.match(/^\/demo\/page\/([^/]+)\/(\d+)\.svg$/))) {
      res.writeHead(200, { 'Content-Type': MIME['.svg'], 'Cache-Control': 'public, max-age=3600' });
      return res.end(demoPage(decodeURIComponent(m[1]), m[2]));
    }
    serveStatic(res, url.pathname);
  } catch (e) {
    console.error(e);
    json(res, { error: 'upstream error' }, 502);
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(config.port, () => {
    console.log(`Reader on http://localhost:${config.port} (${source.name}${config.mock ? ', demo data' : ''})`);
    sync.run();
    setInterval(() => sync.run(), config.syncMinutes * 60000).unref();
  });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { store.saveNow(); process.exit(0); });
}

export { store, sync };
