'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  LayoutDashboard,
  Network,
  Users,
  BookOpen,
  CreditCard,
  HelpCircle,
  Settings,
  LogOut,
  ArrowUpRight,
  Menu,
  X,
  Plus,
  GraduationCap,
  Bell,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { HeaderControls } from '@/components/ui/header-controls';
import { StitchLoader } from '@/components/ui/stitch-loader';
import { LogoIcon } from '@/components/ui/logo-icon';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoading, logout } = useAuth();
  const { lang, setLang } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (role !== 'admin' && role !== 'psychologist') {
        router.replace('/');
      }
    }
  }, [user, role, isLoading, router]);

  if (isLoading) {
    return (
      <StitchLoader
        type="admin"
        title="Панель администратора"
        subtitle="Загрузка консоли управления и синхронизация прав..."
      />
    );
  }

  if (!user || (role !== 'admin' && role !== 'psychologist')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9ff] dark:bg-zinc-950">
        <div className="text-center p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 max-w-md shadow-sm">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0b1c30] dark:text-zinc-100 mb-2">Доступ ограничен</h2>
          <p className="text-sm text-[#464555] dark:text-zinc-400 mb-6">
            Для просмотра данного раздела требуются права администратора школы.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#3525cd] hover:bg-[#4f46e5] text-white rounded-xl font-semibold text-sm transition-all"
          >
            Войти в систему
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-zinc-950 text-[#0b1c30] dark:text-zinc-100 font-sans transition-colors duration-300 flex flex-col md:flex-row antialiased">
      {/* ── 1. Mobile Header ────────────────────────────────────────── */}
      <header className="md:hidden flex justify-between items-center px-6 h-16 w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl fixed top-0 left-0 right-0 z-40 border-b border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-2">
          <LogoIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-bold text-lg text-[#3525cd] dark:text-indigo-400 font-['Plus_Jakarta_Sans',sans-serif]">
            AISezim Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setLang('ru')}
              className={`px-1.5 py-0.5 rounded ${
                lang === 'ru' ? 'bg-white dark:bg-zinc-700 text-[#3525cd] shadow-xs' : 'text-slate-500'
              }`}
            >
              RU
            </button>
            <button
              onClick={() => setLang('kk')}
              className={`px-1.5 py-0.5 rounded ${
                lang === 'kk' ? 'bg-white dark:bg-zinc-700 text-[#3525cd] shadow-xs' : 'text-slate-500'
              }`}
            >
              KZ
            </button>
          </div>
          <ThemeToggle className="w-8 h-8" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* ── 2. SideNavBar (Desktop Stitch Layout) ────────────────────── */}
      <nav className="hidden md:flex flex-col py-6 px-4 gap-2 bg-white dark:bg-zinc-900 fixed left-0 top-0 h-screen w-[260px] z-50 shadow-md border-r border-slate-200/80 dark:border-zinc-800">
        <div className="px-4 mb-6">
          <Link href="/admin/dashboard" className="block">
            <div className="flex items-center gap-2.5">
              <LogoIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h1 className="text-2xl font-black text-[#3525cd] dark:text-indigo-400 font-['Plus_Jakarta_Sans',sans-serif] tracking-tight leading-none">
                  AISezim
                </h1>
                <p className="text-xs font-semibold text-[#464555] dark:text-zinc-400 mt-1">
                  Управление школой
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Action Button */}
        <Link
          href="/admin/dashboard"
          className="w-full bg-[#3525cd] hover:bg-[#4f46e5] text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 transition-colors mb-4 shadow-sm font-semibold text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить</span>
        </Link>

        {/* Navigation Items */}
        <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#e5eeff] dark:bg-indigo-950/60 text-[#3525cd] dark:text-indigo-300 font-bold text-xs relative after:content-[''] after:absolute after:left-0 after:w-1 after:h-8 after:bg-[#3525cd] after:rounded-r-full transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Панель управления</span>
          </Link>

          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#464555] dark:text-zinc-400 hover:bg-[#eff4ff] dark:hover:bg-zinc-800/60 hover:text-[#3525cd] dark:hover:text-indigo-300 font-semibold text-xs transition-colors"
          >
            <Network className="w-4 h-4" />
            <span>Управление кафедрами</span>
          </Link>

          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#464555] dark:text-zinc-400 hover:bg-[#eff4ff] dark:hover:bg-zinc-800/60 hover:text-[#3525cd] dark:hover:text-indigo-300 font-semibold text-xs transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Реестр пользователей</span>
          </Link>

          <Link
            href="/psychologist/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#464555] dark:text-zinc-400 hover:bg-[#eff4ff] dark:hover:bg-zinc-800/60 hover:text-[#3525cd] dark:hover:text-indigo-300 font-semibold text-xs transition-colors"
          >
            <LogoIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Кабинет психолога</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-70" />
          </Link>

          <Link
            href="/teacher/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#464555] dark:text-zinc-400 hover:bg-[#eff4ff] dark:hover:bg-zinc-800/60 hover:text-[#3525cd] dark:hover:text-indigo-300 font-semibold text-xs transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Кабинет учителя</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-70" />
          </Link>
        </div>

        {/* Bottom Area */}
        <div className="mt-auto flex flex-col gap-3 border-t border-slate-200/80 dark:border-zinc-800 pt-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold text-[#464555] dark:text-zinc-400">Настройки</span>
            <HeaderControls />
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-semibold text-xs w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Выйти</span>
          </button>
        </div>
      </nav>

      {/* ── 3. Main Content Canvas ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen pt-16 md:pt-0 md:ml-[260px] pb-16">
        {/* Desktop Header */}
        <header className="hidden md:flex justify-end items-center px-8 h-20 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <HeaderControls />
            <Link
              href="/psychologist/dashboard"
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="text-right hidden lg:block">
                <div className="text-xs font-bold text-[#0b1c30] dark:text-zinc-100">
                  {user.full_name || 'Администратор'}
                </div>
                <div className="text-[11px] text-[#464555] dark:text-zinc-400">
                  {user.email || 'Профиль администратора'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#3525cd] text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:ring-2 ring-[#3525cd]/30 transition-all">
                {user.full_name?.charAt(0) || 'A'}
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile Dropdown Content */}
        {mobileMenuOpen && (
          <div className="md:hidden px-6 py-4 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex flex-col gap-3">
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#e5eeff] dark:bg-zinc-800 text-[#3525cd] font-bold text-xs"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Панель управления</span>
            </Link>
            <Link
              href="/psychologist/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#464555] dark:text-zinc-300"
            >
              <span>Кабинет психолога</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/teacher/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#464555] dark:text-zinc-300"
            >
              <span>Кабинет учителя</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <button
              onClick={logout}
              className="text-xs font-semibold text-rose-600 flex items-center gap-2 px-3 py-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* Page Inner Container */}
        <div className="max-w-[1440px] w-full mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
          {children}
        </div>
      </main>
    </div>
  );
}
