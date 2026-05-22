/**
 * 言語設定プロバイダーコンポーネント
 * 
 * LanguageContext を子コンポーネントに提供するためのラッパーです。
 * これにより、ツリー内の任意のコンポーネントから現在の言語設定にアクセス可能になります。
 */

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
