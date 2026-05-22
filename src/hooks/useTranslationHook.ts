import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';
import { getSafeTranslation } from '../i18n/translations';

/**
 * 言語設定（LanguageContext）に基づき、型安全な翻訳オブジェクト（t）を提供するカスタムフック。
 * 
 * 【設計思想】
 * - コンポーネントが直接 i18n のリソースにアクセスするのを防ぎ、コンテキスト経由で
 *   現在の言語に最適化された翻訳データを注入します。
 * - `getSafeTranslation` を通じて、翻訳キーの欠落を防ぎ、TypeScriptの型補完が効く環境を提供します。
 * 
 * 【実装の意図】
 * - コンテキストが未定義の場合にエラーをスローすることで、プロバイダーのラップ忘れを早期に検出し、
 *   実行時の予期しない動作を防止しています。
 * - `context` の全データ（language等）をスプレッドで返しつつ、翻訳オブジェクト `t` を追加することで、
 *   一つのフックで多言語化に必要な全ての情報にアクセスできるようにしています。
 */
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  
  const t = getSafeTranslation(context.language);
  
  return { 
    ...context,
    t 
  };
};
