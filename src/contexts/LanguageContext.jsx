import React, { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n, t } = useTranslation();
  const { user } = useAuthStore();

  const changeLanguage = async (language) => {
    try {
      await i18n.changeLanguage(language);
      // Store the selected language in localStorage
      localStorage.setItem('selectedLanguage', language);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const getCurrentLanguage = () => {
    return i18n.language;
  };

  const getAvailableLanguages = () => {
    return [
      { code: 'en', name: t('language.english'), flag: '🇺🇸' },
      { code: 'de', name: t('language.german'), flag: '🇩🇪' }
    ];
  };

  // Initialize language from user's language code or localStorage
  useEffect(() => {
    if (user?.language_code) {
      // User is logged in, use their language preference from auth API
      const userLanguage = user.language_code.toLowerCase();
      if (userLanguage !== i18n.language) {
        console.log('Setting language from user profile:', userLanguage);
        i18n.changeLanguage(userLanguage);
        localStorage.setItem('selectedLanguage', userLanguage);
      }
    } else {
      // User not logged in, check localStorage or browser default
      const savedLanguage = localStorage.getItem('selectedLanguage');
      if (savedLanguage && savedLanguage !== i18n.language) {
        i18n.changeLanguage(savedLanguage);
      }
    }
  }, [i18n, user?.language_code]);

  const value = {
    currentLanguage: getCurrentLanguage(),
    availableLanguages: getAvailableLanguages(),
    changeLanguage,
    t, // Expose translation function
    i18n
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
