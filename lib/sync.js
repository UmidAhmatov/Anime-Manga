import { config } from './config.js';

const DAY = 86400000;

/**
 * Keeps the catalog fresh:
 *  - backfill: top `perYear` series for each year, newest year first, so the timeline fills up;
 *  - incremental: series created since the last run + series that got new chapters.
 */
export function createSync(source, store, log = console) {
  let running = false;
  let lastError = null;

  const ingest = (items) => {
    let added = 0;
    for (const m of items) {
      if (!store.has(m.id)) added++;
      store.upsert(m);
    }
    return added;
  };

  async function backfill() {
    const now = new Date().getFullYear();
    let added = 0;
    for (let y = now; y >= config.startYear; y--) {
      if (store.meta.backfill[y] && y !== now) continue;
      for (let offset = 0; offset < config.perYear;) {
        const limit = Math.min(100, config.perYear - offset);
        const { items, total } = await source.listByYear(y, offset, limit);
        added += ingest(items);
        offset += limit;
        if (!items.length || offset >= total) break;
      }
      store.meta.backfill[y] = Date.now();
      store.save();
    }
    return added;
  }

  async function incremental() {
    const since = store.meta.lastSync || Date.now() - DAY;
    let added = ingest(await source.newManga(since));

    const touched = new Map();
    for (let offset = 0; offset < 500; offset += 100) {
      const { items, total } = await source.recentChapters(since, offset);
      for (const c of items) {
        if (!touched.has(c.mangaId) || c.publishAt > touched.get(c.mangaId)) touched.set(c.mangaId, c.publishAt);
      }
      if (offset + 100 >= total) break;
    }
    const unknown = [...touched.keys()].filter((id) => !store.has(id));
    for (const m of await source.getManga(unknown)) m.latestChapterAt = touched.get(m.id), (added += ingest([m]));
    for (const [id, at] of touched) store.touch(id, at);
    return added;
  }

  async function run() {
    if (running) return { skipped: true };
    running = true;
    const started = Date.now();
    try {
      let added = 0;
      if (store.meta.lastSync) added += await incremental();
      added += await backfill();
      store.meta.lastSync = started;
      store.saveNow();
      lastError = null;
      log.log(`[sync] ok via ${source.name}: +${added} new, total ${store.manga.size}`);
      return { added, total: store.manga.size };
    } catch (e) {
      lastError = e.message;
      store.saveNow();
      log.error(`[sync] failed: ${e.message}`);
      return { error: e.message };
    } finally {
      running = false;
    }
  }

  return { run, get running() { return running; }, get lastError() { return lastError; } };
}
