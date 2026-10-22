// @ts-check
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const credentialsFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '.credentials.env'
);

/** Fill unset env vars from the gitignored local credentials file. */
export function loadLocalCredentials() {
  if (!fs.existsSync(credentialsFile)) return;

  for (const line of fs.readFileSync(credentialsFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
