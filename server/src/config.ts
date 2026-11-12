import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppConfig } from './app.js';

export function resolveDataDir(moduleUrl: string, override?: string): string {
  return override ? resolve(override) : resolve(dirname(fileURLToPath(moduleUrl)), '../../data');
}

export const dataDir = resolveDataDir(import.meta.url, process.env.DATA_DIR);
export const config: AppConfig = { port: Number(process.env.PORT ?? 3000) };
