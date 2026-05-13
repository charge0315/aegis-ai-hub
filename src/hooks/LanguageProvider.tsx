import type { ReactNode } from 'react';
import type { Language, TranslationKeys } from '../i18n/translations';
import { LanguageContext } from './LanguageContext';

export interface LanguageProviderProps {
  children: ReactNode;
  language: Language;
  setLanguage: (l: Language) => void;
  t: TranslationKeys;
}

export const LanguageProvider = ({ children, language, setLanguage, t }: LanguageProviderProps) => {
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
