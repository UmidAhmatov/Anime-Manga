// MangaTimeline front-end: vanilla ES module, hash router, RU/EN.
const T = {
  en: {
    nav_home: 'Home', nav_library: 'Library', search: 'Search manga…',
    hero_h: 'Manga, year by year', hero_p: 'Travel through the years and read the series that defined each one. New releases are added automatically.',
    latest: 'Latest updates', timeline: 'Timeline', popular: 'Popular', updated: 'Recently updated', newest: 'Newly added', title_az: 'Title A–Z',
    view: 'View', any_status: 'Any status', any_genre: 'Any genre', newest_first: '↓ Newest first', oldest_first: '↑ Oldest first',
    ongoing: 'Ongoing', completed: 'Completed', hiatus: 'On hiatus', cancelled: 'Cancelled',
    show_more: 'Show more', of: 'of', titles: 'titles', nothing: 'Nothing found', loading: 'Loading…', error: 'Something went wrong. Try again.',
    start: 'Start reading', cont: 'Continue', fav_add: '♡ Add to library', fav_del: '♥ In library', chapters: 'Chapters', no_chapters: 'No chapters in this language yet.',
    ch: 'Ch.', vol: 'Vol.', no_vol: 'No volume', sort_asc: '↑ Oldest', sort_desc: '↓ Newest', author: 'Author', year: 'Year', status: 'Status',
    back: '← Back', prev: '‹ Prev', next: 'Next ›', mode_long: 'Scroll', mode_page: 'Pages', fit: 'Width', end: 'Last chapter — you are all caught up!',
    fav: 'Favorites', hist: 'Continue reading', empty_lib: 'Your library is empty. Open a manga and press “Add to library”.',
    new: 'NEW', synced: 'Catalog updated', demo: 'DEMO DATA MODE', total: 'in catalog', decade: 's', clear: 'Reset',
    source: 'Content is provided by the MangaDex community API; all rights belong to their respective owners.',
  },
  ru: {
    nav_home: 'Главная', nav_library: 'Библиотека', search: 'Поиск манги…',
    hero_h: 'Манга — год за годом', hero_p: 'Путешествуйте по годам и читайте тайтлы, определившие каждый из них. Новинки добавляются автоматически.',
    latest: 'Последние обновления', timeline: 'По годам', popular: 'Популярное', updated: 'Недавно обновлённые', newest: 'Новые в каталоге', title_az: 'По названию А–Я',
    view: 'Вид', any_status: 'Любой статус', any_genre: 'Любой жанр', newest_first: '↓ Сначала новые', oldest_first: '↑ Сначала старые',
    ongoing: 'Выходит', completed: 'Завершена', hiatus: 'Пауза', cancelled: 'Отменена',
    show_more: 'Показать ещё', of: 'из', titles: 'тайтлов', nothing: 'Ничего не найдено', loading: 'Загрузка…', error: 'Что-то пошло не так. Попробуйте ещё раз.',
    start: 'Начать читать', cont: 'Продолжить', fav_add: '♡ В библиотеку', fav_del: '♥ В библиотеке', chapters: 'Главы', no_chapters: 'Глав на этом языке пока нет.',
    ch: 'Гл.', vol: 'Том', no_vol: 'Без тома', sort_asc: '↑ Сначала старые', sort_desc: '↓ Сначала новые', author: 'Автор', year: 'Год', status: 'Статус',
    back: '← Назад', prev: '‹ Назад', next: 'Далее ›', mode_long: 'Лента', mode_page: 'Страницы', fit: 'Ширина', end: 'Это последняя глава — вы всё прочитали!',
    fav: 'Избранное', hist: 'Продолжить чтение', empty_lib: 'Библиотека пуста. Откройте мангу и нажмите «В библиотеку».',
    new: 'NEW', synced: 'Каталог обновлён', demo: 'ДЕМО-РЕЖИМ', total: 'в каталоге', decade: '-е', clear: 'Сбросить',
    source: 'Контент предоставлен сообществом MangaDex (API); все права принадлежат их владельцам.',
  },
};
const GENRES_RU = {
  Action: 'Экшен', Adventure: 'Приключения', Comedy: 'Комедия', Drama: 'Драма', Fantasy: 'Фэнтези', Romance: 'Романтика', 'Sci-Fi': 'Научная фантастика',
  'Slice of Life': 'Повседневность', Mystery: 'Детектив', Sports: 'Спорт', Horror: 'Ужасы', Isekai: 'Исэкай', 'School Life': 'Школа', Mecha: 'Меха',
  Psychological: 'Психология', Tragedy: 'Трагедия', Historical: 'Исторический', Supernatural: 'Сверхъестественное', Magic: 'Магия', Military: 'Военное',
  Music: 'Музыка', Superhero: 'Супергерои', Thriller: 'Триллер', Crime: 'Криминал', Philosophical: 'Философия', Medical: 'Медицина', Wuxia: 'Уся',
  Samurai: 'Самураи', Ninja: 'Ниндзя', Monsters: 'Монстры', Vampires: 'Вампиры', Zombies: 'Зомби', Survival: 'Выживание', Reincarnation: 'Реинкарнация',
  Harem: 'Гарем', Cooking: 'Кулинария', Animals: 'Животные', 'Martial Arts': 'Боевые искусства', 'Post-Apocalyptic': 'Постапокалипсис', Villainess: 'Злодейка',
  'Video Games': 'Видеоигры', 'Time Travel': 'Путешествия во времени', Aliens: 'Пришельцы', Ghosts: 'Призраки', Gore: 'Жестокость', Mafia: 'Мафия',
};

