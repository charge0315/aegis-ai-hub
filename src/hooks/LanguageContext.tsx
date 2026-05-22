/**
 * 言語設定のための React Context 定義
 * 
 * アプリケーション全体で現在の言語（日本語/英語）の状態を共有し、
 * 動的に切り替えるためのコンテキストを提供します。
 */

import { createContext } from 'react';
import type { Language } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
