/**
 * Merge missing keys from en.json into de.json (only add, never overwrite existing de keys)
 */
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const enPath = path.join(localesDir, 'en.json');
const dePath = path.join(localesDir, 'de.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const de = JSON.parse(fs.readFileSync(dePath, 'utf8'));

function deepMergeInto(target, source) {
  let added = 0;
  for (const key of Object.keys(source)) {
    if (!(key in target)) {
      target[key] = typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])
        ? JSON.parse(JSON.stringify(source[key]))
        : source[key];
      added++;
    } else if (
      typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key]) &&
      typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])
    ) {
      added += deepMergeInto(target[key], source[key]);
    }
  }
  return added;
}

const added = deepMergeInto(de, en);
fs.writeFileSync(dePath, JSON.stringify(de, null, 2) + '\n', 'utf8');
console.log('Merged', added, 'missing keys from en into de.');
process.exit(0);
