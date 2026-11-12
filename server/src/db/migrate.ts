import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';

const migrations = [{ version: 1, file: '0001_init.sql' }] as const;

export function migrate(db: Database.Database): void {
  const currentVersion = Number(db.pragma('user_version', { simple: true }));
  const migrationDir = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');
  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    const sql = readFileSync(resolve(migrationDir, migration.file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${migration.version}`);
    })();
  }
}
