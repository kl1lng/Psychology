'use client';

import React from 'react';
import { Loader2, Sparkles, GraduationCap, ShieldCheck } from 'lucide-react';
import { LogoIcon } from '@/components/ui/logo-icon';

interface StitchLoaderProps {
  title?: string;
  subtitle?: string;
  type?: 'admin' | 'teacher' | 'student' | 'psychologist' | 'general';
}

export function StitchLoader({
  title = 'Загрузка данных...',
  subtitle = 'Подготовка рабочего пространства платформы AISezim',
  type = 'general',
}: StitchLoaderProps) {
  let accentBadge = 'bg-[#e5eeff] dark:bg-indigo-950/60 text-[#3525cd] dark:text-indigo-300';
  let accentIcon = <LogoIcon className="w-5 h-5" />;
  let portalName = 'Платформа AISezim';

  if (type === 'admin') {
    accentBadge = 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300';
    accentIcon = <ShieldCheck className="w-5 h-5" />;
    portalName = 'AISezim · Администратор';
  } else if (type === 'teacher') {
    accentBadge = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300';
    accentIcon = <GraduationCap className="w-5 h-5" />;
    portalName = 'AISezim · Учитель';
  } else if (type === 'student') {
    accentBadge = 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300';
    accentIcon = <Sparkles className="w-5 h-5" />;
    portalName = 'AISezim · Ученик';
  } else if (type === 'psychologist') {
    accentBadge = 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300';
    accentIcon = <LogoIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    portalName = 'AISezim · Психолог';
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9ff] dark:bg-zinc-950 px-4 py-8 transition-colors duration-300">
      <div className="relative flex flex-col items-center max-w-sm w-full p-8 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] text-center animate-fade-in">
        {/* Glow ambient background behind card */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-36 h-36 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Portal Pill */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 border border-slate-200/60 dark:border-zinc-700/50 shadow-2xs ${accentBadge}`}>
          {accentIcon}
          <span className="font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">{portalName}</span>
        </div>

        {/* Premium Spinner with Pulse Ring */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-14 h-14 rounded-full bg-indigo-500/10 dark:bg-indigo-400/10 animate-ping" />
          <div className="w-12 h-12 rounded-2xl bg-[#eff4ff] dark:bg-zinc-800 flex items-center justify-center text-[#3525cd] dark:text-indigo-400 shadow-inner">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </div>

        {/* Title and Subtitle */}
        <h3 className="text-base font-bold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif] tracking-tight mb-1.5">
          {title}
        </h3>
        <p className="text-xs text-[#464555] dark:text-zinc-400 font-medium animate-pulse leading-relaxed max-w-[260px]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
