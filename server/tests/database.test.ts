import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

describe('SQLite setup', () => {
  it('opens an in-memory database and runs a query', () => {
    const db = new Database(':memory:');
    expect(db.prepare('SELECT 1 AS value').get()).toEqual({ value: 1 });
    db.close();
  });
});
