import type Database from 'better-sqlite3';

export interface Settings {
  backup_dir: string;
  last_backup_at: string;
  last_backup_error: string;
}

const settingKeys = {
  backup_dir: 'backup_dir',
  last_backup_at: 'last_backup_at',
  last_backup_error: 'last_backup_error'
} as const;

export function getSettings(db: Database.Database): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const values = new Map(rows.map(({ key, value }) => [key, value]));
  return {
    backup_dir: values.get(settingKeys.backup_dir) ?? '',
    last_backup_at: values.get(settingKeys.last_backup_at) ?? '',
    last_backup_error: values.get(settingKeys.last_backup_error) ?? ''
  };
}

export function setSetting(db: Database.Database, key: keyof Settings, value: string): void {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(settingKeys[key], value);
}
