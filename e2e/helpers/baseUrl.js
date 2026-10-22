// @ts-check

/** Playwright tenant. Override with BASE_URL. */
export const BASE = (process.env.BASE_URL || 'http://playwright.localhost:5173').replace(/\/$/, '');
