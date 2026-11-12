import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dataDir, resolveDataDir } from '../src/config.js';

describe('data directory configuration', () => {
  it('resolves the default data directory from the server module location', () => {
    const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

    expect(dataDir).toBe(resolve(projectRoot, 'data'));
    expect(resolveDataDir(new URL('../src/config.js', import.meta.url).href)).toBe(dataDir);
    expect(resolveDataDir(new URL('../dist/config.js', import.meta.url).href)).toBe(dataDir);
  });

  it('uses DATA_DIR when provided', () => {
    expect(resolveDataDir(import.meta.url, 'custom-data')).toBe(resolve('custom-data'));
  });
});
