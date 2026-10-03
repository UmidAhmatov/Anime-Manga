import { config } from './config.js';

/** Offline demo source: fully original, procedurally generated series/pages (no real works). */
const EN_A = ['Crimson', 'Silent', 'Eternal', 'Azure', 'Hollow', 'Iron', 'Lunar', 'Wandering', 'Broken', 'Gilded', 'Frozen', 'Neon', 'Scarlet', 'Midnight', 'Verdant', 'Ashen'];
const EN_B = ['Blade', 'Garden', 'Horizon', 'Requiem', 'Academy', 'Frontier', 'Odyssey', 'Chronicle', 'Harbor', 'Lantern', 'Citadel', 'Orchard', 'Signal', 'Covenant', 'Tide', 'Machina'];
const RU_A = ['Рассвета', 'Тумана', 'Вечности', 'Пепла', 'Луны', 'Железа', 'Скитальцев', 'Осколков', 'Золота', 'Льда', 'Неона', 'Заката', 'Полуночи', 'Листвы', 'Эха', 'Грозы'];
const RU_B = ['Клинок', 'Сад', 'Горизонт', 'Реквием', 'Академия', 'Рубеж', 'Одиссея', 'Хроника', 'Гавань', 'Фонарь', 'Цитадель', 'Сады', 'Сигнал', 'Завет', 'Прилив', 'Механизм'];
const TAGS = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi', 'Slice of Life', 'Mystery', 'Sports', 'Horror', 'Isekai', 'School Life', 'Mecha'];
const STATUS = ['ongoing', 'completed', 'completed', 'hiatus'];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSeries(id, year, seed, rank, createdAt, latestChapterAt) {
  const r = rng(seed);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const i = Math.floor(r() * 16);
  const j = Math.floor(r() * 16);
  const langs = r() < 0.7 ? ['ru', 'en'] : r() < 0.5 ? ['en'] : ['ru'];
  const tags = [...new Set([pick(TAGS), pick(TAGS), pick(TAGS)])];
  return {
    id,
    title: { en: `${EN_A[i]} ${EN_B[j]}`, ru: `${RU_B[j]} ${RU_A[i]}` },
    desc: {
      en: `An original demo story set in ${year}: a young traveler, a fading city and a secret that changes everything. (Generated sample data.)`,
      ru: `Оригинальная демо-история ${year} года: юный путник, угасающий город и тайна, которая меняет всё. (Сгенерированные тестовые данные.)`,
    },
    year,
    status: year >= new Date().getFullYear() - 1 ? 'ongoing' : pick(STATUS),
    rating: 'safe',
    tags,
    authors: [`Demo Author ${1 + Math.floor(r() * 40)}`],
    langs,
    cover: `/demo/cover/${id}.svg`,
    rank,
    createdAt,
    latestChapterAt,
    _chapters: 6 + Math.floor(r() * 30),
  };
}

const NOW = Date.now();
const DAY = 86400000;
const catalog = new Map();
let liveCount = 0;
{
  const thisYear = new Date().getFullYear();
  for (let y = 1995; y <= thisYear; y++) {
    const n = 3 + (y % 4);
    for (let k = 0; k < n; k++) {
      const id = `mock-${y}-${k}`;
      const seed = y * 31 + k * 7;
      const recent = y >= thisYear - 1 && k < 2;
      const latest = recent ? new Date(NOW - Math.floor(rng(seed)() * 6) * DAY).toISOString() : null;
      catalog.set(id, makeSeries(id, y, seed, k, new Date(Date.UTC(y, 5, 1)).toISOString(), latest));
    }
  }
}
const strip = ({ _chapters, ...m }) => m;

