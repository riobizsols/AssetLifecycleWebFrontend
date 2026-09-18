// @ts-check

/** Frontend origin under test. Local CI default; override with BASE_URL. */
export const BASE = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
