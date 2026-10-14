'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Archive,
  MessageSquare,
  Upload,
  LogOut,
  HelpCircle,
  Sun,
  Moon,
  Globe,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { HeaderControls } from '@/components/ui/header-controls';
import { StitchLoader } from '@/components/ui/stitch-loader';
import { LogoIcon } from '@/components/ui/logo-icon';

export default function PsychologistLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoading, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/dashboard',       label: t.sidebar.dashboard,      icon: LayoutDashboard },
    { href: '/chats',           label: t.sidebar.dialogs,        icon: MessageSquare },
    { href: '/archive',         label: t.sidebar.archive,        icon: Archive },
    { href: '/qa-moderation',   label: t.sidebar.qaModeration,   icon: HelpCircle },
    { href: '/podcasts/upload', label: t.sidebar.managePodcasts, icon: Upload },
  ];

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (role !== 'psychologist') {
        router.replace('/');
      }
    }
  }, [user, role, isLoading, router]);

  if (isLoading) {
    return (
      <StitchLoader
        type="psychologist"
        title="Кабинет психолога"
        subtitle="Загрузка аналитики рисков, архива консультаций и тестов..."
      />
    );
  }

  if (!user || role !== 'psychologist') {
    return (
      <StitchLoader
        type="psychologist"
        title="Кабинет психолога"
        subtitle="Проверка прав доступа..."
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-200 transition-colors duration-300">
      {/* Mobile Top Header (md:hidden) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 flex md:hidden items-center justify-between px-4 h-14 transition-colors duration-300">
        {/* Left: AISezim Logo */}
        <div className="flex items-center gap-2.5">
          <LogoIcon className="w-7 h-7 text-purple-600 dark:text-purple-400 shrink-0" />
          <div>
            <span className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">AISezim</span>
            <span className="text-[10px] text-gray-500 dark:text-white/40 block -mt-0.5 font-medium">
              {lang === 'kk' ? 'Психолог кабинеті' : 'Кабинет психолога'}
            </span>
          </div>
        </div>

        {/* Right: Avatar triggering dropdown */}
        <div className="relative">
          <button
            id="btn-mobile-profile"
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
            <div className="absolute right-0 top-12 z-50 w-60 p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl animate-scale-in space-y-2">
              {/* Profile Header */}
              <div className="px-2.5 py-2">
                <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {user?.full_name}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  {lang === 'kk' ? 'Педагог-психолог' : 'Педагог-психолог'}
                </div>
              </div>

              <div className="border-b border-gray-200 dark:border-zinc-800" />

              {/* Theme Selector */}
              <div className="px-2.5 py-1.5 space-y-1.5">
                <div className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  {lang === 'kk' ? 'Көрініс тақырыбы' : 'Тема оформления'}
                </div>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700/60">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      theme === 'light'
                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                        : 'text-gray-500 dark:text-zinc-400'
                    }`}
                  >
                    <Sun size={13} className="text-amber-500" />
                    <span>{lang === 'kk' ? 'Жарық' : 'Светлая'}</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      theme === 'dark'
                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                        : 'text-gray-500 dark:text-zinc-400'
                    }`}
                  >
                    <Moon size={13} className="text-brand-400" />
                    <span>{lang === 'kk' ? 'Күңгірт' : 'Темная'}</span>
                  </button>
                </div>
              </div>

              {/* Language Selector */}
              <div className="px-2.5 py-1.5 space-y-1.5">
                <div className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Globe size={11} />
                  <span>{lang === 'kk' ? 'Тілді таңдау' : 'Язык интерфейса'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700/60">
                  <button
                    onClick={() => setLang('kk')}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                      lang === 'kk'
                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                        : 'text-gray-500 dark:text-zinc-400'
                    }`}
                  >
                    Қазақша
                  </button>
                  <button
                    onClick={() => setLang('ru')}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                      lang === 'ru'
                        ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm font-semibold'
                        : 'text-gray-500 dark:text-zinc-400'
                    }`}
                  >
                    Русский
                  </button>
                </div>
              </div>

              <div className="border-b border-gray-200 dark:border-zinc-800" />

              {/* Logout Button */}
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
            </div>
          )}
        </div>
      </header>

      {/* Sidebar - Desktop Only */}
      <aside className="w-64 bg-white dark:bg-[#121214] border-r border-gray-200 dark:border-white/10 flex-col fixed h-full z-50 hidden md:flex transition-colors duration-300">
        {/* Logo & Controls */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 shrink-0" />
            <div>
              <div className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">AISezim</div>
              <div className="text-gray-500 dark:text-white/40 text-[10px]">{t.sidebar.psychologistCabinet}</div>
            </div>
          </div>

          <HeaderControls />
        </div>

        {/* User info */}
        {user?.full_name && (
          <div className="px-4 py-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-3 px-2 min-w-0">
              <div className="w-9 h-9 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full flex items-center justify-center shrink-0">
                <span className="text-gray-900 dark:text-[#E1E0CC] font-bold text-sm">
                  {user.full_name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-gray-900 dark:text-white text-sm font-medium truncate" title={user.full_name}>
                  {user.full_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-[#E1E0CC]/70 truncate">
                  {t.sidebar.psychologistCabinet}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={isActive ? 'nav-link-active' : 'nav-link'}>
                <Icon size={16} strokeWidth={2} />
                <span className="text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <button onClick={logout} className="nav-link w-full text-gray-500 dark:text-white/40 hover:text-risk-critical">
            <LogOut size={16} strokeWidth={2} />
            <span className="text-sm">{t.sidebar.exit}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (4 key tabs: Dashboard, Chats, Archive, QA Moderation) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border-t border-gray-200 dark:border-zinc-800 flex md:hidden items-center justify-around h-16 px-2 safe-bottom shadow-lg transition-colors duration-300">
        {[
          { href: '/dashboard', label: lang === 'kk' ? 'Басқару' : 'Дашборд', icon: LayoutDashboard },
          { href: '/chats', label: lang === 'kk' ? 'Чаттар' : 'Чаты', icon: MessageSquare },
          { href: '/archive', label: lang === 'kk' ? 'Картотека' : 'Архив', icon: Archive },
          { href: '/qa-moderation', label: 'Q&A', icon: HelpCircle },
        ].map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href);
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
              <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="text-[10px] font-medium tracking-tight mt-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 ml-0 md:ml-64 min-h-screen bg-white dark:bg-black pt-16 md:pt-0 pb-24 md:pb-8 transition-colors duration-300">
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