function chaptersOf(id) {
  const s = catalog.get(id);
  if (!s) return [];
  const out = [];
  for (const lang of s.langs) {
    const n = lang === 'ru' ? Math.max(3, s._chapters - 2) : s._chapters;
    for (let c = 1; c <= n; c++) {
      out.push({
        id: `${id}~${lang}~${c}`, chapter: String(c), volume: String(Math.ceil(c / 8)),
        title: lang === 'ru' ? `Глава ${c}` : `Chapter ${c}`, lang, pages: 8,
        publishAt: new Date(NOW - (n - c) * 3 * DAY).toISOString(),
      });
    }
  }
  return out;
}

export const mock = {
  name: 'mock',

  async listByYear(year, offset, limit) {
    const all = [...catalog.values()].filter((m) => m.year === year).sort((a, b) => a.rank - b.rank);
    return { total: all.length, items: all.slice(offset, offset + limit).map(strip) };
  },

  /** With MOCK_LIVE=1 each call invents one brand-new series, to demo auto-adding. */
  async newManga() {
    if (!config.mockLive) return [];
    const y = new Date().getFullYear();
    const id = `mock-live-${Date.now()}`;
    const s = makeSeries(id, y, Date.now() % 100000, 0, new Date().toISOString(), new Date().toISOString());
    s.title = { en: `Fresh Arrival ${++liveCount}`, ru: `Новинка ${liveCount}` };
    catalog.set(id, s);
    return [strip(s)];
  },

  async recentChapters() { return { total: 0, items: [] }; },
  async getManga(ids) { return ids.map((i) => catalog.get(i)).filter(Boolean).map(strip); },
  async feed(id) { return chaptersOf(id); },

  async pages(chapterId) {
    const urls = Array.from({ length: 8 }, (_, i) => `/demo/page/${encodeURIComponent(chapterId)}/${i + 1}.svg`);
    return { pages: urls, saver: urls };
  },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

export function demoCover(id) {
  const s = catalog.get(id);
  const title = s ? s.title.en : 'Demo';
  const h = hue(id);
  const words = title.split(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},70%,38%)"/><stop offset="1" stop-color="hsl(${(h + 60) % 360},70%,16%)"/></linearGradient></defs>
<rect width="300" height="450" fill="url(#g)"/>
<circle cx="220" cy="120" r="80" fill="hsl(${(h + 30) % 360},80%,60%)" opacity=".25"/>
<path d="M0 360 L90 250 L160 330 L230 220 L300 320 L300 450 L0 450Z" fill="#000" opacity=".35"/>
${words.map((w, i) => `<text x="24" y="${290 + i * 44}" font-family="Georgia,serif" font-size="38" font-weight="700" fill="#fff">${esc(w)}</text>`).join('')}
<text x="24" y="430" font-family="sans-serif" font-size="14" fill="#fff" opacity=".7">${esc(s?.year ?? '')} · DEMO</text></svg>`;
}

export function demoPage(chapterId, n) {
  const h = hue(chapterId);
  const r = rng(h * 100 + n);
  const panels = [];
  let y = 20;
  while (y < 1050) {
    const ph = 200 + Math.floor(r() * 220);
    const split = r() < 0.5;
    if (split) {
      const w = 230 + Math.floor(r() * 120);
      panels.push([20, y, w, ph], [20 + w + 12, y, 760 - w - 12, ph]);
    } else panels.push([20, y, 760, ph]);
    y += ph + 12;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100"><rect width="800" height="1100" fill="#fafafa"/>
${panels.map(([x, yy, w, hh], i) => `<rect x="${x}" y="${yy}" width="${w}" height="${Math.min(hh, 1080 - yy)}" fill="hsl(${(h + i * 25) % 360},45%,${70 - (i % 3) * 8}%)" stroke="#111" stroke-width="4"/>
<circle cx="${x + w * (0.3 + r() * 0.4)}" cy="${yy + hh * 0.5}" r="${20 + r() * 40}" fill="#fff" opacity=".5"/>`).join('')}
<text x="400" y="1090" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#555">${esc(n)} / 8 · demo page</text></svg>`;
}