const $app = document.getElementById('app');
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const state = {
  lang: store.get('lang', (navigator.language || 'en').startsWith('ru') ? 'ru' : 'en'),
  theme: store.get('theme', matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
};
const t = (k) => T[state.lang][k] ?? T.en[k] ?? k;
const genre = (g) => (state.lang === 'ru' ? GENRES_RU[g] || g : g);
const titleOf = (m) => (state.lang === 'ru' ? m.title.ru || m.title.en : m.title.en || m.title.ru) || '—';
const altOf = (m) => (state.lang === 'ru' ? m.title.en : m.title.ru);
const descOf = (m) => (state.lang === 'ru' ? m.desc.ru || m.desc.en : m.desc.en || m.desc.ru) || '';
const safeUrl = (u) => (/^(https:\/\/|\/)/.test(u || '') ? u : '');
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(state.lang === 'ru' ? 'ru-RU' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '');

/** Build DOM safely (text only, never innerHTML) */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k));
  return el;
}
const api = (p) => fetch(`/api${p}`).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString();

/* ---------- per-view cleanup ---------- */
let disposers = [];
const onDispose = (fn) => disposers.push(fn);
function cleanup() { disposers.forEach((f) => f()); disposers = []; document.body.classList.remove('reading'); }

/* ---------- library storage ---------- */
const favs = () => store.get('favs', {});
const hist = () => store.get('hist', {});
const readSet = (id) => new Set(store.get(`read:${id}`, []));
function markRead(mangaId, ch) {
  const s = readSet(mangaId); s.add(ch.id); store.set(`read:${mangaId}`, [...s]);
  const hs = hist(); hs[mangaId] = { chapterId: ch.id, chapter: ch.chapter, lang: ch.lang, ts: Date.now() }; store.set('hist', hs);
}

/* ---------- components ---------- */
function card(m) {
  const isNew = m.latestChapterAt && Date.now() - new Date(m.latestChapterAt) < 3 * 86400000;
  const img = h('img', { src: safeUrl(m.cover), alt: '', loading: 'lazy', decoding: 'async', onerror: (e) => { e.target.style.visibility = 'hidden'; } });
  return h('a', { class: 'card', href: `#/manga/${encodeURIComponent(m.id)}` },
    h('div', { class: 'img skeleton' }, img), isNew && h('span', { class: 'badge' }, t('new')),
    h('div', { class: 't' }, titleOf(m)),
    h('div', { class: 'm' }, [m.year, t(m.status)].filter(Boolean).join(' · ')));
}
const emptyMsg = (k) => h('div', { class: 'empty-msg' }, t(k));

