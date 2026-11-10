import type { AppConfig } from './app.js';

export const config: AppConfig = { port: Number(process.env.PORT ?? 3000) };
