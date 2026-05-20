import { useEffect } from 'react';
import type { UiSettings } from '../types';

/**
 * Hook to manage application theme (Aegis Chroma)
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
