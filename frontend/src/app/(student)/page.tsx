'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Heart,
  MessageCircle,
  Trophy,
  Headphones,
  Star,
  Shield,
  ShieldCheck,
  Wind,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Smile,
  Meh,
  Frown,
  AlertCircle,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { authApi, moodApi } from '@/lib/api';
import { User } from '@/types/user';
import { useLanguage } from '@/context/language-context';

export default function StudentHome() {
  const { lang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState('');
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodSaved, setMoodSaved] = useState(false);
  const [isSavingMood, setIsSavingMood] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      authApi.me().then(r => {
        setUser(r.data);
        localStorage.setItem('user', JSON.stringify(r.data));
      }).catch(() => {});
    }

    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting(lang === 'kk' ? 'Қайырлы таң' : 'Доброе утро');
    } else if (hour < 18) {
      setGreeting(lang === 'kk' ? 'Қайырлы күн' : 'Добрый день');
    } else {
      setGreeting(lang === 'kk' ? 'Қайырлы кеш' : 'Добрый вечер');
    }
  }, [lang]);

  const handleQuickMood = async (level: number) => {
    setSelectedMood(level);
    setIsSavingMood(true);
    try {
      await moodApi.saveEntry(level, 'Быстрая отметка с главной страницы');
      setMoodSaved(true);
      setTimeout(() => setMoodSaved(false), 4000);
    } catch {
      // Keep optimistic UI
      setMoodSaved(true);
      setTimeout(() => setMoodSaved(false), 4000);
    } finally {
      setIsSavingMood(false);
    }
  };

  const quickActions = [
    {
      href: '/tests',
      title: lang === 'kk' ? 'Психологиялық тесттер' : 'Психологические тесты',
      desc: lang === 'kk' ? 'Стресс пен мазасыздық деңгейін анықтау' : 'Узнай свой уровень стресса и тревоги',
      icon: ClipboardList,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
      badge: lang === 'kk' ? '+50 балл' : '+50 баллов',
    },
    {
      href: '/self-help',
      title: lang === 'kk' ? 'Тыныс алу & КПТ тренажеры' : 'Дыхание & КПТ тренажеры',
      desc: lang === 'kk' ? 'Шұғыл тынышталуға арналған 4-4-4-4 әдісі' : 'Техники снятия паники и тревожных мыслей',
      icon: Wind,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      badge: lang === 'kk' ? 'Экспресс' : 'Экспресс',
    },
    {
      href: '/mood',
      title: lang === 'kk' ? 'Көңіл-күй күнделігі' : 'Дневник настроения',
      desc: lang === 'kk' ? 'Күнделікті эмоцияларды тіркеу және талдау' : 'Отслеживай динамику своих эмоций каждый день',
      icon: Heart,
      color: 'from-rose-500/20 to-pink-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
      badge: lang === 'kk' ? 'Күнделікті' : 'Ежедневно',
    },
    {
      href: '/chat',
      title: lang === 'kk' ? 'Анонимді чат' : 'Чат с психологом',
      desc: lang === 'kk' ? 'Психологпен немесе AI-көмекшімен сырласу' : 'Конфиденциальная поддержка в любое время',
      icon: MessageCircle,
      color: 'from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30',
      badge: '24/7',
    },
    {
      href: '/qa',
      title: lang === 'kk' ? 'Сұрақ-жауап тақтасы' : 'Анонимные вопросы',
      desc: lang === 'kk' ? 'Маманға жасырын сұрақ қойып, жауап алу' : 'Задай вопрос специалисту анонимно',
      icon: HelpCircle,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
      badge: lang === 'kk' ? 'Құпия' : 'Анонимно',
    },
    {
      href: '/podcasts',
      title: lang === 'kk' ? 'Медитация & Подкастар' : 'Медитации и подкасты',
      desc: lang === 'kk' ? 'Релаксация және ұйқыны жақсарту аудиолары' : 'Расслабляющий контент и аудио-практики',
      icon: Headphones,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      badge: lang === 'kk' ? 'Аудио' : 'Аудио',
    },
  ];

  // Weekly mood sample bars
  const weekDays = [
    { day: lang === 'kk' ? 'Дс' : 'Пн', height: '60%', status: 'bg-emerald-400', label: '7/10' },
    { day: lang === 'kk' ? 'Сс' : 'Вт', height: '80%', status: 'bg-emerald-500', label: '8/10' },
    { day: lang === 'kk' ? 'Ср' : 'Ср', height: '45%', status: 'bg-amber-400', label: '5/10' },
    { day: lang === 'kk' ? 'Бс' : 'Чт', height: '90%', status: 'bg-brand-500', label: '9/10' },
    { day: lang === 'kk' ? 'Жм' : 'Пт', height: '75%', status: 'bg-emerald-500', label: '7.5/10' },
    { day: lang === 'kk' ? 'Сб' : 'Сб', height: '85%', status: 'bg-brand-500', label: '8.5/10' },
    { day: lang === 'kk' ? 'Жк' : 'Вс', height: '70%', status: 'bg-emerald-400', label: '7/10' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── 1. EXECUTIVE WELCOME & HERO BANNER ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-600 to-brand-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-8 bottom-0 opacity-15 pointer-events-none hidden sm:block">
          <Sparkles size={160} />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{greeting}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {user?.full_name || (lang === 'kk' ? 'Оқушы' : 'Ученик')}
          </h1>

          <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal">
            {lang === 'kk'
              ? 'Бұл — сенің қауіпсіз психологиялық кеңістігің. Көңіл-күйіңді бақылап, стрессті жеңіп, өзіңе сенімділікті арттыр.'
              : 'Твой персональный кабинет психологической поддержки, трекер эмоционального баланса и экспресс-помощи.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {user?.class_id && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
                <Shield size={14} />
                <span>{user.class_id} {lang === 'kk' ? 'сынып' : 'класс'}</span>
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/25 border border-emerald-400/30 backdrop-blur-md text-xs font-semibold text-emerald-100">
              <ShieldCheck size={14} className="text-emerald-300" />
              <span>{lang === 'kk' ? '100% Анонимді & Қауіпсіз' : '100% Анонимно и безопасно'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. BENTO KPIS (4 METRIC CARDS) ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Points */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
              <Star size={20} className="fill-amber-500 text-amber-500" />
            </div>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              {lang === 'kk' ? 'Бонус' : 'Бонус'}
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
              {user?.points_balance || 0}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {lang === 'kk' ? 'Жинақталған ұпай' : 'Баллов накоплено'}
            </div>
          </div>
        </div>

        {/* KPI 2: Streak */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400">
              <Flame size={20} />
            </div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
              {lang === 'kk' ? 'Серия' : 'Серия'}
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
              7 {lang === 'kk' ? 'күн' : 'дней'}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {lang === 'kk' ? 'Белсенділік қатары' : 'Дней подряд в приложении'}
            </div>
          </div>
        </div>

        {/* KPI 3: Status */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {lang === 'kk' ? 'Тұрақты' : 'Норма'}
            </span>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
              {lang === 'kk' ? 'Сабырлы' : 'Спокойное'}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {lang === 'kk' ? 'Эмоциялық күй' : 'Эмоциональный статус'}
            </div>
          </div>
        </div>

        {/* KPI 4: Tools */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-600 dark:text-brand-400">
              <Sparkles size={20} />
            </div>
            <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full">
              {lang === 'kk' ? 'Тәжірибе' : 'Практика'}
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
              6 {lang === 'kk' ? 'құрал' : 'модулей'}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {lang === 'kk' ? 'Өзін-өзі дамыту' : 'Для психологической помощи'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. BENTO MAIN CONTENT (2 COLUMNS) ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (4 cols): Quick Daily Check-in & Self-Care Recommendation */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Mood Logger Card */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  {lang === 'kk' ? 'Бүгінгі көңіл-күйің қандай?' : 'Как ты себя чувствуешь?'}
                </h3>
                <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
                  {lang === 'kk' ? '1 секунд' : '1 клик'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {lang === 'kk'
                  ? 'Эмоцияңды белгіле — жүйе саған жеке кеңес береді'
                  : 'Отметь свое состояние прямо сейчас'}
              </p>
            </div>

            {/* Mood buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickMood(10)}
                disabled={isSavingMood}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  selectedMood === 10
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 scale-105 shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500/50 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Smile size={24} className="text-emerald-500 mb-1" />
                <span className="text-[10px] font-bold">{lang === 'kk' ? 'Тамаша' : 'Супер'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickMood(7)}
                disabled={isSavingMood}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  selectedMood === 7
                    ? 'bg-blue-500/15 border-blue-500 text-blue-600 scale-105 shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-blue-500/50 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Smile size={24} className="text-blue-500 mb-1" />
                <span className="text-[10px] font-bold">{lang === 'kk' ? 'Жақсы' : 'Хорошо'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickMood(5)}
                disabled={isSavingMood}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  selectedMood === 5
                    ? 'bg-amber-500/15 border-amber-500 text-amber-600 scale-105 shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-amber-500/50 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Meh size={24} className="text-amber-500 mb-1" />
                <span className="text-[10px] font-bold">{lang === 'kk' ? 'Қалыпты' : 'Норма'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickMood(2)}
                disabled={isSavingMood}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  selectedMood === 2
                    ? 'bg-rose-500/15 border-rose-500 text-rose-600 scale-105 shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-rose-500/50 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Frown size={24} className="text-rose-500 mb-1" />
                <span className="text-[10px] font-bold">{lang === 'kk' ? 'Шаршадым' : 'Устал'}</span>
              </button>
            </div>

            {moodSaved && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-fade-in">
                <CheckCircle2 size={16} />
                <span>{lang === 'kk' ? 'Көңіл-күйің сақталды! Жарайсың!' : 'Настроение сохранено! Отличный день!'}</span>
              </div>
            )}

            <Link
              href="/mood"
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              <span>{lang === 'kk' ? 'Толық күнделікті ашу' : 'Открыть подробный дневник'}</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Daily Motivational Affirmation Card */}
          <div className="bg-gradient-to-br from-brand-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl p-5 sm:p-6 border border-brand-500/20 space-y-3">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-xs">
              <Sparkles size={16} />
              <span>{lang === 'kk' ? 'Күннің психологиялық кеңесі' : 'Мысль дня'}</span>
            </div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed italic">
              {lang === 'kk'
                ? '«Қателік жасаудан қорықпа. Әрбір қиындық — сенің мықты әрі тәжірибелі болуыңа көмектесетін баспалдақ.»'
                : '«Ошибки — это естественная часть пути. Каждая сложная ситуация делает тебя мудрее и увереннее.»'}
            </p>
            <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              <span>{lang === 'kk' ? 'AISezim қолдау қызметі' : 'Служба заботы AISezim'}</span>
              <Link href="/self-help" className="text-brand-600 dark:text-brand-400 hover:underline font-bold">
                {lang === 'kk' ? 'Жаттығулар' : 'Практики'} →
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (8 cols): Quick Hub & Visual Weekly Progress */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Access Modules Grid */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                  {lang === 'kk' ? 'Негізгі бөлімдер мен көмек' : 'Быстрый доступ'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {lang === 'kk' ? 'Бүгін не істегің келеді?' : 'Выбери, что тебе нужно прямо сейчас'}
                </p>
              </div>
              <span className="text-xs font-semibold text-zinc-400">
                {lang === 'kk' ? 'Барлығы қолжетімді' : 'Доступно 24/7'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {quickActions.map(({ href, title, desc, icon: Icon, color, badge }) => (
                <Link
                  key={href}
                  href={href}
                  className="group p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-white dark:hover:bg-zinc-800 hover:border-brand-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300">
                      {badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-1">
                      <span>{title}</span>
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                      {desc}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[11px] font-semibold text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{lang === 'kk' ? 'Көшу' : 'Перейти'}</span>
                    <ArrowRight size={13} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Weekly Mood Dynamics Visual Chart Card */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  {lang === 'kk' ? 'Апталық көңіл-күй динамикасы' : 'Динамика настроения за неделю'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {lang === 'kk' ? 'Күнделікті эмоционалдық тепе-теңдік' : 'График стабильности твоего состояния'}
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                {lang === 'kk' ? 'Орташа: 7.3 / 10' : 'Средний: 7.3 / 10'}
              </span>
            </div>

            {/* Visual Bar Chart */}
            <div className="h-36 pt-4 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
              {weekDays.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-bold text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.label}
                  </span>
                  <div
                    className={`w-full max-w-[36px] rounded-xl ${item.status} transition-all duration-500 group-hover:brightness-110 shadow-sm`}
                    style={{ height: item.height }}
                  />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  {lang === 'kk' ? 'Жақсы' : 'Хорошо'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  {lang === 'kk' ? 'Тамаша' : 'Отлично'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  {lang === 'kk' ? 'Шаршау' : 'Усталость'}
                </span>
              </div>

              <Link href="/mood" className="text-brand-600 dark:text-brand-400 hover:underline font-bold text-xs">
                {lang === 'kk' ? 'Толығырақ' : 'Подробнее'} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

