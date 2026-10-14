'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Student portal error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif] mb-2">
          Что-то пошло не так
        </h2>
        <p className="text-sm text-[#464555] dark:text-zinc-400 mb-6">
          Не удалось загрузить раздел или страницу тестирования.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 dark:text-zinc-600 mb-4 font-mono">
            Код: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Попробовать снова</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-900 border border-[#c7c4d8]/50 dark:border-zinc-800 text-[#0b1c30] dark:text-zinc-200 rounded-xl font-semibold text-sm transition-all hover:bg-[#eff4ff] dark:hover:bg-zinc-800"
          >
            <Home className="w-4 h-4" />
            <span>На главную</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
