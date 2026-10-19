'use client';

import { useLanguage } from '@/context/language-context';
import { ThemeToggle } from '@/components/theme-toggle';

interface HeaderControlsProps {
  className?: string;
}

export function HeaderControls({ className = '' }: HeaderControlsProps) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`flex items-center gap-1 p-1 bg-gray-100 rounded-full dark:bg-neutral-800 ${className}`}
    >
      <ThemeToggle />
      <button
        type="button"
        onClick={() => setLang(lang === 'ru' ? 'kk' : 'ru')}
        title={lang === 'ru' ? 'Тілді қазақшаға ауыстыру' : 'Переключить на русский язык'}
        className="flex items-center justify-center h-8 px-3 rounded-full text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all duration-200 dark:text-gray-400 dark:hover:bg-neutral-700 dark:hover:text-gray-100 select-none"
      >
        {lang === 'ru' ? 'РУС' : 'ҚАЗ'}
      </button>
    </div>
  );
}

export default HeaderControls;
