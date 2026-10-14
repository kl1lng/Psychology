'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lang, dictionaries } from '@/lib/dictionaries';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: typeof dictionaries.ru;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>('ru');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem('app_lang') as Lang;
    if (stored === 'ru' || stored === 'kk') {
      setLangState(stored);
    }
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const t = dictionaries[lang] || dictionaries.ru;

  if (!isMounted) {
    return (
      <LanguageContext.Provider value={{ lang: 'ru', setLang, t: dictionaries.ru }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
