import { useEffect } from 'react';
import { nexusApi } from '../api/nexusApi';

/**
 * グローバルなキーボードショートカットを登録・管理するカスタムフック。
 * 
 * 【設計思想】
 * - マウス操作に頼らずに主要な機能（コマンドパレット、終了など）にアクセスできるようにし、
 *   パワーユーザーの生産性を向上させます。
 * 
 * 【実装の意図】
 * - `useEffect` 内で `window.addEventListener` を使用してグローバルリスナーを登録します。
 * - ブラウザやOSのデフォルトショートカット（Ctrl+Kなど）と競合する場合、`e.preventDefault()` で
 *   意図したアクションのみを実行するように制御しています。
 * - `actions` オブジェクトが変更された際にリスナーを再登録するよう依存配列を設定し、常に最新の
 *   ハンドラが呼び出されるようにしています。
 */
export const useKeyboardShortcuts = (actions: {
  toggleCommandPalette: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        actions.toggleCommandPalette();
      }
      if (e.key === 'q' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        nexusApi?.windowControl?.('quit');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
};
