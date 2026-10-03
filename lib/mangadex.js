import { config } from './config.js';

const UA = 'AnimeMangaReader/1.0 (self-hosted reader)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

function qs(params) {
  const u = new URLSearchParams();
  const add = (k, v) => {
    if (v == null) return;
    if (Array.isArray(v)) v.forEach((x) => u.append(`${k}[]`, x));
    else if (typeof v === 'object') for (const [kk, vv] of Object.entries(v)) add(`${k}[${kk}]`, vv);
    else u.append(k, v);
  };
  for (const [k, v] of Object.entries(params || {})) add(k, v);
  return u.toString();
}

/** GET against the MangaDex API, ~4 req/s, retries on 429/5xx. */
async function api(p, params, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const wait = Math.max(0, lastCall + 250 - Date.now());
    lastCall = Date.now() + wait;
    if (wait) await sleep(wait);
    let res;
    try {
      res = await fetch(`${config.api}${p}?${qs(params)}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(20000),
      });
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1000 * 2 ** i);
      continue;
    }
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      const ra = Number(res.headers.get('retry-after')) || 0;
      await sleep(Math.max(ra * 1000, 1000 * 2 ** i));
      continue;
    }
    throw new Error(`MangaDex ${res.status} for ${p}`);
  }
  throw new Error(`MangaDex retries exhausted for ${p}`);
}

const ts = (d) => new Date(d).toISOString().slice(0, 19);

export function normalizeManga(d, rank = 0) {
  const a = d.attributes;
  const rel = (t) => d.relationships.filter((r) => r.type === t);
  const alt = (lang) => (a.altTitles || []).map((t) => t[lang]).find(Boolean);
  const first = (o) => o?.en || Object.values(o || {})[0] || '';
  const cover = rel('cover_art')[0]?.attributes?.fileName;
  return {
    id: d.id,
    title: { en: a.title?.en || alt('en') || first(a.title), ru: a.title?.ru || alt('ru') || '' },
    desc: { en: a.description?.en || '', ru: a.description?.ru || '' },
    year: a.year || new Date(a.createdAt).getFullYear(),
    status: a.status,
    rating: a.contentRating,
    tags: (a.tags || [])
      .filter((t) => ['genre', 'theme'].includes(t.attributes.group))
      .map((t) => t.attributes.name.en),
    authors: [...new Set(rel('author').map((r) => r.attributes?.name).filter(Boolean))],
    langs: (a.availableTranslatedLanguages || []).filter((l) => config.langs.includes(l)),
    cover: cover ? `https://uploads.mangadex.org/covers/${d.id}/${cover}.512.jpg` : '',
    rank,
    createdAt: a.createdAt,
    latestChapterAt: null,
  };
}

const base = () => ({
  includes: ['cover_art', 'author'],
  contentRating: config.ratings,
  availableTranslatedLanguage: config.langs,
  hasAvailableChapters: 'true',
});

export const mangadex = {
  name: 'mangadex',

  async listByYear(year, offset, limit) {
    const r = await api('/manga', { ...base(), year, limit, offset, order: { followedCount: 'desc' } });
    return { total: r.total, items: r.data.map((d, i) => normalizeManga(d, offset + i)) };
  },

  async newManga(since) {
    const r = await api('/manga', {
      ...base(), createdAtSince: ts(since), limit: 100, order: { createdAt: 'desc' },
    });
    return r.data.map((d) => normalizeManga(d, 9999));
  },

  async recentChapters(since, offset = 0) {
    const r = await api('/chapter', {
      translatedLanguage: config.langs,
      contentRating: config.ratings,
      publishAtSince: ts(since),
      order: { publishAt: 'desc' },
      limit: 100,
      offset,
    });
    return {
      total: r.total,
      items: r.data
        .map((c) => ({
          mangaId: c.relationships.find((x) => x.type === 'manga')?.id,
          publishAt: c.attributes.publishAt,
        }))
        .filter((c) => c.mangaId),
    };
  },

  async getManga(ids) {
    const out = [];
    for (let i = 0; i < ids.length; i += 100) {
      const r = await api('/manga', { ...base(), ids: ids.slice(i, i + 100), limit: 100 });
      out.push(...r.data.map((d) => normalizeManga(d, 9999)));
    }
    return out;
  },

  async feed(id) {
    const best = new Map();
    for (let offset = 0; offset < 2500; offset += 500) {
      const r = await api(`/manga/${id}/feed`, {
        translatedLanguage: config.langs,
        contentRating: config.ratings,
        includeExternalUrl: 0,
        limit: 500,
        offset,
        order: { volume: 'asc', chapter: 'asc' },
      });
      for (const c of r.data) {
        const a = c.attributes;
        if (!a.pages) continue;
        const key = `${a.translatedLanguage}|${a.chapter ?? c.id}`;
        const prev = best.get(key);
        if (!prev || a.pages > prev.pages) {
          best.set(key, {
            id: c.id, chapter: a.chapter, volume: a.volume, title: a.title || '',
            lang: a.translatedLanguage, pages: a.pages, publishAt: a.publishAt,
          });
        }
      }
      if (offset + 500 >= r.total) break;
    }
    return [...best.values()];
  },

  async pages(chapterId) {
    const r = await api(`/at-home/server/${chapterId}`, {});
    const { hash, data, dataSaver } = r.chapter;
    return {
      pages: data.map((f) => `${r.baseUrl}/data/${hash}/${f}`),
      saver: dataSaver.map((f) => `${r.baseUrl}/data-saver/${hash}/${f}`),
    };
  },
};
