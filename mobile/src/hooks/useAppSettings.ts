import { useContext } from 'react';
import { AppSettingsContext, type AppSettingsValue } from './AppSettingsContext';

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
