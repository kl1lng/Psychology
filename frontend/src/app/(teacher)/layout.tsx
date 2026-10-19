'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/ui/navigation-link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  Building2,
  BookOpen,
  LogOut,
  Sparkles,
  Globe,
  ArrowUpRight,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { HeaderControls } from '@/components/ui/header-controls';
import { StitchLoader } from '@/components/ui/stitch-loader';
import { LogoIcon } from '@/components/ui/logo-icon';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoading, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/teacher/dashboard', label: 'Результаты тестирования', icon: LayoutDashboard },
  ];

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      }
      // Allow TEACHER, ADMIN or PSYCHOLOGIST to access teacher area for preview
      else if (role !== 'teacher' && role !== 'admin' && role !== 'psychologist') {
        router.replace('/');
      }
    }
  }, [user, role, isLoading, router]);

  if (isLoading) {
    return (
      <StitchLoader
        type="teacher"
        title="Кабинет преподавателя"
        subtitle="Загрузка профиля и подготовка аналитики..."
      />
    );
  }

  if (!user || (role !== 'teacher' && role !== 'admin' && role !== 'psychologist')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-zinc-950">
        <div className="text-center p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 max-w-md shadow-sm">
          <GraduationCap className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-2">Доступ ограничен</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
            Для просмотра данного раздела требуются права учителя или администратора.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Войти в систему
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* ── Top Header Navigation ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/teacher/dashboard" className="flex items-center gap-3 group">
              <div className="flex items-center gap-2">
                <LogoIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base tracking-tight text-slate-900 dark:text-zinc-100">
                      AISezim
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                      Кабинет учителя
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:inline">
                    Кабинет преподавателя
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            <HeaderControls />

            {/* Current User Badge & Logout */}
            <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-zinc-800">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 leading-tight">
                  {user.full_name || 'Преподаватель'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 truncate max-w-[140px]">
                  {user.email || 'teacher@school.kz'}
                </span>
              </div>
              <button
                onClick={logout}
                title="Выйти"
                className="p-2 text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100'
                      : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between px-2">
              <span className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                {user.email}
              </span>
              <button
                onClick={logout}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Выйти</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content Body ────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
