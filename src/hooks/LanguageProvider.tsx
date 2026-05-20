import React from 'react';
import { LanguageContext } from './LanguageContext';
import type { Language } from '../i18n/translations';

interface LanguageProviderProps {
  value: {
    language: Language;
    setLanguage: (lang: Language) => void;
  };
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ value, children }) => {
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
