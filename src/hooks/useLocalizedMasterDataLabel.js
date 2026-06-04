import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { translateMasterDataLabel } from '../utils/masterDataLabel';

/**
 * Re-renders when UI language changes so master-data dropdown labels stay translated.
 */
export function useLocalizedMasterDataLabel() {
  const { t, i18n } = useLanguage();
  const [language, setLanguage] = useState(i18n.language);

  useEffect(() => {
    const onLanguageChanged = (lng) => setLanguage(lng);
    i18n.on('languageChanged', onLanguageChanged);
    setLanguage(i18n.language);
    return () => i18n.off('languageChanged', onLanguageChanged);
  }, [i18n]);

  const label = useCallback(
    (text) => translateMasterDataLabel(text, t),
    [t, language]
  );

  return { label, language, isGerman: String(language || '').toLowerCase().startsWith('de') };
}