/* ---------- home ---------- */
async function home(params) {
  const f = {
    q: params.get('q') || '', status: params.get('status') || '', tag: params.get('tag') || '',
    view: params.get('view') || 'timeline', dir: params.get('dir') || 'desc',
  };
  const cfg = await api('/config').catch(() => ({}));
  const tags = await api('/tags').catch(() => []);
  const go = (patch) => {
    const n = { ...f, ...patch };
    const o = {};
    for (const k of ['q', 'status', 'tag']) if (n[k]) o[k] = n[k];
    if (n.view !== 'timeline') o.view = n.view;
    if (n.dir !== 'desc') o.dir = n.dir;
    location.hash = `#/?${qs(o)}`;
  };
  const sel = (value, opts, on) => {
    const s = h('select', { onchange: (e) => on(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
    return s;
  };

  const filters = h('div', { class: 'filters' },
    sel(f.view, [['timeline', t('timeline')], ['popular', t('popular')], ['updated', t('updated')], ['new', t('newest')], ['title', t('title_az')]], (v) => go({ view: v })),
    sel(f.status, [['', t('any_status')], ...['ongoing', 'completed', 'hiatus', 'cancelled'].map((s) => [s, t(s)])], (v) => go({ status: v })),
    sel(f.tag, [['', t('any_genre')], ...tags.slice(0, 60).map((g) => [g, genre(g)])], (v) => go({ tag: v })),
    f.view === 'timeline' && h('button', { class: 'chip', onclick: () => go({ dir: f.dir === 'desc' ? 'asc' : 'desc' }) }, f.dir === 'desc' ? t('newest_first') : t('oldest_first')),
    (f.q || f.status || f.tag) && h('button', { class: 'chip', onclick: () => { document.getElementById('searchInput').value = ''; go({ q: '', status: '', tag: '' }); } }, '✕ ' + t('clear')),
    h('span', { class: 'm', style: 'color:var(--mut);margin-left:auto' }, cfg.total ? `${cfg.total.toLocaleString()} ${t('total')}` : ''));

  const body = h('div');
  const showHero = !f.q && !f.status && !f.tag;
  $app.replaceChildren(
    showHero && h('section', { class: 'hero' }, h('h1', {}, t('hero_h')), h('p', {}, t('hero_p'))),
    showHero && h('div', { id: 'latest' }),
    filters, body);

  if (showHero) {
    api(`/manga?${qs({ lang: state.lang, sort: 'updated', limit: 14 })}`).then((r) => {
      const box = document.getElementById('latest');
      if (box && r.items.length) box.replaceChildren(h('div', { class: 'section-title' }, h('h2', {}, t('latest'))), h('div', { class: 'row' }, r.items.map(card)));
    }).catch(() => {});
  }
  if (f.view === 'timeline') await timeline(body, f); else await flatGrid(body, f);
}

async function flatGrid(box, f) {
  const sortMap = { popular: 'popular', updated: 'updated', new: 'new', title: 'title' };
  const grid = h('div', { class: 'grid' });
  const more = h('button', { class: 'chip more' }, t('show_more'));
  box.replaceChildren(grid, more);
  let offset = 0;
  const load = async () => {
    more.disabled = true;
    try {
      const r = await api(`/manga?${qs({ lang: state.lang, q: f.q, status: f.status, tag: f.tag, sort: sortMap[f.view] || 'popular', offset, limit: 36 })}`);
      grid.append(...r.items.map(card));
      offset += r.items.length;
      more.style.display = offset < r.total ? '' : 'none';
      if (!r.total) box.replaceChildren(emptyMsg('nothing'));
    } catch { grid.after(emptyMsg('error')); }
    more.disabled = false;
  };
  more.onclick = load;
  await load();
}

async function timeline(box, f) {
  const years = await api(`/years?lang=${state.lang}`);
  if (f.dir === 'asc') years.reverse();
  if (!years.length) return box.replaceChildren(emptyMsg('nothing'));
  const rail = h('nav', { class: 'rail' }, years.map((y) => h('a', { href: `#`, 'data-y': y.year, onclick: (e) => { e.preventDefault(); document.getElementById(`y${y.year}`)?.scrollIntoView(); } }, y.year)));
  const wrap = h('div');
  box.replaceChildren(rail, wrap);

  const sections = new Map();
  for (const { year, count } of years) {
    const grid = h('div', { class: 'grid' });
    const more = h('button', { class: 'chip more', style: 'display:none' }, t('show_more'));
    const sec = h('section', { id: `y${year}`, 'data-year': year },
      h('div', { class: 'section-title' }, h('h2', {}, year), h('small', {}, `${count} ${t('titles')} · ${Math.floor(year / 10) * 10}${t('decade')}`)),
      grid, more);
    wrap.append(sec);
    sections.set(year, { sec, grid, more, offset: 0, loading: false, done: false });
  }
  const loadYear = async (year) => {
    const s = sections.get(year);
    if (s.loading || s.done) return;
    s.loading = true;
    try {
      const r = await api(`/manga?${qs({ lang: state.lang, year, status: f.status, tag: f.tag, sort: 'popular', offset: s.offset, limit: 18 })}`);
      s.grid.append(...r.items.map(card));
      s.offset += r.items.length;
      s.done = s.offset >= r.total;
      s.more.style.display = s.done ? 'none' : '';
      if (!r.total) { s.sec.remove(); rail.querySelector(`[data-y="${year}"]`)?.classList.add('empty'); }
    } catch { s.grid.after(emptyMsg('error')); }
    s.loading = false;
  };
  for (const [year, s] of sections) s.more.onclick = () => loadYear(year);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { loadYear(Number(e.target.dataset.year)); io.unobserve(e.target); }
  }, { rootMargin: '600px 0px' });
  sections.forEach((s) => io.observe(s.sec));
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      rail.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.y === e.target.dataset.year));
      rail.querySelector('a.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }, { rootMargin: '-140px 0px -70% 0px' });
  sections.forEach((s) => spy.observe(s.sec));
  onDispose(() => { io.disconnect(); spy.disconnect(); });
}

