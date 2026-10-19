'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  School,
  Key,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { LogoIcon } from '@/components/ui/logo-icon';
import { authApi } from '@/lib/api';
import Cookies from 'js-cookie';

type RegisterRole = 'student' | 'teacher' | 'psychologist';

export default function RegisterPage() {
  const router = useRouter();

  // Selected Role
  const [selectedRole, setSelectedRole] = useState<RegisterRole>('student');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [classId, setClassId] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deptCodeError, setDeptCodeError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRoleChange = (role: RegisterRole) => {
    setSelectedRole(role);
    setError('');
    setDeptCodeError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDeptCodeError('');
    setSuccessMessage('');

    // Validations
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (selectedRole === 'teacher' && !departmentCode.trim()) {
      setDeptCodeError('Код кафедры обязателен для регистрации учителя');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role: selectedRole,
        class_id: selectedRole === 'student' ? classId.trim() || undefined : undefined,
        department_code: selectedRole === 'teacher' ? departmentCode.trim().toUpperCase() : undefined,
      });

      const { access_token, user } = res.data;

      // Save token in cookie & user in localStorage
      Cookies.set('access_token', access_token, { expires: 1 });
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }

      setSuccessMessage('Регистрация прошла успешно! Перенаправляем...');

      // Dynamic redirect based on user role
      setTimeout(() => {
        if (user.role === 'teacher') {
          router.push('/teacher/dashboard');
        } else if (user.role === 'psychologist') {
          router.push('/dashboard');
        } else if (user.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/tests');
        }
      }, 1000);
    } catch (err: unknown) {
      const errorDetail = (err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail)
        : null) || 'Ошибка регистрации. Попробуйте еще раз.';

      // Check if the error is related to department code
      if (
        errorDetail.toLowerCase().includes('код кафедры') ||
        errorDetail.toLowerCase().includes('кафедр')
      ) {
        setDeptCodeError(errorDetail);
      } else {
        setError(errorDetail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col min-h-[100dvh] p-4 sm:p-8 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <div className="m-auto w-full max-w-md flex flex-col gap-4 sm:gap-6 animate-fade-in py-2 sm:py-4">
        {/* ── Brand Header ────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div className="mx-auto mb-1 flex items-center justify-center">
            <LogoIcon className="w-12 h-12 sm:w-14 sm:h-14 text-zinc-900 dark:text-white transition-colors" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Создать аккаунт в AISezim
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Единая школьная платформа психологической поддержки
          </p>
        </div>

        {/* ── Stitch Registration Card ────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
          {/* 1. Visual Role Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2">
              Выберите вашу роль
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Ученик */}
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all duration-200 ${
                  selectedRole === 'student'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    selectedRole === 'student'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                  }`}
                >
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Ученик</span>
              </button>

              {/* Учитель */}
              <button
                type="button"
                onClick={() => handleRoleChange('teacher')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all duration-200 ${
                  selectedRole === 'teacher'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    selectedRole === 'teacher'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Учитель</span>
              </button>

              {/* Психолог */}
              <button
                type="button"
                onClick={() => handleRoleChange('psychologist')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all duration-200 ${
                  selectedRole === 'psychologist'
                    ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    selectedRole === 'psychologist'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                  }`}
                >
                  <LogoIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Психолог</span>
              </button>
            </div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* ФИО */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                ФИО (Полное имя)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Иванов Иван Иванович"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Электронная почта
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="your.email@school.kz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Минимум 6 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* ДИНАМИЧЕСКОЕ ПОЛЕ: Для Ученика -> Класс */}
            {selectedRole === 'student' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Класс <span className="text-slate-400 font-normal">(необязательно)</span>
                </label>
                <div className="relative">
                  <School className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="например, 10А"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                  Укажите ваш класс для получения персональных тестов и отчетов.
                </p>
              </div>
            )}

            {/* ДИНАМИЧЕСКОЕ ПОЛЕ: Для Учителя -> Код кафедры */}
            {selectedRole === 'teacher' && (
              <div className="animate-fade-in space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Код кафедры <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/40">
                    Обязательно
                  </span>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="например, MIPH2026"
                    value={departmentCode}
                    onChange={(e) => {
                      setDepartmentCode(e.target.value.toUpperCase());
                      setDeptCodeError('');
                    }}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800/80 border rounded-2xl text-sm font-mono tracking-wider font-bold uppercase transition-all ${
                      deptCodeError
                        ? 'border-rose-400 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                  />
                </div>
                {deptCodeError ? (
                  <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{deptCodeError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    Введите секретный код, выданный администратором вашей школы (например, <span className="font-mono font-semibold text-slate-600 dark:text-zinc-300">MIPH2026</span>).
                  </p>
                )}
              </div>
            )}

            {/* Кнопка регистрации */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-2xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-6 ${
                selectedRole === 'teacher'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : selectedRole === 'psychologist'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Создание аккаунта...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Зарегистрироваться</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── Footer Link to Login ──────────────────────────────────── */}
        <p className="text-center text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
          Уже есть аккаунт?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Войти в систему
          </Link>
        </p>
      </div>
    </main>
  );
}
