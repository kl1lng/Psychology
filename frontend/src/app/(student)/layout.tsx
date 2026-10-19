'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/ui/navigation-link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ClipboardList,
  Heart,
  MessageCircle,
  Headphones,
  Trophy,
  LogOut,
  Star,
  Globe,
  Wind,
  HelpCircle,
  Sun,
  Moon,
  User as UserIcon,
} from 'lucide-react';
import { LogoIcon } from '@/components/ui/logo-icon';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { HeaderControls } from '@/components/ui/header-controls';
import { StitchLoader } from '@/components/ui/stitch-loader';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoading, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && role === 'psychologist') {
      router.replace('/dashboard');
    }
  }, [role, isLoading, router]);

  const localizedNavItems = [
    { href: '/',            label: t.sidebar.home,      icon: Home },
    { href: '/tests',       label: t.sidebar.tests,     icon: ClipboardList },
    { href: '/mood',        label: t.sidebar.mood,      icon: Heart },
    { href: '/self-help',   label: t.sidebar.selfHelp,  icon: Wind },
    { href: '/qa',          label: t.sidebar.qa,        icon: HelpCircle },
    { href: '/chat',        label: t.sidebar.chat,      icon: MessageCircle },
    { href: '/podcasts',    label: t.sidebar.podcasts,  icon: Headphones },
    { href: '/leaderboard', label: t.sidebar.rating,    icon: Trophy },
  ];

  const mobileNavItems = [
    { href: '/',          label: lang === 'kk' ? 'Басты бет' : 'Главная', icon: Home },
    { href: '/tests',     label: lang === 'kk' ? 'Тесттер' : 'Тесты',   icon: ClipboardList },
    { href: '/mood',      label: lang === 'kk' ? 'Көңіл-күй' : 'Настроение', icon: Heart },
    { href: '/self-help', label: lang === 'kk' ? 'Өзін-өзі' : 'Самопомощь', icon: Wind },
    { href: '/chat',      label: lang === 'kk' ? 'Чат' : 'Чат',         icon: MessageCircle },
  ];

  if (isLoading) {
    return (
      <StitchLoader
        type="student"
        title={t.layout?.platformTitle || (lang === 'kk' ? 'AISezim платформасы' : 'Платформа AISezim')}
        subtitle={t.layout?.loadingServices || (lang === 'kk' ? 'Психологиялық сервистер мен профильді жүктеу...' : 'Загрузка психологических сервисов и профиля...')}
      />
    );
  }

  if (!isLoading && role === 'psychologist') {
    return (
      <StitchLoader
        type="psychologist"
        title={t.layout?.redirecting || (lang === 'kk' ? 'Бағыттау' : 'Перенаправление')}
        subtitle={t.layout?.redirectingDesc || (lang === 'kk' ? 'Педагог-психолог кабинетіне көшу...' : 'Переход в кабинет педагога-психолога...')}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-200 transition-colors duration-300">
      {/* Mobile Top Header (md:hidden) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 flex md:hidden items-center justify-between px-4 h-14 transition-colors duration-300">
        {/* Left: AISezim Logo */}
        <div className="flex items-center gap-2.5">
          <LogoIcon className="w-7 h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <span className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">AISezim</span>
            <span className="text-[10px] text-gray-500 dark:text-white/40 block -mt-0.5 font-medium">
              {lang === 'kk' ? 'Оқушы кабинеті' : 'Кабинет ученика'}
            </span>
          </div>
        </div>

        {/* Right: Points + Avatar triggering dropdown */}
        <div className="flex items-center gap-2.5">
          {user && (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Star size={13} className="fill-amber-500 text-amber-500" />
              <span>{user.points_balance || 0}</span>
            </div>
          )}

          <div className="relative">
            <button
              id="btn-student-profile"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Профиль меню"
              className="w-[38px] h-[38px] bg-brand-500/15 hover:bg-brand-500/25 active:scale-95 border border-brand-500/30 rounded-xl flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-300 transition-all shadow-sm"
            >
              {user?.full_name?.[0]?.toUpperCase() || <UserIcon size={16} />}
            </button>

            {/* Backdrop for outside click */}
            {mobileMenuOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}

            {/* Dropdown Menu */}
            {mobileMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-60 p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl animate-scale-in space-y-2">
                {/* Profile Header */}
                <div className="px-2.5 py-2">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {user?.full_name || (lang === 'kk' ? 'Оқушы' : 'Ученик')}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {user?.class_id ? `${user.class_id} ${lang === 'kk' ? 'сынып' : 'класс'}` : (lang === 'kk' ? 'Мектеп оқушысы' : 'Школьник')}
                  </div>
                </div>

                <div className="border-b border-zinc-200 dark:border-zinc-800" />

                {/* Theme Selector */}
                <div className="px-2.5 py-1.5 space-y-1.5">
                  <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {lang === 'kk' ? 'Көрініс тақырыбы' : 'Тема оформления'}
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        theme === 'light'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <Sun size={13} className="text-amber-500" />
                      <span>{lang === 'kk' ? 'Жарық' : 'Светлая'}</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        theme === 'dark'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <Moon size={13} className="text-brand-400" />
                      <span>{lang === 'kk' ? 'Күңгірт' : 'Темная'}</span>
                    </button>
                  </div>
                </div>

                {/* Language Selector */}
                <div className="px-2.5 py-1.5 space-y-1.5">
                  <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Globe size={11} />
                    <span>{lang === 'kk' ? 'Тілді таңдау' : 'Язык интерфейса'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                    <button
                      onClick={() => setLang('kk')}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                        lang === 'kk'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      Қазақша
                    </button>
                    <button
                      onClick={() => setLang('ru')}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                        lang === 'ru'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      Русский
                    </button>
                  </div>
                </div>

                <div className="border-b border-zinc-200 dark:border-zinc-800" />

                {/* Logout Button */}
                {user && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={15} />
                    <span>{lang === 'kk' ? 'Жүйеден шығу' : 'Выйти из аккаунта'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar - Desktop Only */}
      <aside className="w-64 bg-white dark:bg-[#121214] border-r border-gray-200 dark:border-white/10 flex-col fixed h-full z-50 hidden md:flex transition-colors duration-300">
        {/* Logo & Controls */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <div className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">AISezim</div>
              <div className="text-gray-500 dark:text-white/40 text-[10px]">{t.sidebar.studentCabinet}</div>
            </div>
          </div>

          {/* Theme & Lang Controls in Sidebar */}
          <HeaderControls />
        </div>

        {/* User info */}
        {user?.full_name && (
          <div className="px-4 py-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center">
                <span className="text-gray-900 dark:text-[#E1E0CC] font-bold text-sm">
                  {user.full_name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-gray-900 dark:text-white text-sm font-medium truncate">{user.full_name}</div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-[#E1E0CC]/80">
                  <Star size={11} className="fill-amber-500 text-amber-500" />
                  {user.points_balance || 0} {t.sidebar.points}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {localizedNavItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={isActive ? 'nav-link-active' : 'nav-link'}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={logout}
            className="nav-link w-full text-gray-500 dark:text-white/40 hover:text-risk-critical"
          >
            <LogOut size={16} strokeWidth={2} />
            <span className="text-sm">{t.sidebar.exit}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (5 main tabs: Home, Tests, Mood, Self-help, Chat) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-t border-gray-200 dark:border-zinc-800 flex md:hidden items-center justify-around h-16 px-1 safe-bottom shadow-lg transition-colors duration-300">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="text-[9px] font-medium tracking-tight mt-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className={`flex-1 ml-0 md:ml-64 min-h-screen bg-white dark:bg-black pt-14 md:pt-0 transition-colors duration-300 ${
        pathname === '/chat' ? 'pb-16 md:pb-6' : 'pb-24 md:pb-8'
      }`}>
        <div className={`mx-auto animate-fade-in ${
          pathname === '/chat'
            ? 'p-2.5 sm:p-4 md:p-6 max-w-5xl h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-2rem)] flex flex-col'
            : 'p-4 sm:p-6 md:p-8 max-w-5xl'
        }`}>
          {children}
        </div>
      </main>

    </div>
  );
}
