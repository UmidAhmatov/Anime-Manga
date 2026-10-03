import fs from 'node:fs';
import path from 'node:path';

/** Tiny JSON-file store: whole catalog lives in memory, saved atomically. */
export class Store {
  constructor(dir) {
    this.file = path.join(dir, 'catalog.json');
    this.dir = dir;
    this.manga = new Map();
    this.meta = { lastSync: 0, backfill: {} };
    this.timer = null;
    this.load();
  }

  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.meta = { lastSync: 0, backfill: {}, ...raw.meta };
      for (const m of raw.manga || []) this.manga.set(m.id, m);
    } catch {
      /* first run */
    }
  }

  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.saveNow(), 500);
  }

  saveNow() {
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ meta: this.meta, manga: [...this.manga.values()] }));
    fs.renameSync(tmp, this.file);
  }

  has(id) { return this.manga.has(id); }
  get(id) { return this.manga.get(id); }
  all() { return [...this.manga.values()]; }

  upsert(m) {
    const old = this.manga.get(m.id);
    this.manga.set(m.id, { ...m, latestChapterAt: m.latestChapterAt || old?.latestChapterAt || null });
    this.save();
  }

  touch(id, publishAt) {
    const m = this.manga.get(id);
    if (m && (!m.latestChapterAt || publishAt > m.latestChapterAt)) {
      m.latestChapterAt = publishAt;
      this.save();
    }
  }
}
