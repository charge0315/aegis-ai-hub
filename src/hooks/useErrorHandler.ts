import { useCallback } from 'react';
import { useTranslation } from './useTranslationHook';
import type { DialogType } from '../components/CustomDialog';

/**
 * アプリケーション全体のエラーハンドリングを共通化するためのカスタムフック。
 * 
 * 【設計思想】
 * - 予期しない実行時エラーやAPIエラーを統一的なUI（ダイアログ）でユーザーに通知します。
 * - エラーの種類（Quota制限、一般的な例外など）を判別し、文脈に応じた最適なフィードバックを提供します。
 * 
 * 【実装の意図】
 * - `handleError` 関数は `useCallback` でラップされ、副作用のないエラー処理インターフェースを提供します。
 * - クォータ制限エラー（QUOTA_EXCEEDED）を特別に検出し、警告として提示することで、
 *   ユーザーが「障害」ではなく「制限」であることを理解できるようにしています。
 * - 技術的な詳細はダイアログの下部に分離して表示し、情報の正確性とアクセシビリティを両立しています。
 */
export function useErrorHandler(customAlert: (title: string, message: string, type?: DialogType) => Promise<void>) {
  const { t } = useTranslation();

  const handleError = useCallback(async (err: unknown, fallbackTitle: string, fallbackMessage: string) => {
    console.error(`[ErrorHandler] Error caught:`, err);
    
    const detail = err instanceof Error ? err.message : String(err);
    const isQuotaError = detail.includes('QUOTA_EXCEEDED');

    if (isQuotaError) {
      await customAlert(t.dialog.caution, t.handlers.quotaExceeded, 'warning');
      return true; // Handled as quota error
    }

    // Generic error handling
    const errorMessage = detail.length > 200 ? `${detail.substring(0, 200)}...` : detail;
    await customAlert(
      fallbackTitle,
      `${fallbackMessage}\n\nTechnical Detail: ${errorMessage}`,
      'error'
    );
    return false; // Handled as general error
  }, [customAlert, t]);

  return { handleError };
}
