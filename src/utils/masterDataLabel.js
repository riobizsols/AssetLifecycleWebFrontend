import i18n from '../i18n/config';

/** English DB labels → i18n key under masterDataLabels (case-insensitive) */
const EXACT_LABEL_KEYS = {
  'AC Unit': 'acUnit',
  'Air Conditioner': 'airConditioner',
  'Backup Power / Generator': 'backupPowerGenerator',
  'asset is efficient': 'assetIsEfficient',
  'Asset is efficient': 'assetIsEfficient',
  'Blue Star Generator 5': 'blueStarGenerator5',
  'Automatic Transfer Switch (ATS) Panel': 'atsPanel',
  'Diesel Generator Set (DG Set)': 'dieselGeneratorSet',
  'Product Development': 'productDevelopment',
  'Quality Assurance': 'qualityAssurance',
  'Marketing & Promotions': 'marketingAndPromotions',
  'Field Maintenance Team': 'fieldMaintenanceTeam',
  'Office Chairs': 'officeChairs',
  'Printer': 'printer',
  'Vehicle': 'vehicle',
  'CCTV Surveillance Camera': 'cctvSurveillanceCamera',
  'CCTV': 'cctv',
  'CCTV Camera': 'cctvCamera',
  'Emergency Alarm System': 'emergencyAlarmSystem',
  'Fire Extinguisher': 'fireExtinguisher',
  'Fan': 'fan',
  'Mirror': 'mirror',
  'Projector': 'projector',
  'UPS': 'ups',
  'Uninterruptible Power Supply': 'ups',
  'water dispenser': 'waterDispenser',
  'Water Dispenser': 'waterDispenser',
  'Router': 'router',
  'Server': 'server',
  'Software': 'software',
  'Laptop': 'laptop',
  'Furniture': 'furniture',
  'Generator': 'generator',
  'Mobile Phone': 'mobilePhone',
  'LCD Monitor': 'lcdMonitor',
  'Lift': 'lift',
  'Lockers': 'lockers',
  'Vehicle - Car': 'vehicleCar',
  'Vehicle - Truck': 'vehicleTruck',
  'Vehicle - Bus': 'vehicleBus',
  'Table': 'table',
  'Equipment Repair Unit': 'equipmentRepairUnit',
  'Sales Manager': 'salesManager',
  'IT Support': 'itSupport',
  'IT-Support': 'itSupport',
  'Operations': 'operations',
  'Finance': 'finance',
  'IT': 'it',
  'Human Resources': 'humanResources',
  'Administration': 'administration',
  'Procurement': 'procurement',
  'Logistics': 'logistics',
  'Warehouse': 'warehouse',
  'Desktop': 'desktop',
  'Desktop Computer': 'desktopComputer',
  'Computer': 'computer',
  'Telephone': 'telephone',
  'Phone': 'phone',
  'Monitor': 'monitor',
  'Chair': 'chair',
  'Desk': 'desk',
};

let englishToGermanMap = null;
let mapLanguageVersion = '';

function normalizeLookupText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

/** DB may store "Department Name (CODE)" — try both full and stripped forms */
function getLookupCandidates(text) {
  const trimmed = normalizeLookupText(text);
  if (!trimmed) return [];

  const candidates = [trimmed];
  const withoutTrailingParen = trimmed.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  if (withoutTrailingParen && withoutTrailingParen !== trimmed) {
    candidates.push(withoutTrailingParen);
  }
  return candidates;
}

function isGermanLanguage() {
  const lang = String(i18n.resolvedLanguage || i18n.language || '').toLowerCase();
  return lang.startsWith('de');
}

function buildEnglishToGermanMap() {
  const version = `${i18n.language}-${i18n.resolvedLanguage}`;
  if (englishToGermanMap && mapLanguageVersion === version) {
    return englishToGermanMap;
  }

  const enLabels = i18n.getResourceBundle('en', 'translation')?.masterDataLabels || {};
  const deLabels = i18n.getResourceBundle('de', 'translation')?.masterDataLabels || {};
  const map = new Map();

  Object.keys(enLabels).forEach((key) => {
    if (key === 'branchNamed') return;
    const enText = enLabels[key];
    const deText = deLabels[key];
    if (!enText || !deText || typeof enText !== 'string' || typeof deText !== 'string') return;

    getLookupCandidates(enText).forEach((variant) => {
      map.set(variant, deText);
      map.set(variant.toLowerCase(), deText);
    });
  });

  englishToGermanMap = map;
  mapLanguageVersion = version;
  return map;
}

function resolveExactKey(text) {
  const trimmed = text.trim();
  if (EXACT_LABEL_KEYS[trimmed]) return EXACT_LABEL_KEYS[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [en, key] of Object.entries(EXACT_LABEL_KEYS)) {
    if (en.toLowerCase() === lower) return key;
  }
  return null;
}

/** "Marketing & Promotions" → marketingAndPromotions */
export function toMasterDataLabelKey(text) {
  const normalized = String(text || '')
    .trim()
    .replace(/\s*&\s*/gi, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  if (!normalized) return '';
  return normalized
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function lookupByI18nKey(key, t) {
  if (!key) return null;
  const fullKey = `masterDataLabels.${key}`;
  if (!i18n.exists(fullKey, { lng: 'de' })) return null;
  const translated = t(fullKey);
  if (!translated || translated === fullKey || translated.startsWith('masterDataLabels.')) {
    return null;
  }
  return translated;
}

function lookupFromLocalePairs(text) {
  const map = buildEnglishToGermanMap();
  for (const candidate of getLookupCandidates(text)) {
    const hit = map.get(candidate) || map.get(candidate.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/**
 * Translate master-data labels stored in English in the database when UI language is German.
 */
export function translateMasterDataLabel(text, t = (key, opts) => i18n.t(key, opts)) {
  if (!text || typeof text !== 'string') return text;
  if (!isGermanLanguage()) return text;

  const deT = i18n.getFixedT('de', 'translation');

  for (const candidate of getLookupCandidates(text)) {
    const fromPairs = lookupFromLocalePairs(candidate);
    if (fromPairs) return fromPairs;

    const exactKey = resolveExactKey(candidate);
    if (exactKey) {
      const translated = lookupByI18nKey(exactKey, deT);
      if (translated) return translated;
    }

    const slugKey = toMasterDataLabelKey(candidate);
    const slugTranslated = lookupByI18nKey(slugKey, deT);
    if (slugTranslated) return slugTranslated;
  }

  const trimmed = normalizeLookupText(text);
  const branchMatch = trimmed.match(/^(.+?)\s+Branch$/i);
  if (branchMatch) {
    const translated = deT('masterDataLabels.branchNamed', { name: branchMatch[1].trim() });
    if (translated && !translated.startsWith('masterDataLabels.')) return translated;
  }

  return text;
}

/** Clear cached map when language bundles reload */
export function resetMasterDataLabelCache() {
  englishToGermanMap = null;
  mapLanguageVersion = '';
}
