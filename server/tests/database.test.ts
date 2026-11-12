import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { migrate } from '../src/db/migrate.js';

describe('SQLite setup', () => {
  it('opens an in-memory database and runs a query', () => {
    const db = new Database(':memory:');
    expect(db.prepare('SELECT 1 AS value').get()).toEqual({ value: 1 });
    db.close();
  });

  it('applies initial data once and keeps the schema version', () => {
    const db = new Database(':memory:');
    migrate(db);
    migrate(db);
    expect(db.pragma('user_version', { simple: true })).toBe(1);
    expect(db.prepare('SELECT name FROM products ORDER BY sort_order').all()).toEqual([
      { name: 'Cucurucho' }, { name: 'Barquillo' }, { name: '1/4 kg' }, { name: '1/2 kg' }, { name: '1 kg' }
    ]);
    expect(db.prepare('SELECT name, type, cost_points, discount_percent FROM rewards ORDER BY sort_order').all()).toEqual([
      { name: 'Cucurucho gratis', type: 'product', cost_points: 50, discount_percent: null },
      { name: 'Barquillo gratis', type: 'product', cost_points: 50, discount_percent: null },
      { name: '50% en 1 kg', type: 'discount', cost_points: 250, discount_percent: 50 }
    ]);
    expect(db.prepare("SELECT rewards.name AS reward, products.name AS product FROM rewards JOIN products ON products.id = rewards.product_id ORDER BY rewards.sort_order").all()).toEqual([
      { reward: 'Cucurucho gratis', product: 'Cucurucho' }, { reward: 'Barquillo gratis', product: 'Barquillo' }, { reward: '50% en 1 kg', product: '1 kg' }
    ]);
    expect(db.prepare('SELECT key, value FROM settings ORDER BY key').all()).toEqual([
      { key: 'backup_dir', value: '' }, { key: 'last_backup_at', value: '' }, { key: 'last_backup_error', value: '' }
    ]);
    expect(db.prepare("SELECT name FROM pragma_table_info('products')").all()).toEqual([
      { name: 'id' }, { name: 'name' }, { name: 'earn_points' }, { name: 'sort_order' }, { name: 'active' }
    ]);
    expect(db.prepare("SELECT COUNT(*) AS count FROM settings WHERE key IN ('username', 'password_hash')").get()).toEqual({ count: 0 });
    db.close();
  });
});
