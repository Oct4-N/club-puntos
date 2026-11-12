import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildApp } from './app.js';
import { config, dataDir } from './config.js';
import { openDatabase } from './db/connection.js';
import { migrate } from './db/migrate.js';

mkdirSync(dataDir, { recursive: true });
const db = openDatabase(join(dataDir, 'puntos.db'));
migrate(db);
const app = buildApp({ db, config });

await app.listen({ port: config.port, host: '127.0.0.1' });
