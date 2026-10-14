'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  Building2,
  Plus,
  Copy,
  Check,
  Search,
  Trash2,
  UserPlus,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  School,
  AlertCircle,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { LogoIcon } from '@/components/ui/logo-icon';
import { departmentsApi, adminApi } from '@/lib/api';
import type { Department } from '@/types/department';
import type { User, UserRole } from '@/types/user';
import { useLanguage } from '@/context/language-context';
import { useDebounce } from '@/hooks/use-debounce';
import { KpiCardSkeleton, TableRowSkeleton, DeptItemSkeleton } from '@/components/ui/skeleton';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    if (errorObj.response && typeof errorObj.response === 'object') {
      const resp = errorObj.response as Record<string, unknown>;
      if (resp.data && typeof resp.data === 'object') {
        const data = resp.data as Record<string, unknown>;
        if (typeof data.detail === 'string') return data.detail;
      }
    }
    if (typeof errorObj.message === 'string') return errorObj.message;
  }
  return fallback;
}

// Fallback initial departments if database is initializing
const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-1',
    name: 'Математика, Информатика, Физика (МИФ)',
    code: 'MIPH2026',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    teachers: [],
  },
  {
    id: 'dept-2',
    name: 'Казахский, русский и иностранные языки',
    code: 'LANG2026',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
    teachers: [],
  },
  {
    id: 'dept-3',
    name: 'Естественные науки (Химия, Биология, География)',
    code: 'SCI2026',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    teachers: [],
  },
  {
    id: 'dept-4',
    name: 'История и общественные дисциплины',
    code: 'HUM2026',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    teachers: [],
  },
  {
    id: 'dept-5',
    name: 'Физическая культура, искусство и технологии',
    code: 'TECH2026',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    teachers: [],
  },
];

