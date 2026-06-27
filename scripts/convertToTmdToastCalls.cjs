const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const TARGET_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const HELPER_IMPORT = 'import { showBackendTextToast } from "../utils/errorTranslation";';
const HELPER_IMPORT_ALT = 'import { showBackendTextToast } from "../../utils/errorTranslation";';
const HELPER_IMPORT_ALT2 = 'import { showBackendTextToast } from "./utils/errorTranslation";';

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function slugify(text) {
  return String(text || "")
    .replace(/\$\{[^}]+\}/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

function hashString(input) {
  let hash = 0;
  const str = String(input || "");
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
}

function tmdIdFor(text) {
  const slug = slugify(text) || "MESSAGE";
  return `TMD_${slug.slice(0, 52)}_${hashString(text)}`;
}

function escapeSingleQuoted(text) {
  return text.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function relativeImportFor(filePath) {
  const rel = path.relative(path.dirname(filePath), path.join(SRC_DIR, "utils", "errorTranslation")).replace(/\\/g, "/");
  if (!rel.startsWith(".")) return `./${rel}`;
  return rel;
}

function convertFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let updated = original;
  let changes = 0;

  const regex = /toast\.(success|error)\(\s*(['"`])([^"`\n]*?)\2\s*\)/g;
  updated = updated.replace(regex, (full, type, quote, text) => {
    if (!text || text.includes("${")) return full;
    const tmdId = tmdIdFor(text);
    changes += 1;
    return `showBackendTextToast({ toast, tmdId: '${tmdId}', fallbackText: '${escapeSingleQuoted(text)}', type: '${type}' })`;
  });

  if (changes === 0) return { changed: false, changes: 0 };

  if (!updated.includes("showBackendTextToast")) {
    return { changed: false, changes: 0 };
  }

  if (!/import\s+\{\s*showBackendTextToast\s*\}\s+from\s+['"].*errorTranslation['"]/.test(updated)) {
    const importPath = relativeImportFor(filePath);
    const importLine = `import { showBackendTextToast } from '${importPath}';\n`;
    const firstImportIdx = updated.search(/^import\s/m);
    if (firstImportIdx >= 0) {
      updated = updated.slice(0, firstImportIdx) + importLine + updated.slice(firstImportIdx);
    } else {
      updated = importLine + updated;
    }
  }

  fs.writeFileSync(filePath, updated, "utf8");
  return { changed: true, changes };
}

function run() {
  const files = walk(SRC_DIR);
  let totalFiles = 0;
  let totalChanges = 0;
  const touched = [];

  for (const filePath of files) {
    if (filePath.includes("node_modules")) continue;
    const result = convertFile(filePath);
    if (result.changed) {
      totalFiles += 1;
      totalChanges += result.changes;
      touched.push(path.relative(path.join(__dirname, ".."), filePath));
    }
  }

  console.log(`Updated ${totalFiles} files with ${totalChanges} explicit tmd_id toast calls.`);
  if (touched.length) {
    console.log("Touched files:");
    touched.forEach((f) => console.log(`- ${f}`));
  }
}

run();