/* ---------- manga detail ---------- */
async function detail(id) {
  $app.replaceChildren(h('div', { class: 'loading' }, t('loading')));
  let m;
  try { m = await api(`/manga/${encodeURIComponent(id)}`); } catch { return $app.replaceChildren(emptyMsg('nothing')); }
  document.title = `${titleOf(m)} — MangaTimeline`;
  let chapters = [];
  try { chapters = await api(`/manga/${encodeURIComponent(id)}/chapters`); } catch { /* shown as empty */ }

  const have = [...new Set(chapters.map((c) => c.lang))];
  let lang = have.includes(state.lang) ? state.lang : have[0] || state.lang;
  let asc = false;
  const read = readSet(id);
  const listBox = h('div');
  const langBox = h('span');
  const favBtn = h('button', { class: 'btn sec' });
  const syncFav = () => { favBtn.textContent = favs()[id] ? t('fav_del') : t('fav_add'); };
  favBtn.onclick = () => {
    const f = favs();
    if (f[id]) delete f[id]; else f[id] = { id, title: m.title, cover: m.cover, year: m.year, status: m.status, tags: m.tags, langs: m.langs };
    store.set('favs', f); syncFav();
  };
  syncFav();

  const renderList = () => {
    const rows = chapters.filter((c) => c.lang === lang);
    if (!asc) rows.reverse();
    if (!rows.length) return listBox.replaceChildren(h('div', { class: 'empty-msg' }, t('no_chapters')));
    const out = []; let lastVol;
    for (const c of rows) {
      if (c.volume !== lastVol) { lastVol = c.volume; out.push(h('div', { class: 'vol' }, c.volume ? `${t('vol')} ${c.volume}` : t('no_vol'))); }
      out.push(h('a', { class: `ch${read.has(c.id) ? ' read' : ''}`, href: `#/read/${encodeURIComponent(id)}/${encodeURIComponent(c.id)}` },
        h('span', {}, h('span', { class: 'dot' }), `${t('ch')} ${c.chapter ?? '—'}`, c.title && !/^(chapter|глава)\s/i.test(c.title) ? ` — ${c.title}` : ''),
        h('span', { class: 'd' }, fmtDate(c.publishAt))));
    }
    listBox.replaceChildren(...out);
  };
  const renderLang = () => langBox.replaceChildren(...have.map((l) => h('button', { class: `chip${l === lang ? ' on' : ''}`, style: 'margin-right:6px', onclick: () => { lang = l; renderLang(); renderList(); } }, l.toUpperCase())));
  renderLang(); renderList();

  const cur = hist()[id];
  const rows = chapters.filter((c) => c.lang === lang);
  const target = (cur && chapters.find((c) => c.id === cur.chapterId)) || rows[0];
  const alt = altOf(m);

  $app.replaceChildren(
    h('p', {}, h('a', { class: 'chip', href: '#/' }, t('back'))),
    h('div', { class: 'detail' },
      h('img', { class: 'cover', src: safeUrl(m.cover), alt: '' }),
      h('div', {},
        h('h1', {}, titleOf(m)), alt && h('div', { class: 'alt' }, alt),
        h('div', { class: 'm', style: 'color:var(--mut)' }, [m.authors?.length && `${t('author')}: ${m.authors.join(', ')}`, `${t('year')}: ${m.year}`, `${t('status')}: ${t(m.status)}`].filter(Boolean).join(' · ')),
        h('div', { class: 'tags' }, (m.tags || []).map((g) => h('a', { class: 'chip', href: `#/?${qs({ tag: g })}` }, genre(g)))),
        h('p', { class: 'desc' }, descOf(m)),
        h('div', { class: 'actions' },
          target ? h('a', { class: 'btn', href: `#/read/${encodeURIComponent(id)}/${encodeURIComponent(target.id)}` }, cur ? `${t('cont')} · ${t('ch')} ${cur.chapter ?? ''}` : t('start')) : h('span', { class: 'btn', disabled: true }, t('start')),
          favBtn))),
    h('section', { class: 'chapters' },
      h('div', { class: 'head' }, h('strong', {}, t('chapters')), langBox, h('span', { class: 'sp' }),
        h('button', { class: 'chip', onclick: (e) => { asc = !asc; e.target.textContent = asc ? t('sort_asc') : t('sort_desc'); renderList(); } }, t('sort_desc'))),
      listBox));
}

