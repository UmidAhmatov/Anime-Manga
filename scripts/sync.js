// One-shot sync, handy for cron / CI:  npm run sync
import { config } from '../lib/config.js';
import { Store } from '../lib/store.js';
import { mangadex } from '../lib/mangadex.js';
import { mock } from '../lib/mock.js';
import { createSync } from '../lib/sync.js';

const store = new Store(config.dataDir);
const result = await createSync(config.mock ? mock : mangadex, store).run();
process.exit(result.error ? 1 : 0);
