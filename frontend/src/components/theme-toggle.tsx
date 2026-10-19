'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center opacity-40 ${className}`}
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label="Переключить тему"
      title={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all duration-200 dark:text-gray-400 dark:hover:bg-neutral-700 dark:hover:text-gray-100 ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute flex items-center justify-center"
            >
              <Moon className="w-4 h-4 text-current" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ scale: 0.5, rotate: 90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute flex items-center justify-center"
            >
              <Sun className="w-4 h-4 text-current" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showLabel && (
        <span className="text-xs font-medium pl-1.5 pr-1 select-none">
          {isDark ? 'Тёмная' : 'Светлая'}
        </span>
      )}
    </button>
  );
}
