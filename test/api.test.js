import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.MOCK = '1';
process.env.MOCK_LIVE = '1';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mt-'));
process.env.START_YEAR = '2018';

const { server, store, sync } = await import('../server.js');
let base;
before(async () => {
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
  await sync.run();
});
after(() => server.close());
const get = (p) => fetch(base + p).then((r) => r.json());

test('backfill fills the timeline year by year', async () => {
  const years = await get('/api/years');
  assert.ok(years.length >= 5);
  assert.ok(years[0].year > years.at(-1).year);
  assert.equal(years.at(-1).year, 2018);
});

test('filters: year, language, search', async () => {
  const r = await get('/api/manga?year=2020&lang=ru');
  assert.ok(r.total > 0 && r.items.every((m) => m.year === 2020 && m.langs.includes('ru')));
  const s = await get('/api/manga?q=' + encodeURIComponent(r.items[0].title.ru.slice(0, 4)));
  assert.ok(s.total > 0);
});

test('auto-update adds newly published manga', async () => {
  const before = store.manga.size;
  await sync.run();
  assert.equal(store.manga.size, before + 1);
});

test('chapters and pages', async () => {
  const { items } = await get('/api/manga?lang=en&limit=1');
  const ch = await get(`/api/manga/${items[0].id}/chapters`);
  assert.ok(ch.length > 3);
  const pages = await get(`/api/chapter/${encodeURIComponent(ch[0].id)}`);
  assert.equal(pages.pages.length, 8);
  const img = await fetch(base + pages.pages[0]);
  assert.equal(img.headers.get('content-type'), 'image/svg+xml');
});

test('static files are served and path traversal is blocked', async () => {
  assert.equal((await fetch(base + '/')).status, 200);
  assert.notEqual((await fetch(base + '/..%2fserver.js')).status, 200);
  assert.equal((await fetch(base + '/api/sync', { method: 'POST' })).status, 403);
});
