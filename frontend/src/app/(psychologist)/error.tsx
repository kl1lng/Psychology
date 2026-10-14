'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function PsychologistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Psychologist dashboard error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif] mb-2">
          Ошибка в кабинете психолога
        </h2>
        <p className="text-sm text-[#464555] dark:text-zinc-400 mb-6">
          Не удалось загрузить данные психодиагностики или аналитики рисков. Попробуйте обновить данные.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 dark:text-zinc-600 mb-4 font-mono">
            Код: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Попробовать снова</span>
        </button>
      </div>
    </div>
  );
}
