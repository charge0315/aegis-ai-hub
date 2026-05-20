import { useContext } from 'react';
import { LanguageContext } from './LanguageContext';
import { getSafeTranslation } from '../i18n/translations';

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
