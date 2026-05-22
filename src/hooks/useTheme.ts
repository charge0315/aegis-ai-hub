import { useEffect } from 'react';
import type { UiSettings } from '../types';

/**
 * アプリケーションのテーマ（Aegis Chroma）を管理・適用し、OS設定と同期させるためのカスタムフック。
 * 
 * 【設計思想】
 * - 「Aegis Chroma」システムとして定義されたテーマ（Light / Dark / System）をDOM（html要素）に反映させ、
 *   CSS変数を通じた一貫したスタイリングを実現します。
 * 
 * 【実装の意図】
 * - `useEffect` を用いて、テーマ設定が変更されるたびに `data-theme` 属性と `color-scheme` スタイルを
 *   ドキュメントのルート要素に適用します。
 * - `window.matchMedia` を監視することで、OSのダークモード設定が変更された際に、
 *   ユーザーが「System」を選択していれば即座にUIへ反映されるリアクティブな設計にしています。
 */
export const useTheme = (theme: UiSettings['theme']) => {
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const effectiveTheme: 'light' | 'dark' = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;

      root.setAttribute('data-theme', effectiveTheme);
      root.style.colorScheme = effectiveTheme;
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
};
