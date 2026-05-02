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

export function useDialog() {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    type: 'info',
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

  const alert = useCallback((title: string, message: React.ReactNode, type: DialogType = 'info') => {
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

  const confirm = useCallback((title: string, message: React.ReactNode) => {
    return new Promise<boolean>((resolve) => {
      showDialog({
        title,
        message,
        type: 'confirm',
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
        type,
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

  return { dialog, alert, confirm, prompt, hideDialog };
}
