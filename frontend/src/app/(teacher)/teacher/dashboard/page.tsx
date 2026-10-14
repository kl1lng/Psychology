'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  FileCheck,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  School,
  FileSpreadsheet,
  X,
  FileText,
  UserCheck,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useDebounce } from '@/hooks/use-debounce';
import { KpiCardSkeleton, TableRowSkeleton } from '@/components/ui/skeleton';
import { AcademicClassReport, AcademicStudentRow } from '@/components/pdf/AcademicClassReport';
import { AcademicStudentReport } from '@/components/pdf/AcademicStudentReport';
import { exportComponentToPdf } from '@/lib/pdf-generator';

interface AcademicTestOption {
  id: string;
  title: string;
  subject: string;
  totalQuestions: number;
  qmjTopic: string;
  quarter: string;
}

const ACADEMIC_TESTS: AcademicTestOption[] = [
  {
    id: 'info_q1',
    title: 'Срез знаний по Информатике (1-я четверть)',
    subject: 'Информатика',
    totalQuestions: 25,
    qmjTopic: 'ҚМЖ 1.4: Архитектура ЭВМ, сети и базы данных',
    quarter: '1-я четверть 2026',
  },
  {
    id: 'physics_mech',
    title: 'Контрольное тестирование по Физике: Механика',
    subject: 'Физика',
    totalQuestions: 20,
    qmjTopic: 'ҚМЖ 2.1: Законы Ньютона и динамика твердого тела',
    quarter: '1-я четверть 2026',
  },
  {
    id: 'math_algebra',
    title: 'Срез знаний по Алгебре: Квадратичные уравнения',
    subject: 'Алгебра',
    totalQuestions: 20,
    qmjTopic: 'ҚМЖ 1.8: Квадратичные функции и неравенства',
    quarter: '1-я четверть 2026',
  },
  {
    id: 'python_prog',
    title: 'Диагностический срез по Программированию: Python',
    subject: 'Информатика',
    totalQuestions: 15,
    qmjTopic: 'ҚМЖ 3.2: Алгоритмы сортировки и структуры данных',
    quarter: '1-я четверть 2026',
  },
];

