import Fastify, { type FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { API_PREFIX } from '@club-puntos/shared';

export interface AppConfig {
  port: number;
}

export interface BuildAppOptions {
  db: Database.Database;
  config: AppConfig;
}

export function buildApp({ db, config }: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger: false });
  void db;
  void config;
  app.get(`${API_PREFIX}/health`, async () => ({ status: 'ok' }));
  return app;
}
