import { useState, useCallback } from 'react';
import type { DialogType } from '../components/CustomDialog';

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: React.ReactNode;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
  defaultValue?: string;
  placeholder?: string;
}

/**
 * カスタムダイアログの表示状態と、Promiseベースの命令的呼び出しを管理するカスタムフック。
 * 
 * 【設計思想】
 * - ダイアログの「表示」というUI操作を、関数呼び出しの結果を待機する Promise として抽象化します。
 * - これにより、ビジネスロジック内で `if (await confirm(...)) { ... }` のような同期的な記述が可能になり、
 *   コールバック地獄やフラグ管理の煩雑さを解消します。
 * 
 * 【実装の意図】
 * - `alert`, `confirm`, `prompt` の各関数は、`showDialog` を内部で呼び出し、ユーザーの応答（onConfirm/onCancel）
 *   によって Promise を resolve します。
 * - `hideDialog` を実行した後に resolve することで、ダイアログが閉じるアニメーションとロジックの実行タイミングを
 *   適切に制御しています。
 */
export function useDialog() {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showDialog = useCallback((params: Omit<DialogState, 'isOpen'>) => {
    setDialog({ ...params, isOpen: true });
  }, []);

  const hideDialog = useCallback(() => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const alert = useCallback((title: string, message: React.ReactNode, type: DialogType = 'alert') => {
    return new Promise<void>((resolve) => {
      showDialog({
        title,
        message,
        type,
        onConfirm: () => {
          hideDialog();
          resolve();
        }
      });
    });
  }, [showDialog, hideDialog]);

  const loading = useCallback((title: string, message: React.ReactNode) => {
    showDialog({
      title,
      message,
      type: 'loading',
      onConfirm: () => {}
    });
  }, [showDialog]);

  const confirm = useCallback((title: string, message: React.ReactNode, type: DialogType = 'confirm') => {
    return new Promise<boolean>((resolve) => {
      showDialog({
        title,
        message,
        type,
        onConfirm: () => {
          hideDialog();
          resolve(true);
        },
        onCancel: () => {
          hideDialog();
          resolve(false);
        }
      });
    });
  }, [showDialog, hideDialog]);

  const prompt = useCallback((title: string, message: React.ReactNode, defaultValue: string = '', placeholder: string = 'Type here...') => {
    return new Promise<string | null>((resolve) => {
      showDialog({
        title,
        message,
        type: 'prompt',
        defaultValue,
        placeholder,
        onConfirm: (value) => {
          hideDialog();
          resolve(value ?? null);
        },
        onCancel: () => {
          hideDialog();
          resolve(null);
        }
      });
    });
  }, [showDialog, hideDialog]);

  return { dialog, alert, confirm, prompt, loading, hideDialog };
}
