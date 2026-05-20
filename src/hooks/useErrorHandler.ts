import { useCallback } from 'react';
import { useTranslation } from './useTranslationHook';
import type { DialogType } from '../components/CustomDialog';

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