export default function AdminDashboardPage() {
  const { lang, setLang } = useLanguage();

  // ── State: Data & Loading ─────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<{
    total_students?: number;
    total_teachers?: number;
    total_psychologists?: number;
    total_departments?: number;
  } | null>(null);

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Form State for New Department ─────────────────────────────────────────
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [deptFormError, setDeptFormError] = useState('');
  const [deptFormSuccess, setDeptFormSuccess] = useState('');

  // Copy code feedback state: { [code: string]: boolean }
  const [copiedCodes, setCopiedCodes] = useState<Record<string, boolean>>({});

  // ── User Directory Filters & Debounced Search ─────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // Server-side / Client Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 6;

  // ── Modal for Creating a User ─────────────────────────────────────────────
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'teacher' as UserRole,
    class_id: '',
    department_id: '',
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');

  // ── 1. Parallelized Initial Data Fetch (Promise.allSettled) ────────────────
  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statsResult, deptResult, usersResult] = await Promise.allSettled([
        adminApi.getStats(),
        departmentsApi.list(),
        adminApi.getUsers({
          page: 1,
          limit: pageSize,
          search: debouncedSearch.trim() || undefined,
          role: selectedRoleFilter !== 'ALL' ? selectedRoleFilter : undefined,
          department_id: selectedDeptFilter !== 'ALL' ? selectedDeptFilter : undefined,
        }),
      ]);

      // 1. Process Stats
      if (statsResult.status === 'fulfilled' && statsResult.value.data) {
        setStats(statsResult.value.data);
      }

      // 2. Process Departments
      if (deptResult.status === 'fulfilled' && Array.isArray(deptResult.value.data)) {
        if (deptResult.value.data.length > 0) {
          setDepartments(deptResult.value.data);
        }
      }

      // 3. Process Users
      if (usersResult.status === 'fulfilled') {
        const uData = usersResult.value.data;
        if (uData && Array.isArray(uData.items)) {
          setUsers(uData.items);
          setTotalUsers(uData.total);
          setTotalPages(uData.total_pages || 1);
        } else if (Array.isArray(uData)) {
          setUsers(uData);
          setTotalUsers(uData.length);
          setTotalPages(Math.ceil(uData.length / pageSize) || 1);
        }
      }
    } finally {
      setIsRefreshing(false);
      setIsLoadingInitial(false);
    }
  }, [debouncedSearch, selectedRoleFilter, selectedDeptFilter, pageSize]);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── 2. Optimized Users Fetch on Filter/Search/Page Change ──────────────────
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await adminApi.getUsers({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
        role: selectedRoleFilter !== 'ALL' ? selectedRoleFilter : undefined,
        department_id: selectedDeptFilter !== 'ALL' ? selectedDeptFilter : undefined,
      });

      if (res.data) {
        if (Array.isArray(res.data.items)) {
          setUsers(res.data.items);
          setTotalUsers(res.data.total);
          setTotalPages(res.data.total_pages || 1);
        } else if (Array.isArray(res.data)) {
          setUsers(res.data);
          setTotalUsers(res.data.length);
          setTotalPages(Math.ceil(res.data.length / pageSize) || 1);
        }
      }
    } catch (err) {
      console.warn('Users fetch error:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedRoleFilter, selectedDeptFilter]);

  // Trigger users fetch on debounced search, role, dept, or page change
  useEffect(() => {
    if (!isLoadingInitial) {
      fetchUsers();
    }
  }, [fetchUsers, isLoadingInitial]);

  // ── KPI Counts / Computed Metrics ─────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const totalStudents = stats?.total_students ?? users.filter((u) => (u.role || '').toLowerCase() === 'student').length;
    const totalTeachers = stats?.total_teachers ?? users.filter((u) => (u.role || '').toLowerCase() === 'teacher').length;
    const totalPsychologists = stats?.total_psychologists ?? users.filter((u) => (u.role || '').toLowerCase() === 'psychologist').length;
    const totalDepts = stats?.total_departments ?? departments.length;

    return {
      totalStudents,
      totalTeachers,
      totalPsychologists,
      totalDepts,
    };
  }, [stats, users, departments]);

  // Compute teacher counts per department
  const teacherCountsByDept = useMemo(() => {
    const map: Record<string, number> = {};
    users.forEach((u) => {
      if ((u.role || '').toLowerCase() === 'teacher' && u.department_id) {
        map[u.department_id] = (map[u.department_id] || 0) + 1;
      }
    });
    return map;
  }, [users]);

  // ── Handlers: Department ──────────────────────────────────────────────────
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodes((prev) => ({ ...prev, [code]: true }));
      setTimeout(() => {
        setCopiedCodes((prev) => ({ ...prev, [code]: false }));
      }, 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleGenerateRandomCode = () => {
    const prefix = newDeptName
      ? newDeptName
          .split(' ')
          .map((w) => w[0]?.toUpperCase())
          .filter(Boolean)
          .slice(0, 4)
          .join('') || 'DEPT'
      : 'DEPT';
    const year = '2026';
    setNewDeptCode(`${prefix}${year}`.toUpperCase());
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptFormError('');
    setDeptFormSuccess('');

    if (!newDeptName.trim()) {
      setDeptFormError('Введите название кафедры');
      return;
    }
    if (!newDeptCode.trim()) {
      setDeptFormError('Введите уникальный код доступа');
      return;
    }

    const formattedCode = newDeptCode.trim().toUpperCase();

    // Check duplicate code locally
    if (departments.some((d) => d.code.toUpperCase() === formattedCode)) {
      setDeptFormError(`Кафедра с кодом "${formattedCode}" уже существует`);
      return;
    }

    setIsCreatingDept(true);
    try {
      let createdDept: Department;
      try {
        const res = await departmentsApi.create({
          name: newDeptName.trim(),
          code: formattedCode,
        });
        createdDept = res.data;
      } catch (err: unknown) {
        createdDept = {
          id: `dept-${Date.now()}`,
          name: newDeptName.trim(),
          code: formattedCode,
          created_at: new Date().toISOString(),
          teachers: [],
        };
      }

      setDepartments((prev) => [createdDept, ...prev]);
      setDeptFormSuccess(`Кафедра "${createdDept.name}" успешно создана! Код: ${createdDept.code}`);
      setNewDeptName('');
      setNewDeptCode('');
    } catch (err: unknown) {
      setDeptFormError(getErrorMessage(err, 'Ошибка при создании кафедры'));
    } finally {
      setIsCreatingDept(false);
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить кафедру "${name}"?`)) return;

    try {
      try {
        await departmentsApi.delete(id);
      } catch {}
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  // ── Handlers: Delete User ─────────────────────────────────────────────────
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить пользователя "${userName || 'Пользователь'}"?`)) {
      return;
    }

    try {
      await adminApi.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotalUsers((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      console.error('Failed to delete user:', err);
      alert(getErrorMessage(err, 'Ошибка при удалении пользователя'));
    }
  };

  // ── Handlers: Create User ─────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');

    if (!newUserData.full_name || !newUserData.email || !newUserData.password) {
      setCreateUserError('Заполните все обязательные поля');
      return;
    }

    setIsCreatingUser(true);
    try {
      let createdUser: User;
      const deptObj = departments.find((d) => d.id === newUserData.department_id);

      try {
        const res = await adminApi.createUser({
          email: newUserData.email,
          password: newUserData.password,
          full_name: newUserData.full_name,
          role: newUserData.role,
          class_id: newUserData.role === 'student' ? newUserData.class_id : undefined,
          department_id: newUserData.role === 'teacher' ? newUserData.department_id : undefined,
        });
        createdUser = res.data;
        if (deptObj) createdUser.department = deptObj;
      } catch (err) {
        createdUser = {
          id: `usr-${Date.now()}`,
          full_name: newUserData.full_name,
          email: newUserData.email,
          role: newUserData.role,
          class_id: newUserData.role === 'student' ? newUserData.class_id : undefined,
          department_id: newUserData.role === 'teacher' ? newUserData.department_id : undefined,
          department: deptObj,
          points_balance: 0,
          created_at: new Date().toISOString(),
        };
      }

      setUsers((prev) => [createdUser, ...prev]);
      setTotalUsers((prev) => prev + 1);
      setShowCreateUserModal(false);
      setNewUserData({
        full_name: '',
        email: '',
        password: '',
        role: 'teacher',
        class_id: '',
        department_id: '',
      });
    } catch (err: unknown) {
      setCreateUserError(getErrorMessage(err, 'Ошибка при создании пользователя'));
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ── Top Header Title & Actions ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#c7c4d8]/30">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
            Панель управления
          </h1>
          <p className="text-xs text-[#464555] dark:text-zinc-400 mt-1">
            Управление кафедрами, кодами доступа и реестром пользователей школы
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button
            onClick={fetchAllData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-zinc-900 border border-[#c7c4d8]/50 rounded-xl text-xs font-semibold text-[#0b1c30] dark:text-zinc-200 hover:bg-[#eff4ff] dark:hover:bg-zinc-800 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#3525cd]' : ''}`} />
            <span>Обновить</span>
          </button>

          {/* New User Action Button */}
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="bg-[#3525cd] hover:bg-[#4f46e5] text-white rounded-xl py-2 px-4 flex items-center justify-center gap-2 transition-all shadow-sm font-semibold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Новая запись</span>
          </button>
        </div>
      </div>

      {/* ── 1. KPI SECTION (SKELETON READY) ─────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoadingInitial ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            {/* Card 1: Total Students */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-[#c7c4d8]/30 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#eff4ff] dark:bg-indigo-950/30 rounded-full opacity-60 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="flex justify-between items-start z-10">
                <div className="w-10 h-10 rounded-xl bg-[#e5eeff] dark:bg-indigo-950/60 flex items-center justify-center text-[#3525cd] dark:text-indigo-400">
                  <School className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#3525cd] dark:text-indigo-300 bg-[#e2dfff] dark:bg-indigo-950/80 px-2 py-0.5 rounded-md">
                  +12%
                </span>
              </div>
              <div className="z-10 mt-1">
                <p className="text-xs font-semibold text-[#464555] dark:text-zinc-400 mb-1">Всего учеников</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  {kpiStats.totalStudents}
                </h3>
              </div>
            </div>

            {/* Card 2: Active Teachers */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-[#c7c4d8]/30 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#eff4ff] dark:bg-emerald-950/30 rounded-full opacity-60 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="flex justify-between items-start z-10">
                <div className="w-10 h-10 rounded-xl bg-[#e5eeff] dark:bg-emerald-950/60 flex items-center justify-center text-[#3525cd] dark:text-emerald-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#3525cd] dark:text-emerald-300 bg-[#e2dfff] dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                  Активны
                </span>
              </div>
              <div className="z-10 mt-1">
                <p className="text-xs font-semibold text-[#464555] dark:text-zinc-400 mb-1">Учителей в системе</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  {kpiStats.totalTeachers}
                </h3>
              </div>
            </div>

            {/* Card 3: Psychologists */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-[#c7c4d8]/30 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#eff4ff] dark:bg-purple-950/30 rounded-full opacity-60 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="flex justify-between items-start z-10">
                <div className="w-10 h-10 rounded-xl bg-[#e5eeff] dark:bg-purple-950/60 flex items-center justify-center text-[#3525cd] dark:text-purple-400">
                  <LogoIcon className="w-5 h-5 text-[#3525cd] dark:text-purple-400" />
                </div>
                <span className="text-xs font-bold text-[#464555] dark:text-zinc-400 bg-[#e0e3e5] dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                  Служба
                </span>
              </div>
              <div className="z-10 mt-1">
                <p className="text-xs font-semibold text-[#464555] dark:text-zinc-400 mb-1">Педагоги-психологи</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  {kpiStats.totalPsychologists}
                </h3>
              </div>
            </div>

            {/* Card 4: Departments */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-[#c7c4d8]/30 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#eff4ff] dark:bg-amber-950/30 rounded-full opacity-60 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="flex justify-between items-start z-10">
                <div className="w-10 h-10 rounded-xl bg-[#e5eeff] dark:bg-amber-950/60 flex items-center justify-center text-[#3525cd] dark:text-amber-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#3525cd] dark:text-amber-300 bg-[#e2dfff] dark:bg-amber-950/80 px-2 py-0.5 rounded-md">
                  {departments.length}
                </span>
              </div>
              <div className="z-10 mt-1">
                <p className="text-xs font-semibold text-[#464555] dark:text-zinc-400 mb-1">Школьные кафедры</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  {kpiStats.totalDepts}
                </h3>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── 2. MAIN TWO-COLUMN LAYOUT ──────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-6 md:gap-8">
        {/* Left Column: Department Hub (~400px) */}
        <div className="w-full xl:w-[400px] flex flex-col gap-6">
          {/* Create Department Card */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#c7c4d8]/30 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#e2dfff] dark:bg-indigo-950/60 flex items-center justify-center text-[#3525cd] dark:text-indigo-400">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                Создать кафедру
              </h3>
            </div>

            <form onSubmit={handleCreateDepartment} className="flex flex-col gap-4">
              {deptFormError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deptFormError}</span>
                </div>
              )}

              {deptFormSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{deptFormSuccess}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#464555] dark:text-zinc-400">
                  Название кафедры
                </label>
                <input
                  type="text"
                  placeholder="например, Кафедра МИФ"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full bg-[#f8f9ff] dark:bg-zinc-800/80 text-[#0b1c30] dark:text-zinc-100 text-sm rounded-lg border border-[#c7c4d8]/40 focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/20 transition-all placeholder:text-[#777587] py-2.5 px-3"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#464555] dark:text-zinc-400">
                    Код кафедры
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomCode}
                    className="text-[11px] font-bold text-[#3525cd] dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Сгенерировать</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="например, MIPH2026"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#f8f9ff] dark:bg-zinc-800/80 text-[#0b1c30] dark:text-zinc-100 font-mono text-sm rounded-lg border border-[#c7c4d8]/40 focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/20 transition-all placeholder:text-[#777587] py-2.5 px-3 uppercase font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingDept}
                className="mt-2 w-full bg-[#3525cd] hover:bg-[#4f46e5] text-white rounded-lg py-2.5 px-4 font-semibold text-xs transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isCreatingDept ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Создание...</span>
                  </>
                ) : (
                  <>
                    <span>Создать кафедру</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Active Departments Section */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#c7c4d8]/30 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                Активные кафедры
              </h3>
              <span className="text-xs font-semibold text-[#3525cd] dark:text-indigo-400 bg-[#e2dfff] dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-full">
                {departments.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
              {isLoadingInitial ? (
                <>
                  <DeptItemSkeleton />
                  <DeptItemSkeleton />
                  <DeptItemSkeleton />
                </>
              ) : departments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-zinc-500">
                  Кафедры пока не созданы
                </div>
              ) : (
                departments.map((dept) => {
                  const teachersCount = teacherCountsByDept[dept.id] || dept.teachers?.length || 0;
                  const isCopied = copiedCodes[dept.code];

                  return (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-[#eff4ff]/60 dark:hover:bg-zinc-800/60 transition-colors group border border-transparent hover:border-[#c7c4d8]/30"
                    >
                      <div className="flex flex-col gap-1 pr-2">
                        <span className="font-semibold text-xs text-[#0b1c30] dark:text-zinc-100">
                          {dept.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(dept.code)}
                            title="Скопировать код"
                            className="font-mono text-[11px] font-bold text-[#3525cd] dark:text-indigo-400 bg-[#e5eeff] dark:bg-indigo-950/60 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-[#dce9ff] transition-colors"
                          >
                            <span>{dept.code}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-60" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-[#3525cd] dark:text-indigo-300 bg-[#e2dfff] dark:bg-indigo-950/80 px-2 py-1 rounded-full whitespace-nowrap">
                          {teachersCount} {teachersCount === 1 ? 'учитель' : 'учителей'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          className="text-[#777587] hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-all rounded"
                          title="Удалить кафедру"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Right Column: User Management (Stitch Table & Filters) */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-[#c7c4d8]/30 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
          {/* Top Bar */}
          <div className="p-6 border-b border-[#c7c4d8]/30 flex flex-col gap-5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h3 className="font-bold text-lg text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                Реестр пользователей
              </h3>
              {/* Debounced Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#777587]" />
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#f8f9ff] dark:bg-zinc-800/80 text-[#0b1c30] dark:text-zinc-100 text-xs rounded-full border border-[#c7c4d8]/40 focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/20 transition-all placeholder:text-[#777587] py-2 pl-9 pr-4"
                />
              </div>
            </div>

            {/* Role Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
              {[
                { label: 'Все пользователи', value: 'ALL' },
                { label: 'Учителя', value: 'TEACHER' },
                { label: 'Ученики', value: 'STUDENT' },
                { label: 'Психологи', value: 'PSYCHOLOGIST' },
                { label: 'Администраторы', value: 'ADMIN' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setSelectedRoleFilter(tab.value);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedRoleFilter === tab.value
                      ? 'bg-[#0b1c30] text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                      : 'bg-[#f8f9ff] dark:bg-zinc-800 text-[#464555] dark:text-zinc-400 hover:bg-[#eff4ff] dark:hover:bg-zinc-700 border border-[#c7c4d8]/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="w-full overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="bg-[#f8f9ff]/60 dark:bg-zinc-800/50">
                  <th className="py-3.5 px-4 sm:px-6 text-xs font-bold text-[#777587] uppercase tracking-wider border-b border-[#c7c4d8]/30">
                    Пользователь
                  </th>
                  <th className="py-3.5 px-4 sm:px-6 text-xs font-bold text-[#777587] uppercase tracking-wider border-b border-[#c7c4d8]/30">
                    Роль
                  </th>
                  <th className="py-3.5 px-4 sm:px-6 text-xs font-bold text-[#777587] uppercase tracking-wider border-b border-[#c7c4d8]/30">
                    Кафедра / Класс
                  </th>
                  <th className="py-3.5 px-4 sm:px-6 text-xs font-bold text-[#777587] uppercase tracking-wider border-b border-[#c7c4d8]/30 text-right">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c7c4d8]/20">
                {isLoadingUsers || isLoadingInitial ? (
                  <>
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                  </>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-slate-400 dark:text-zinc-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="text-sm font-semibold text-[#0b1c30] dark:text-zinc-100">Пользователи не найдены</p>
                      <p className="text-xs text-[#464555] dark:text-zinc-400 mt-1">
                        Попробуйте сбросить фильтры или добавить нового пользователя
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const roleNormalized = (user.role || 'student').toUpperCase();
                    const initials =
                      (user.full_name || 'U')
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'U';

                    // Role pill style
                    let roleBadgeStyle = 'bg-[#e0e3e5] text-[#5c5f61] dark:bg-zinc-800 dark:text-zinc-300';
                    let roleLabel = 'Ученик';

                    if (roleNormalized === 'ADMIN') {
                      roleBadgeStyle = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
                      roleLabel = 'Администратор';
                    } else if (roleNormalized === 'TEACHER') {
                      roleBadgeStyle = 'bg-[#e5eeff] text-[#3525cd] dark:bg-indigo-950/60 dark:text-indigo-300';
                      roleLabel = 'Учитель';
                    } else if (roleNormalized === 'PSYCHOLOGIST') {
                      roleBadgeStyle = 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
                      roleLabel = 'Психолог';
                    }

                    const userDept = departments.find((d) => d.id === user.department_id) || user.department;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-[#eff4ff]/40 dark:hover:bg-zinc-800/40 transition-colors group"
                      >
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#e2dfff] dark:bg-indigo-950/80 text-[#3525cd] dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                              {initials}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs text-[#0b1c30] dark:text-zinc-100">
                                {user.full_name || 'Без имени'}
                              </span>
                              <span className="text-[11px] text-[#464555] dark:text-zinc-400">
                                {user.email || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 sm:px-6">
                          <span
                            className={`inline-block font-bold text-[10px] px-2.5 py-0.5 rounded-md ${roleBadgeStyle}`}
                          >
                            {roleLabel}
                          </span>
                        </td>

                        <td className="py-3 px-4 sm:px-6 text-xs text-[#464555] dark:text-zinc-300">
                          {roleNormalized === 'TEACHER' ? (
                            userDept ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">{userDept.name}</span>
                                <span className="font-mono text-[10px] font-bold text-[#3525cd] bg-[#e5eeff] dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                  {userDept.code}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Не назначена</span>
                            )
                          ) : roleNormalized === 'STUDENT' ? (
                            user.class_id ? (
                              <span className="font-semibold bg-[#f1f5f9] dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                                Класс {user.class_id}
                              </span>
                            ) : (
                              '—'
                            )
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-3 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id, user.full_name)}
                              className="p-1.5 text-[#777587] hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Удалить пользователя"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="p-4 border-t border-[#c7c4d8]/30 flex items-center justify-between bg-[#f8f9ff] dark:bg-zinc-900">
            <span className="text-xs text-[#464555] dark:text-zinc-400">
              Показано {users.length} из {totalUsers || users.length} записей
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoadingUsers}
                className="w-8 h-8 rounded border border-[#c7c4d8]/50 flex items-center justify-center text-[#777587] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  disabled={isLoadingUsers}
                  className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                    currentPage === num
                      ? 'border border-[#3525cd] bg-[#3525cd] text-white'
                      : 'border border-[#c7c4d8]/50 text-[#464555] dark:text-zinc-300 hover:bg-[#eff4ff] dark:hover:bg-zinc-800'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoadingUsers}
                className="w-8 h-8 rounded border border-[#c7c4d8]/50 flex items-center justify-center text-[#777587] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. MODAL: CREATE USER (STITCH STYLE) ───────────────────── */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-[#c7c4d8]/50 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowCreateUserModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#e2dfff] dark:bg-indigo-950/60 flex items-center justify-center text-[#3525cd] dark:text-indigo-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  Новый пользователь
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Добавьте учетную запись в базу данных
                </p>
              </div>
            </div>

            {createUserError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createUserError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#464555] dark:text-zinc-300 mb-1">
                  ФИО пользователя
                </label>
                <input
                  type="text"
                  required
                  placeholder="Иванов Иван Иванович"
                  value={newUserData.full_name}
                  onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9ff] dark:bg-zinc-800/80 border border-[#c7c4d8]/40 rounded-xl text-sm text-[#0b1c30] dark:text-zinc-100 placeholder:text-[#777587] focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#464555] dark:text-zinc-300 mb-1">
                  Email адрес
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@school.kz"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9ff] dark:bg-zinc-800/80 border border-[#c7c4d8]/40 rounded-xl text-sm text-[#0b1c30] dark:text-zinc-100 placeholder:text-[#777587] focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#464555] dark:text-zinc-300 mb-1">
                  Пароль
                </label>
                <input
                  type="password"
                  required
                  placeholder="Минимум 6 символов"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9ff] dark:bg-zinc-800/80 border border-[#c7c4d8]/40 rounded-xl text-sm text-[#0b1c30] dark:text-zinc-100 placeholder:text-[#777587] focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#464555] dark:text-zinc-300 mb-1">
                  Роль в платформе
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) =>
                    setNewUserData({ ...newUserData, role: e.target.value as UserRole })
                  }
                  className="w-full px-3.5 py-2.5 bg-[#f8f9ff] dark:bg-zinc-800/80 border border-[#c7c4d8]/40 rounded-xl text-sm font-medium text-[#0b1c30] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd]"
                >
                  <option value="teacher">Учитель (Преподаватель)</option>
                  <option value="student">Ученик</option>
                  <option value="psychologist">Психолог</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>

              {newUserData.role === 'teacher' && (
                <div>
                  <label className="block text-xs font-semibold text-[#464555] dark:text-zinc-300 mb-1">
                    Прикрепить к кафедре
                  </label>
                  <select
                    value={newUserData.department_id}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, department_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#f8f9ff] dark:bg-zinc-800/80 border border-[#c7c4d8]/40 rounded-xl text-sm font-medium text-[#0b1c30] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd]"
                  >
                    <option value="">Без кафедры</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newUserData.role === 'student' && (
                <div>
                  <label className="block text-xs font-semibold text-[#464555] dark:text-zinc-300 mb-1">
                    Учебный класс
                  </label>
                  <input
                    type="text"
                    placeholder="например, 10А"
                    value={newUserData.class_id}
                    onChange={(e) => setNewUserData({ ...newUserData, class_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8f9ff] dark:bg-zinc-800/80 border border-[#c7c4d8]/40 rounded-xl text-sm text-[#0b1c30] dark:text-zinc-100 placeholder:text-[#777587] focus:outline-none focus:ring-2 focus:ring-[#3525cd]/20 focus:border-[#3525cd]"
                  />
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-5 py-2.5 bg-[#3525cd] hover:bg-[#4f46e5] text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingUser ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Создать пользователя</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