const QMJ_PLANS = [
  {
    id: 'qmj-1',
    subject: 'Информатика',
    grade: '10-сынып',
    topic: 'Алгоритмизация и программирование в Python',
    status: 'Бекітілді (Утвержден)',
    approvedDate: '12.09.2026',
    hours: '12 сағат',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'qmj-2',
    subject: 'Физика',
    grade: '9-сынып',
    topic: 'Кинематика және динамика негіздері',
    status: 'Бекітілді (Утвержден)',
    approvedDate: '10.09.2026',
    hours: '16 сағат',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'qmj-3',
    subject: 'Алгебра',
    grade: '8-сынып',
    topic: 'Квадрат теңдеулер мен теңсіздіктер',
    status: 'Тексеруде (На проверке)',
    approvedDate: '15.09.2026',
    hours: '14 сағат',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
];

const MOCK_ACADEMIC_STUDENTS: AcademicStudentRow[] = [
  { id: '1', student_id: 'std-101', student_name: 'Айдос Нурланов', class_id: '10А', subject: 'Информатика', test_title: 'Срез знаний по Информатике (1-я четверть)', is_completed: true, score: 94, grade_level: 'EXCELLENT', completed_at: '2026-08-18T10:30:00Z', qmj_topic: 'Архитектура ЭВМ' },
  { id: '2', student_id: 'std-102', student_name: 'Айзере Серикова', class_id: '10А', subject: 'Информатика', test_title: 'Срез знаний по Информатике (1-я четверть)', is_completed: true, score: 88, grade_level: 'EXCELLENT', completed_at: '2026-08-18T10:45:00Z', qmj_topic: 'Архитектура ЭВМ' },
  { id: '3', student_id: 'std-103', student_name: 'Батырхан Садыков', class_id: '10А', subject: 'Информатика', test_title: 'Срез знаний по Информатике (1-я четверть)', is_completed: true, score: 76, grade_level: 'GOOD', completed_at: '2026-08-18T11:15:00Z', qmj_topic: 'Архитектура ЭВМ' },
  { id: '4', student_id: 'std-104', student_name: 'Данияр Темирлан', class_id: '10А', subject: 'Информатика', test_title: 'Срез знаний по Информатике (1-я четверть)', is_completed: true, score: 58, grade_level: 'SATISFACTORY', completed_at: '2026-08-19T09:20:00Z', qmj_topic: 'Архитектура ЭВМ' },
  { id: '5', student_id: 'std-105', student_name: 'Жанель Касымова', class_id: '10А', subject: 'Информатика', test_title: 'Срез знаний по Информатике (1-я четверть)', is_completed: false, score: 0, grade_level: 'NEEDS_ATTENTION', completed_at: null, qmj_topic: 'Архитектура ЭВМ' },
  { id: '6', student_id: 'std-106', student_name: 'Ернар Асылбеков', class_id: '9Б', subject: 'Физика', test_title: 'Контрольное тестирование по Физике: Механика', is_completed: true, score: 92, grade_level: 'EXCELLENT', completed_at: '2026-08-17T14:10:00Z', qmj_topic: 'Динамика' },
  { id: '7', student_id: 'std-107', student_name: 'Мадина Омарова', class_id: '9Б', subject: 'Физика', test_title: 'Контрольное тестирование по Физике: Механика', is_completed: true, score: 72, grade_level: 'GOOD', completed_at: '2026-08-17T14:35:00Z', qmj_topic: 'Динамика' },
  { id: '8', student_id: 'std-108', student_name: 'Санжар Жаксылык', class_id: '9Б', subject: 'Физика', test_title: 'Контрольное тестирование по Физике: Механика', is_completed: true, score: 48, grade_level: 'NEEDS_ATTENTION', completed_at: '2026-08-17T14:50:00Z', qmj_topic: 'Динамика' },
  { id: '9', student_id: 'std-109', student_name: 'Камилла Мусина', class_id: '8А', subject: 'Алгебра', test_title: 'Срез знаний по Алгебре: Квадратичные уравнения', is_completed: true, score: 86, grade_level: 'EXCELLENT', completed_at: '2026-08-19T11:00:00Z', qmj_topic: 'Квадратные уравнения' },
  { id: '10', student_id: 'std-110', student_name: 'Темирлан Болатов', class_id: '8А', subject: 'Алгебра', test_title: 'Срез знаний по Алгебре: Квадратичные уравнения', is_completed: true, score: 68, grade_level: 'SATISFACTORY', completed_at: '2026-08-19T11:25:00Z', qmj_topic: 'Квадратные уравнения' },
  { id: '11', student_id: 'std-111', student_name: 'Амина Ержанова', class_id: '11А', subject: 'Информатика', test_title: 'Диагностический срез по Программированию: Python', is_completed: true, score: 98, grade_level: 'EXCELLENT', completed_at: '2026-08-16T12:00:00Z', qmj_topic: 'Алгоритмы' },
  { id: '12', student_id: 'std-112', student_name: 'Алишер Жумабаев', class_id: '11А', subject: 'Информатика', test_title: 'Диагностический срез по Программированию: Python', is_completed: true, score: 82, grade_level: 'GOOD', completed_at: '2026-08-16T12:20:00Z', qmj_topic: 'Алгоритмы' },
];

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const { lang, t } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedTestId, setSelectedTestId] = useState<string>('info_q1');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [inspectStudent, setInspectStudent] = useState<AcademicStudentRow | null>(null);

  // Hidden print refs
  const classReportRef = useRef<HTMLDivElement>(null);
  const studentReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Parallelized initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const currentTest = useMemo(() => {
    return ACADEMIC_TESTS.find((t) => t.id === selectedTestId) || ACADEMIC_TESTS[0];
  }, [selectedTestId]);

  // Filter students based on Class, Test, Grade Filter & Search Query
  const filteredStudents = useMemo(() => {
    return MOCK_ACADEMIC_STUDENTS.filter((student) => {
      const matchClass = selectedClass === 'ALL' || student.class_id === selectedClass;
      const matchTest = student.test_title.toLowerCase().includes(currentTest.subject.toLowerCase()) ||
                        selectedClass === 'ALL' || student.subject === currentTest.subject;
      const matchGrade = selectedGradeFilter === 'ALL' || student.grade_level === selectedGradeFilter;
      const matchSearch =
        debouncedSearch === '' ||
        student.student_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        student.class_id.toLowerCase().includes(debouncedSearch.toLowerCase());

      return matchClass && matchGrade && matchSearch;
    });
  }, [selectedClass, currentTest, selectedGradeFilter, debouncedSearch]);

  // Academic KPIs
  const kpis = useMemo(() => {
    const total = filteredStudents.length;
    const completed = filteredStudents.filter((s) => s.is_completed);
    const completedCount = completed.length;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const avgScore =
      completedCount > 0
        ? Math.round(completed.reduce((acc, s) => acc + s.score, 0) / completedCount)
        : 0;
    const qualityCount = completed.filter(
      (s) => s.grade_level === 'EXCELLENT' || s.grade_level === 'GOOD'
    ).length;
    const qualityRate = completedCount > 0 ? Math.round((qualityCount / completedCount) * 100) : 0;

    return { total, completedCount, completionRate, avgScore, qualityRate };
  }, [filteredStudents]);

  // Export Class Report to PDF
  const handleExportClassPdf = async () => {
    if (!classReportRef.current) return;
    try {
      setIsExportingPdf(true);
      await exportComponentToPdf(
        classReportRef.current,
        `Vedomost_${currentTest.subject}_${selectedClass}_2026.pdf`
      );
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Individual Student Report to PDF
  const handleExportStudentPdf = async (student: AcademicStudentRow) => {
    setInspectStudent(student);
    setTimeout(async () => {
      if (studentReportRef.current) {
        try {
          setIsExportingPdf(true);
          await exportComponentToPdf(
            studentReportRef.current,
            `Academic_Card_${student.student_name.replace(/\s+/g, '_')}.pdf`
          );
        } catch (err) {
          console.error('Student PDF export failed:', err);
        } finally {
          setIsExportingPdf(false);
        }
      }
    }, 150);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* ── 1. Top Header & Title ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2 border border-emerald-200 dark:border-emerald-800">
            <School className="w-3.5 h-3.5" />
            <span>Кафедра МИФ • Математика, Информатика, Физика</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
            Мониторинг академической успеваемости
          </h1>
          <p className="text-xs sm:text-sm text-[#464555] dark:text-zinc-400 mt-1">
            Анализ контрольных срезов знаний, академических результатов и трекинг ҚМЖ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportClassPdf}
            disabled={isExportingPdf || filteredStudents.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? 'Генерация PDF...' : 'Ведомость класса (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. ҚМЖ (Краткосрочные планы) Tracking Widget ─────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                Трекинг краткосрочных планов (ҚМЖ)
              </h3>
              <p className="text-xs text-[#464555] dark:text-zinc-400">
                1-я четверть 2026 • Утверждено 94% планов кафедры
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 size={13} className="stroke-[2.5]" />
            <span>ҚМЖ бекітілді</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {QMJ_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/50 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-extrabold text-[#0b1c30] dark:text-zinc-100">
                    {plan.subject} ({plan.grade})
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">{plan.hours}</span>
                </div>
                <p className="text-xs text-[#464555] dark:text-zinc-300 font-medium line-clamp-2">
                  {plan.topic}
                </p>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-200/50 dark:border-zinc-700/40">
                <span className={`px-2 py-0.5 rounded-md font-bold border ${plan.badgeBg}`}>
                  {plan.status}
                </span>
                <span className="text-slate-400">от {plan.approvedDate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Academic KPI Section ─────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            {/* Card 1: Total Students */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                  <School className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  Охват 100%
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-[#464555] dark:text-zinc-400">Учеников в выборке</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  {kpis.total}
                </h3>
              </div>
            </div>

            {/* Card 2: Completed Assessments */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                  {kpis.completionRate}%
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-[#464555] dark:text-zinc-400">Сдали тестирование</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  {kpis.completedCount} <span className="text-sm font-normal text-slate-400">/ {kpis.total}</span>
                </h3>
              </div>
            </div>

            {/* Card 3: Quality of Knowledge (4 & 5) */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                  4 и 5
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-[#464555] dark:text-zinc-400">Качество знаний</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  {kpis.qualityRate}%
                </h3>
              </div>
            </div>

            {/* Card 4: Average Score */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                  из 100
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-[#464555] dark:text-zinc-400">Средний балл среза</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  {kpis.avgScore} <span className="text-xs font-semibold text-slate-400">баллов</span>
                </h3>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── 4. Academic Filters & Table ─────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div>
              <h3 className="font-bold text-lg text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                Результаты срезов знаний по классам
              </h3>
              <p className="text-xs text-[#464555] dark:text-zinc-400">
                Текущий срез: <span className="font-semibold text-emerald-600">{currentTest.title}</span> ({currentTest.qmjTopic})
              </p>
            </div>

            {/* Debounced Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по ФИО или классу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f8fafc] dark:bg-zinc-800/80 text-[#0b1c30] dark:text-zinc-100 text-xs rounded-full border border-slate-200 dark:border-zinc-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 py-2 pl-9 pr-4"
              />
            </div>
          </div>

          {/* Selectors Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Academic Assessment Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">ПРЕДМЕТНЫЙ СРЕЗ ЗНАНИЙ</label>
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="w-full bg-[#f8fafc] dark:bg-zinc-800 text-xs font-semibold text-[#0b1c30] dark:text-zinc-100 rounded-xl border border-slate-200 dark:border-zinc-700 py-2 px-3 focus:ring-2 focus:ring-emerald-500/20"
              >
                {ACADEMIC_TESTS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Class Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">КЛАСС / ПАРАЛЛЕЛЬ</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-[#f8fafc] dark:bg-zinc-800 text-xs font-semibold text-[#0b1c30] dark:text-zinc-100 rounded-xl border border-slate-200 dark:border-zinc-700 py-2 px-3 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">Все классы</option>
                <option value="8А">8 «А» класс</option>
                <option value="9Б">9 «Б» класс</option>
                <option value="10А">10 «А» класс</option>
                <option value="11А">11 «А» класс</option>
              </select>
            </div>

            {/* 3. Performance Level Filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">УРОВЕНЬ УСПЕВАЕМОСТИ</label>
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="w-full bg-[#f8fafc] dark:bg-zinc-800 text-xs font-semibold text-[#0b1c30] dark:text-zinc-100 rounded-xl border border-slate-200 dark:border-zinc-700 py-2 px-3 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">Все уровни</option>
                <option value="EXCELLENT">Отлично (85+ баллов)</option>
                <option value="GOOD">Хорошо (70-84 баллов)</option>
                <option value="SATISFACTORY">Удовлетворительно (50-69)</option>
                <option value="NEEDS_ATTENTION">Требует внимания (&lt;50)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table of Academic Results ─────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-700 text-[#464555] dark:text-zinc-400 font-bold uppercase text-[11px]">
                <th className="py-3.5 px-6">Ученик</th>
                <th className="py-3.5 px-6">Класс</th>
                <th className="py-3.5 px-6">Статус сдачи</th>
                <th className="py-3.5 px-6">Балл (100)</th>
                <th className="py-3.5 px-6">Оценка / Успеваемость</th>
                <th className="py-3.5 px-6">Дата сдачи</th>
                <th className="py-3.5 px-6 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {isLoading ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Учеников по выбранным фильтрам не найдено.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  let gradeBadge = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200';
                  let gradeText = 'Отлично (85+)';

                  if (student.grade_level === 'GOOD') {
                    gradeBadge = 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200';
                    gradeText = 'Хорошо (70-84)';
                  } else if (student.grade_level === 'SATISFACTORY') {
                    gradeBadge = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200';
                    gradeText = 'Удовл. (50-69)';
                  } else if (student.grade_level === 'NEEDS_ATTENTION') {
                    gradeBadge = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200';
                    gradeText = 'Требует внимания';
                  }

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#f8fafc] dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-[#0b1c30] dark:text-zinc-100">
                        {student.student_name}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-600 dark:text-zinc-400">
                        {student.class_id}
                      </td>
                      <td className="py-4 px-6">
                        {student.is_completed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Сдал</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Не сдал</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-black text-sm text-[#0b1c30] dark:text-zinc-100">
                        {student.is_completed ? `${student.score}` : '—'}
                      </td>
                      <td className="py-4 px-6">
                        {student.is_completed ? (
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${gradeBadge}`}>
                            {gradeText}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {student.completed_at
                          ? new Date(student.completed_at).toLocaleDateString('ru-RU')
                          : '—'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setInspectStudent(student)}
                            title="Просмотр работы"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExportStudentPdf(student)}
                            title="Скачать индивидуальную карточку (PDF)"
                            disabled={!student.is_completed || isExportingPdf}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 disabled:opacity-30 transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
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
      </div>

      {/* ── 5. Modal: View Student Academic Details ─────────────────── */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <h3 className="font-bold text-lg text-[#0b1c30] dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                  {inspectStudent.student_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Класс {inspectStudent.class_id} • {currentTest.subject}
                </p>
              </div>
              <button
                onClick={() => setInspectStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-zinc-800/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">Срез знаний:</span>
                <span className="text-xs font-bold text-[#0b1c30] dark:text-zinc-100">{currentTest.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">Итоговый балл:</span>
                <span className="text-sm font-extrabold text-emerald-600">
                  {inspectStudent.is_completed ? `${inspectStudent.score} / 100` : 'Не сдано'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">Привязка к ҚМЖ:</span>
                <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">{currentTest.qmjTopic}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setInspectStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Закрыть
              </button>
              {inspectStudent.is_completed && (
                <button
                  onClick={() => handleExportStudentPdf(inspectStudent)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать карточку (PDF)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Hidden Print Component for PDF Generation ────────────── */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none' }}>
        <div ref={classReportRef}>
          <AcademicClassReport
            classId={selectedClass}
            subject={currentTest.subject}
            testTitle={currentTest.title}
            departmentName="Кафедра МИФ (Математика, Информатика, Физика)"
            teacherName={user?.full_name || 'Учитель-предметник'}
            students={filteredStudents}
            qmjTitle={currentTest.qmjTopic}
          />
        </div>
        {inspectStudent && (
          <div ref={studentReportRef}>
            <AcademicStudentReport
              studentName={inspectStudent.student_name}
              studentId={inspectStudent.student_id}
              classId={inspectStudent.class_id}
              subject={currentTest.subject}
              testTitle={currentTest.title}
              completedAt={inspectStudent.completed_at}
              score={inspectStudent.score}
              gradeLevel={inspectStudent.grade_level}
              departmentName="Кафедра МИФ (Математика, Информатика, Физика)"
              teacherName={user?.full_name || 'Учитель-предметник'}
              qmjTopic={currentTest.qmjTopic}
            />
          </div>
        )}
      </div>
    </div>
  );
}
