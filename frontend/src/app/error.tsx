'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error caught by Error Boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff] dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-rose-500 dark:text-rose-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif] mb-2">
          Что-то пошло не так
        </h1>

        {/* Description */}
        <p className="text-sm text-[#464555] dark:text-zinc-400 mb-8 leading-relaxed">
          Произошла непредвиденная ошибка. Наша команда уже уведомлена.
          Попробуйте обновить страницу или вернуться на главную.
        </p>

        {/* Error digest (for support tickets, non-sensitive) */}
        {error.digest && (
          <p className="text-xs text-slate-400 dark:text-zinc-600 mb-6 font-mono">
            Код ошибки: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#3525cd] hover:bg-[#4f46e5] text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Попробовать снова</span>
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-900 border border-[#c7c4d8]/50 dark:border-zinc-800 text-[#0b1c30] dark:text-zinc-200 rounded-xl font-semibold text-sm transition-all hover:bg-[#eff4ff] dark:hover:bg-zinc-800"
          >
            <span>На главную</span>
          </a>
        </div>
      </div>
    </div>
  );
}
