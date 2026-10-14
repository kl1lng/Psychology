'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin dashboard error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-rose-500 dark:text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif] mb-2">
          Ошибка в панели управления
        </h2>
        <p className="text-sm text-[#464555] dark:text-zinc-400 mb-6">
          Произошла ошибка при загрузке данных администрирования. Попробуйте обновить страницу.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 dark:text-zinc-600 mb-4 font-mono">
            Код: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#3525cd] hover:bg-[#4f46e5] text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Попробовать снова</span>
        </button>
      </div>
    </div>
  );
}
