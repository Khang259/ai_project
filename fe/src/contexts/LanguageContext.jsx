import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const normalizeLang = (lang) => {
  if (!lang) return 'vi';
  const code = lang.split('-')[0].toLowerCase();
  return code === 'en' ? 'en' : 'vi';
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(() => normalizeLang(i18n.language));

  useEffect(() => {
    const onLanguageChanged = (lng) => setCurrentLanguage(normalizeLang(lng));
    i18n.on('languageChanged', onLanguageChanged);
    setCurrentLanguage(normalizeLang(i18n.language));
    return () => i18n.off('languageChanged', onLanguageChanged);
  }, [i18n]);

  useEffect(() => {
    localStorage.setItem('language', currentLanguage);
  }, [currentLanguage]);

  const changeLanguage = (language) => {
    const code = normalizeLang(language);
    i18n.changeLanguage(code);
    setCurrentLanguage(code);
  };

  const value = {
    currentLanguage,
    changeLanguage,
    isVietnamese: currentLanguage === 'vi',
    isEnglish: currentLanguage === 'en'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
