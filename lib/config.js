import path from 'node:path';

const env = process.env;
const list = (v, d) => (v ?? d).split(',').map((s) => s.trim()).filter(Boolean);

export const config = {
  port: Number(env.PORT) || 3000,
  dataDir: env.DATA_DIR || path.resolve('data'),
  startYear: Number(env.START_YEAR) || 1990,
  perYear: Number(env.PER_YEAR) || 60,
  syncMinutes: Number(env.SYNC_INTERVAL_MIN) || 30,
  langs: list(env.LANGS, 'ru,en'),
  ratings: list(env.CONTENT_RATINGS, 'safe,suggestive'),
  mock: env.MOCK === '1',
  mockLive: env.MOCK_LIVE === '1',
  adminToken: env.ADMIN_TOKEN || '',
  api: env.MANGADEX_API || 'https://api.mangadex.org',
};
