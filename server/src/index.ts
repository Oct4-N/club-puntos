import Database from 'better-sqlite3';
import { buildApp } from './app.js';
import { config } from './config.js';

const db = new Database(':memory:');
const app = buildApp({ db, config });

await app.listen({ port: config.port + 1, host: '127.0.0.1' });
