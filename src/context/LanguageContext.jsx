import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../constants/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('sh_language') || 'ru';
    } catch {
      return 'ru';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sh_language', language);
    } catch {
      // Ignore localStorage write failures
    }
  }, [language]);

  const dictionary = translations[language] || translations.ru;

  // Backward-compatible translator function
  const t = (key) => dictionary[key] || key;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dictionary
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
}
