'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, UserX, FlaskConical } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { LogoIcon } from '@/components/ui/logo-icon';

export default function LoginPage() {
  const router = useRouter();
  const { login, guestLogin, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (user.role === 'psychologist') {
        router.push('/dashboard');
      } else {
        router.push('/tests');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail)
        : null;
      setError(msg || 'Ошибка входа. Проверьте электронную почту и пароль.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGuest() {
    setError('');
    setGuestLoading(true);
    try {
      await guestLogin();
      router.push('/tests');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail)
        : null;
      setError(msg || 'Ошибка создания анонимной сессии');
    } finally {
      setGuestLoading(false);
    }
  }

  function handleDemoLogin() {
    setError('');
    try {
      demoLogin();
      router.push('/dashboard');
    } catch {
      setError('Демо-вход доступен только в локальной разработке.');
    }
  }

  return (
    <main className="flex flex-col min-h-[100dvh] p-4 sm:p-8 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      {/* m-auto centers the form when space permits, and avoids top/bottom clipping on mobile viewports */}
      <div className="m-auto w-full max-w-sm sm:max-w-md flex flex-col gap-4 sm:gap-5 animate-fade-in py-2 sm:py-4">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto mb-2 sm:mb-3 flex items-center justify-center">
            <LogoIcon className="w-12 h-12 sm:w-14 sm:h-14 text-zinc-900 dark:text-white transition-colors" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            AISezim
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-xs sm:text-sm">
            Платформа психологической поддержки
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xl shadow-zinc-200/50 dark:shadow-none">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4 sm:mb-5">
            Войти в систему
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Электронная почта
              </label>
              <input
                id="login-email"
                type="email"
                className="w-full pl-3.5 pr-4 py-2.5 sm:py-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  className="w-full pl-3.5 pr-11 py-2.5 sm:py-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="btn-login"
              type="submit"
              className="w-full py-2.5 sm:py-3 px-4 rounded-2xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Войти
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-3.5 sm:my-4">
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-zinc-400 text-xs">или</span>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {/* Guest login */}
          <button
            id="btn-guest"
            onClick={handleGuest}
            className="w-full py-2.5 sm:py-3 px-4 rounded-2xl font-semibold text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={guestLoading}
          >
            {guestLoading ? (
              <div className="w-4 h-4 border-2 border-zinc-400/30 border-t-zinc-600 dark:border-t-zinc-200 rounded-full animate-spin" />
            ) : (
              <>
                <UserX size={16} />
                Войти анонимно
              </>
            )}
          </button>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mt-2">
            Без регистрации. Результаты сохранятся на этом устройстве.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <button
              id="btn-demo-psychologist"
              type="button"
              onClick={handleDemoLogin}
              className="w-full mt-3 py-2.5 px-4 rounded-2xl font-semibold text-sm bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900 transition-colors flex items-center justify-center gap-2"
            >
              <FlaskConical size={16} />
              Демо: посмотреть отчёты опросов
            </button>
          )}
        </div>

        {/* Footer Link */}
        <div className="text-center">
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Нет аккаунта?{' '}
            <Link
              href="/register"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
            >
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
