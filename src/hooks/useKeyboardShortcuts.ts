import { useEffect } from 'react';
import { nexusApi } from '../api/nexusApi';

/**
 * Hook to manage global keyboard shortcuts
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
