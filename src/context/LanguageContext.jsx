import React, { createContext, useContext, useState } from 'react';
import { ru } from '../locales/ru';
import { en } from '../locales/en';

const locales = { ru, en };
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('sh_language') || 'ru';
    } catch {
      return 'ru';
    }
  });

  const setLanguage = (lang) => {
    if (locales[lang]) {
      setLanguageState(lang);
      try {
        localStorage.setItem('sh_language', lang);
      } catch (e) {
        console.error('Failed to save language preference:', e);
      }
    }
  };

  const t = (path) => {
    const keys = path.split('.');
    let current = locales[language] || locales.ru;

    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to Russian dictionary
        let fallback = locales.ru;
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) {
            fallback = fallback[fk];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    return typeof current === 'string' ? current : path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