/* ---------- reader ---------- */
async function reader(mangaId, chapterId) {
  document.body.classList.add('reading');
  $app.replaceChildren(h('div', { class: 'loading' }, t('loading')));
  let m, all, data;
  try {
    [m, all, data] = await Promise.all([
      api(`/manga/${encodeURIComponent(mangaId)}`), api(`/manga/${encodeURIComponent(mangaId)}/chapters`), api(`/chapter/${encodeURIComponent(chapterId)}`)]);
  } catch { return $app.replaceChildren(h('div', { class: 'rbar' }, h('a', { class: 'chip', href: `#/manga/${encodeURIComponent(mangaId)}` }, t('back'))), emptyMsg('error')); }
  const cur = all.find((c) => c.id === chapterId);
  const same = all.filter((c) => c.lang === cur?.lang);
  const idx = same.findIndex((c) => c.id === chapterId);
  const prev = same[idx - 1], next = same[idx + 1];
  if (cur) markRead(mangaId, cur);
  document.title = `${titleOf(m)} ${t('ch')} ${cur?.chapter ?? ''}`;

  let mode = store.get('mode', 'long');
  let width = store.get('width', 900);
  let page = 0;
  const urlOf = (c) => `#/read/${encodeURIComponent(mangaId)}/${encodeURIComponent(c.id)}`;
  const pagesBox = h('div', { class: 'pages' });
  const pgnum = h('span', { class: 'pgnum' });
  const mkImg = (i) => h('img', {
    src: safeUrl(data.pages[i]), alt: `${i + 1}`, loading: mode === 'long' ? 'lazy' : 'eager', decoding: 'async',
    onerror: (e) => { if (data.saver?.[i] && e.target.src !== data.saver[i]) e.target.src = data.saver[i]; },
  });
  const goNext = () => { if (next) location.hash = urlOf(next); else window.scrollTo({ top: document.body.scrollHeight }); };
  const goPrev = () => { if (prev) location.hash = urlOf(prev); };
  const show = () => {
    pagesBox.className = `pages ${mode === 'long' ? 'fitw' : 'paged'}`;
    pagesBox.style.setProperty('--w', `${width}px`);
    if (mode === 'long') { pagesBox.replaceChildren(...data.pages.map((_, i) => mkImg(i))); pgnum.textContent = `${data.pages.length} p.`; return; }
    const img = mkImg(page);
    img.onclick = (e) => (e.offsetX > img.clientWidth / 2 ? step(1) : step(-1));
    pagesBox.replaceChildren(img);
    pgnum.textContent = `${page + 1} / ${data.pages.length}`;
    [page + 1, page + 2].forEach((i) => { if (data.pages[i]) new Image().src = data.pages[i]; });
  };
  const step = (d) => {
    const n = page + d;
    if (n < 0) return goPrev();
    if (n >= data.pages.length) return goNext();
    page = n; show(); window.scrollTo({ top: 0 });
  };
  const select = h('select', { onchange: (e) => { location.hash = urlOf(same[e.target.value]); } },
    same.map((c, i) => h('option', { value: i, selected: i === idx }, `${t('ch')} ${c.chapter ?? '—'}`)));
  const bar = h('div', { class: 'rbar' },
    h('a', { class: 'chip', href: `#/manga/${encodeURIComponent(mangaId)}` }, t('back')),
    h('strong', { style: 'max-width:30vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, titleOf(m)),
    h('span', { class: 'sp' }),
    h('button', { class: 'chip', disabled: !prev, onclick: goPrev }, t('prev')), select, h('button', { class: 'chip', disabled: !next, onclick: goNext }, t('next')),
    pgnum,
    h('button', { class: 'chip', onclick: (e) => { mode = mode === 'long' ? 'page' : 'long'; store.set('mode', mode); page = 0; e.target.textContent = mode === 'long' ? t('mode_long') : t('mode_page'); show(); } }, mode === 'long' ? t('mode_long') : t('mode_page')),
    h('select', { title: t('fit'), onchange: (e) => { width = Number(e.target.value); store.set('width', width); show(); } },
      [600, 750, 900, 1100, 1400].map((w) => h('option', { value: w, selected: w === width }, `${t('fit')} ${w}`))));
  const foot = h('div', { class: 'rnav' },
    prev && h('a', { class: 'btn sec', href: urlOf(prev) }, t('prev')),
    next ? h('a', { class: 'btn', href: urlOf(next) }, t('next')) : h('span', { style: 'color:var(--mut)' }, t('end')));
  $app.replaceChildren(bar, pagesBox, foot);
  show();

  const key = (e) => {
    if (e.target.matches('input,select,textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'd') mode === 'page' ? step(1) : goNext();
    if (e.key === 'ArrowLeft' || e.key === 'a') mode === 'page' ? step(-1) : goPrev();
  };
  addEventListener('keydown', key);
  onDispose(() => removeEventListener('keydown', key));
  window.scrollTo({ top: 0 });
}

/* ---------- library ---------- */
function library() {
  const f = Object.values(favs());
  const hs = hist();
  const recent = Object.entries(hs).sort((a, b) => b[1].ts - a[1].ts).slice(0, 12);
  const known = { ...Object.fromEntries(f.map((x) => [x.id, x])) };
  const histBox = h('div', { class: 'row' });
  $app.replaceChildren(
    recent.length ? h('div', {}, h('div', { class: 'section-title' }, h('h2', {}, t('hist'))), histBox) : null,
    h('div', { class: 'section-title' }, h('h2', {}, t('fav')), h('small', {}, f.length)),
    f.length ? h('div', { class: 'grid' }, f.map(card)) : emptyMsg('empty_lib'));
  Promise.all(recent.map(([id]) => known[id] ? Promise.resolve(known[id]) : api(`/manga/${encodeURIComponent(id)}`).catch(() => null))).then((list) => {
    histBox.replaceChildren(...list.filter(Boolean).map((m) => {
      const c = card(m); c.href = `#/read/${encodeURIComponent(m.id)}/${encodeURIComponent(hs[m.id].chapterId)}`;
      c.querySelector('.m').textContent = `${t('ch')} ${hs[m.id].chapter ?? ''}`; return c;
    }));
  });
}

/* ---------- shell ---------- */
function applyChrome() {
  document.documentElement.lang = state.lang;
  document.documentElement.dataset.theme = state.theme;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.getElementById('searchInput').placeholder = t('search');
  document.getElementById('langBtn').textContent = state.lang === 'ru' ? 'RU · EN' : 'EN · RU';
  api('/config').then((c) => {
    document.getElementById('foot').replaceChildren(
      h('div', {}, c.demo ? `⚠ ${t('demo')} · ` : '', c.lastSync ? `${t('synced')}: ${new Date(c.lastSync).toLocaleString(state.lang === 'ru' ? 'ru-RU' : 'en-GB')}` : ''),
      h('div', {}, t('source')));
  }).catch(() => {});
}

async function route() {
  cleanup();
  const [path, query] = location.hash.slice(1).split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  document.title = 'MangaTimeline — Read Manga / Читать мангу';
  try {
    if (parts[0] === 'manga' && parts[1]) await detail(parts[1]);
    else if (parts[0] === 'read' && parts[2]) await reader(parts[1], parts[2]);
    else if (parts[0] === 'library') library();
    else await home(new URLSearchParams(query || ''));
  } catch (e) {
    console.error(e);
    $app.replaceChildren(emptyMsg('error'));
  }
  if (parts[0] !== 'read') window.scrollTo({ top: 0 });
}

document.getElementById('langBtn').onclick = () => { state.lang = state.lang === 'ru' ? 'en' : 'ru'; store.set('lang', state.lang); applyChrome(); route(); };
document.getElementById('themeBtn').onclick = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; store.set('theme', state.theme); applyChrome(); };
document.getElementById('searchForm').onsubmit = (e) => {
  e.preventDefault();
  const q = document.getElementById('searchInput').value.trim();
  location.hash = `#/?${qs({ q })}`;
};
addEventListener('hashchange', route);
applyChrome();
route();
