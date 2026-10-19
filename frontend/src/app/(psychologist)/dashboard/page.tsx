'use client';

import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  BellRing,
  ArrowRight,
  BarChart2,
  Brain,
  BarChart3,
  Flame,
  Dices,
  CheckCircle2,
  Inbox,
  Sparkles,
  Trash2,
  ShieldAlert,
  Activity,
  Layers,
  ClipboardList,
  Search,
  Download,
  Eye,
  X,
  FileText,
  UserCheck,
  Award,
} from 'lucide-react';
import { LogoIcon } from '@/components/ui/logo-icon';
import { analyticsApi, adminApi } from '@/lib/api';
import { ClassComparisonItem, RiskLevel, ScaleResult, QuestionResponse } from '@/types/test';
import { playEmergencyAlertSound } from '@/lib/sound-alerts';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/context/auth-context';
import type { MetricDataPoint } from '@/components/ui/analytics-metric-card';
import { formatLocalizedChartDate } from '@/lib/chart-dates';
import { ClassSummaryReport, ClassSummaryStudentRow } from '@/components/pdf/ClassSummaryReport';
import { DEMO_ASSESSMENTS, DEMO_METHODOLOGIES, getDemoAnswers } from '@/mocks/assessment-demo';
import { UniversalReportData } from '@/types/pdf-report';





interface EarlyWarningItem {
  student_id: string;
  student_name: string;
  class_id: string;
  severity: 'CRITICAL' | 'HIGH';
  reasons: string[];
  avg_stress: number | null;
  tests_count: number;
}

interface DashboardStats {
  total_students: number;
  waiting_psychologist: number;
  risk_distribution: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
  critical_count: number;
  high_count: number;
  early_warnings?: EarlyWarningItem[];
}

interface PsychStudentRow {
  id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  test_id: string;
  test_name: string;
  is_completed: boolean;
  total_score: number;
  risk_level: RiskLevel;
  completed_at: string | null;
  scales: ScaleResult[];
  question_responses: QuestionResponse[];
}

const PSYCH_METHODOLOGIES = DEMO_METHODOLOGIES;

const RISK_CONFIG = [
  { key: 'CRITICAL', labelRu: 'Критический', labelKk: 'Қауіпті (Критикалық)', color: '#ef4444', badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { key: 'HIGH',     labelRu: 'Высокий',     labelKk: 'Жоғары қауіп',          color: '#f97316', badgeColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  { key: 'MEDIUM',   labelRu: 'Средний',     labelKk: 'Орташа деңгей',         color: '#eab308', badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { key: 'LOW',      labelRu: 'Низкий',      labelKk: 'Қалыпты (Төмен қауіп)', color: '#22c55e', badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
];

const AnalyticsMetricCard = dynamic(() => import('@/components/ui/analytics-metric-card'), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="min-h-[360px] rounded-2xl border border-gray-100 bg-white animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />,
});

const BarPatternChart = dynamic(() => import('@/components/ui/demo'), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="min-h-[360px] rounded-2xl border border-gray-100 bg-white animate-pulse dark:border-neutral-800 dark:bg-neutral-900" />,
});

function DeferredChart({ children, minHeight = 360 }: { children: ReactNode; minHeight?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    if (isNearViewport) return;

    const element = containerRef.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '350px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isNearViewport]);

  return (
    <div ref={containerRef}>
      {isNearViewport ? children : (
        <div
          aria-hidden="true"
          style={{ minHeight }}
          className="rounded-2xl border border-gray-100 bg-white/70 animate-pulse dark:border-neutral-800 dark:bg-neutral-900/70"
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const isDemo = process.env.NODE_ENV === 'development' && user?.id === 'local-demo-psychologist';

  // Tab switcher: overview vs psych_tests
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'psych_tests'>('overview');

  useEffect(() => {
    if (user?.id === 'local-demo-psychologist') setActiveMainTab('psych_tests');
  }, [user?.id]);

  // Stats state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [classComparison, setClassComparison] = useState<ClassComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(true);
  const [activityData, setActivityData] = useState<{
    '7d': MetricDataPoint[];
    '14d': MetricDataPoint[];
    '30d': MetricDataPoint[];
  } | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const previousRiskCounts = useRef<{ high: number; critical: number } | null>(null);

  // Psych Testing tab state
  const [selectedPsychTestId, setSelectedPsychTestId] = useState<string>('eysenck');
  const [selectedPsychClass, setSelectedPsychClass] = useState<string>('ALL');
  const [selectedPsychRisk, setSelectedPsychRisk] = useState<string>('ALL');
  useEffect(() => { setSelectedPsychRisk('ALL'); setInspectPsychStudent(null); }, [selectedPsychTestId]);
  const [psychSearchQuery, setPsychSearchQuery] = useState<string>('');
  const [inspectPsychStudent, setInspectPsychStudent] = useState<PsychStudentRow | null>(null);
  const [modalTab, setModalTab] = useState<'scales' | 'answers'>('answers');
  const [modalScaleFilter, setModalScaleFilter] = useState<string>('ALL');
  const [modalSearch, setModalSearch] = useState<string>('');
  const [isExportingPsychPdf, setIsExportingPsychPdf] = useState<boolean>(false);


  // PDF Refs
  const psychClassReportRef = useRef<HTMLDivElement>(null);


  const fetchDashboardData = useCallback(async () => {
    try {
      const r = await analyticsApi.getDashboard();
      const current = {
        high: Number(r.data?.high_count || 0),
        critical: Number(r.data?.critical_count || 0),
      };
      const previous = previousRiskCounts.current;
      if (previous && (current.high > previous.high || current.critical > previous.critical)) {
        playEmergencyAlertSound();
        setLiveAlert(lang === 'kk'
          ? 'Жоғары немесе сыни тәуекел деңгейі бар жаңа нәтиже тіркелді.'
          : 'Поступил новый результат с высоким или критическим уровнем риска.');
      }
      previousRiskCounts.current = current;
      setStats(r.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  const fetchClassComparison = useCallback(async () => {
    try {
      const res = await analyticsApi.getClassComparison();
      setClassComparison(res.data || []);
    } catch (err) {
      console.error('Failed to fetch class comparison:', err);
    } finally {
      setLoadingComparison(false);
    }
  }, []);

  const fetchActivityHistory = useCallback(async () => {
    try {
      setLoadingActivity(true);
      const response = await analyticsApi.getActivity(30);
      const points: MetricDataPoint[] = (response.data?.items || []).map(
        (item: { date: string; tests: number; moods: number; dialogs: number }) => {
          const day = new Date(`${item.date}T12:00:00`);
          return {
            date: item.date,
            displayDate: formatLocalizedChartDate(day, lang, { format: 'short' }),
            value: item.tests + item.dialogs + Math.ceil(item.moods * 0.7),
            secondaryValue: item.moods,
          };
        }
      );

      setActivityData({
        '7d': points.slice(-7),
        '14d': points.slice(-14),
        '30d': points,
      });
    } catch (err) {
      console.error('Failed to fetch activity metrics:', err);
    } finally {
      setLoadingActivity(false);
    }
  }, [lang]);

  useEffect(() => {
    if (!user || isDemo) { setLoading(false); setLoadingComparison(false); setLoadingActivity(false); return; }
    fetchDashboardData();
    fetchClassComparison();
    fetchActivityHistory();
  }, [fetchDashboardData, fetchClassComparison, fetchActivityHistory, isDemo, user]);

  useEffect(() => {
    if (!user || isDemo) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchDashboardData();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [fetchDashboardData, isDemo, user]);

  const devToolsEnabled = !isDemo && process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true';

  const loadAllDashboardData = useCallback(async () => {
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchClassComparison(),
        fetchActivityHistory(),
      ]);
    } catch (err) {
      console.error('Failed to load all dashboard data:', err);
    }
  }, [fetchDashboardData, fetchClassComparison, fetchActivityHistory]);

  const handleSeedDemo = async () => {
    if (!confirm('Пересоздать демо-данные? Старые тестовые записи будут безопасно очищены.')) return;
    try {
      setSeeding(true);
      setSeedMessage(null);
      const res = await adminApi.seedDemoData();
      setSeedMessage(res.data?.message || 'Демо-данные успешно созданы!');
      await loadAllDashboardData();
      setTimeout(() => setSeedMessage(null), 6000);
    } catch (err: unknown) {
      console.error('Failed to seed demo data:', err);
      const errMsg = (err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail)
        : null) || (err instanceof Error ? err.message : 'Ошибка генерации');
      alert(errMsg);
      setSeedMessage(errMsg);
    } finally {
      setSeeding(false);
    }
  };

  const handleClearDemo = async () => {
    if (!confirm('Удалить все демо-данные? Реальные пользователи не будут затронуты.')) return;
    try {
      setSeeding(true);
      setSeedMessage(null);
      const res = await adminApi.clearDemoData();
      setSeedMessage(res.data?.message || 'Демо-данные успешно очищены!');
      await loadAllDashboardData();
      setTimeout(() => setSeedMessage(null), 6000);
    } catch (err: unknown) {
      console.error('Failed to clear demo data:', err);
      const errMsg = (err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail)
        : null) || (err instanceof Error ? err.message : 'Ошибка очистки');
      alert(errMsg);
      setSeedMessage(errMsg);
    } finally {
      setSeeding(false);
    }
  };

  const chartData = classComparison.map((item) => ({
    name: item.class_id,
    CRITICAL: item.risk_counts?.CRITICAL || 0,
    HIGH: item.risk_counts?.HIGH || 0,
    MEDIUM: item.risk_counts?.MEDIUM || 0,
    LOW: item.risk_counts?.LOW || 0,
    avg_stress: item.avg_stress || 0,
    total: item.total_assessments,
  }));

  const totalAssessments = stats
    ? Object.values(stats.risk_distribution).reduce((a, b) => a + b, 0)
    : 0;

  const currentPsychTest = useMemo(() => {
    return PSYCH_METHODOLOGIES.find((m) => m.id === selectedPsychTestId) || PSYCH_METHODOLOGIES[0];
  }, [selectedPsychTestId]);

  // Filtered psychological students
  const filteredPsychStudents = useMemo(() => {
    return (isDemo ? DEMO_ASSESSMENTS : []).filter((student) => {
      const matchTest = student.test_id === selectedPsychTestId;
      const matchClass = selectedPsychClass === 'ALL' || student.class_id === selectedPsychClass;
      const matchRisk = selectedPsychRisk === 'ALL' || student.risk_level === selectedPsychRisk;
      const matchSearch =
        psychSearchQuery === '' ||
        student.student_name.toLowerCase().includes(psychSearchQuery.toLowerCase()) ||
        student.class_id.toLowerCase().includes(psychSearchQuery.toLowerCase());
      return matchTest && matchClass && matchRisk && matchSearch;
    });
  }, [selectedPsychTestId, selectedPsychClass, selectedPsychRisk, psychSearchQuery, isDemo]);

  const classSummaryRows: ClassSummaryStudentRow[] = useMemo(() => {
    return filteredPsychStudents.map((s) => ({
      student_name: s.student_name,
      class_id: s.class_id,
      is_completed: s.is_completed,
      total_score: s.total_score,
      risk_level: s.risk_level,
      completed_at: s.completed_at,
    }));
  }, [filteredPsychStudents]);

  // PDF Export for Class Summary
  const handleExportClassPsychPdf = async () => {
    if (!psychClassReportRef.current) return;
    try {
      setPdfError(null);
      setIsExportingPsychPdf(true);
      const { exportComponentToPdf } = await import('@/lib/pdf-generator');
      await exportComponentToPdf(
        psychClassReportRef.current,
        `Сводный_протокол_${currentPsychTest.title.replace(/\s+/g, '_')}_${selectedPsychClass === 'ALL' ? 'Все_классы' : selectedPsychClass}.pdf`
      );
    } catch (err) {
      setPdfError('Не удалось сформировать сводный отчёт. Повторите попытку.');
    } finally {
      setIsExportingPsychPdf(false);
    }
  };

  // PDF Export for Individual Student (Universal)
  const handleExportStudentPsychPdf = async (student: PsychStudentRow) => {
    try {
      setPdfError(null);
      setIsExportingPsychPdf(true);
      const isEysenck =
        student.test_id.toLowerCase().includes('eysenck') ||
        student.test_name.toLowerCase().includes('айзенк') ||
        student.test_name.toLowerCase().includes('epi-a');

      const reportData: UniversalReportData = {
        isDemo: true,
        student: {
          fullName: student.student_name,
          className: `Класс ${student.class_id}`,
        },
        test: {
          name: student.test_name,
          date: student.completed_at
            ? new Date(student.completed_at).toLocaleDateString('ru-RU')
            : new Date().toLocaleDateString('ru-RU'),
          totalScore: isEysenck || student.test_id === 'klimov' ? '-' : `${student.total_score} баллов`,
          riskLevel: student.test_id === 'klimov' ? 'Не оценивается этой методикой' :
            student.risk_level === 'CRITICAL'
              ? 'Критический риск'
              : student.risk_level === 'HIGH'
              ? 'Высокий риск'
              : student.risk_level === 'MEDIUM'
              ? 'Умеренный риск'
              : 'Норма (Низкий риск)',
        },
        scales: student.scales.map((scale) => ({
          name: String(scale.scale_name),
          rawScore: scale.raw_score,
          maxScore: scale.max_score,
          percentage: scale.percentage,
          interpretation: scale.interpretation,
        })),
        answers: getDemoAnswers(student).map((answer) => ({
          number: answer.questionId, questionText: answer.questionText, scaleName: answer.scaleName,
          studentAnswer: answer.value,
        })),
      };

      const { generatePdfReport } = await import('@/lib/pdf-generator');
      await generatePdfReport(reportData);
    } catch (err) {
      setPdfError(err instanceof Error && /[А-Яа-я]/.test(err.message) ? err.message : 'Не удалось сформировать отчёт. Повторите попытку.');
    } finally {
      setIsExportingPsychPdf(false);
    }
  };


  const formattedClassComparisonData = useMemo(() => {
    if (classComparison && classComparison.length > 0) {
      return classComparison.map((c) => ({
        name: c.class_id,
        norm: c.risk_counts?.LOW || 0,
        medium: c.risk_counts?.MEDIUM || 0,
        high: c.risk_counts?.HIGH || 0,
        critical: c.risk_counts?.CRITICAL || 0,
      }));
    }
    return [
      { name: '8А', norm: 18, medium: 5, high: 3, critical: 1 },
      { name: '8Б', norm: 16, medium: 6, high: 4, critical: 2 },
      { name: '9А', norm: 14, medium: 7, high: 5, critical: 2 },
      { name: '9Б', norm: 12, medium: 8, high: 6, critical: 3 },
      { name: '10А', norm: 20, medium: 4, high: 2, critical: 1 },
      { name: '10Б', norm: 17, medium: 5, high: 3, critical: 1 },
      { name: '11А', norm: 15, medium: 6, high: 4, critical: 2 },
      { name: '11Б', norm: 13, medium: 7, high: 5, critical: 2 },
    ];
  }, [classComparison]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full max-w-full overflow-x-hidden">
      {pdfError && <p role="alert" className="rounded-xl border border-red-300 p-3 text-red-700">{pdfError}</p>}
      {isDemo && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          Демо-режим: ответы и ученики вымышлены и хранятся только в коде проекта. Выберите методику, откройте строку ученика и нажмите значок скачивания, чтобы проверить индивидуальный PDF.
        </div>
      )}
      {/* ─── 1. EXECUTIVE HEADER & TABS ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs w-full">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold mb-2 border border-purple-200 dark:border-purple-800">
            <LogoIcon className="w-3.5 h-3.5" />
            <span>Кабинет педагога-психолога • AISezim</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight break-words">
            Психодиагностика и мониторинг климата
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 break-words">
            Предиктивный анализ психологических рисков, стандартизированные методики и тревожные сигналы
          </p>
        </div>

        {/* Tab Controls Bar with horizontal scroll for mobile */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-neutral-800 rounded-xl border border-gray-200/80 dark:border-neutral-700 overflow-x-auto whitespace-nowrap hide-scrollbar pb-1 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveMainTab('overview')}
            className={`flex items-center justify-center gap-2 whitespace-nowrap px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out shrink-0 ${
              activeMainTab === 'overview'
                ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-white font-semibold shadow-sm border border-gray-200/60 dark:border-neutral-700'
                : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <BarChart2 className={`w-4 h-4 shrink-0 ${activeMainTab === 'overview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
            <span>{lang === 'kk' ? 'Қауіптер аналитикасы' : 'Аналитика рисков'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('psych_tests')}
            className={`flex items-center justify-center gap-2 whitespace-nowrap px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out shrink-0 ${
              activeMainTab === 'psych_tests'
                ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-white font-semibold shadow-sm border border-gray-200/60 dark:neutral-700'
                : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Brain className={`w-4 h-4 shrink-0 ${activeMainTab === 'psych_tests' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
            <span>{lang === 'kk' ? 'Психодиагностикалық әдістемелер' : 'Психологические методики'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Alert Banner */}
      {liveAlert && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl shadow-lg animate-bounce w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <BellRing size={20} />
            </div>
            <div>
              <div className="text-zinc-900 dark:text-white font-bold text-sm">{liveAlert}</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {lang === 'kk' ? 'Маманның жедел араласуы қажет' : 'Требуется оперативное вмешательство специалиста'}
              </div>
            </div>
          </div>
          <Link
            href="/chats"
            onClick={() => setLiveAlert(null)}
            className="btn-danger flex items-center gap-1.5 !py-2 !px-4 text-xs font-bold w-full sm:w-auto justify-center"
          >
            <span>{lang === 'kk' ? 'Чатқа өту' : 'Перейти в чат'}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ─── TAB 1: OVERVIEW & RISK ANALYTICS ─────────────────────────────────── */}
      {activeMainTab === 'overview' && (
        <div className="space-y-6 w-full">
          {/* KPI Cards: 2 columns on mobile, 4 columns on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
            {/* 1. Всего (Total Students) */}
            <Link
              href="/archive"
              className="bg-white dark:bg-zinc-900/80 rounded-2xl p-3.5 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black group"
            >
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <div className="p-2 sm:p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[9px] sm:text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 px-2 sm:px-2.5 py-0.5 rounded-full">
                  {t.dashboard?.kpiTotal || (lang === 'kk' ? 'Барлығы' : 'Всего')}
                </span>
              </div>
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {loading ? '—' : stats?.total_students ?? 0}
                </div>
                <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 font-medium leading-tight">
                  {t.dashboard?.kpiTotalDesc || (lang === 'kk' ? 'Тіркелген оқушылар' : 'Зарегистрировано учеников')}
                </div>
              </div>
            </Link>

            {/* 2. Очередь (Queue / Waiting Consultation) */}
            <Link
              href="/chats"
              className="bg-white dark:bg-zinc-900/80 rounded-2xl p-3.5 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-amber-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black group"
            >
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <div className="p-2 sm:p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[9px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/50 px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  {(stats?.waiting_psychologist ?? 0) > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  )}
                  {t.dashboard?.kpiQueue || (lang === 'kk' ? 'Кезек' : 'Очередь')}
                </span>
              </div>
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {loading ? '—' : stats?.waiting_psychologist ?? 0}
                </div>
                <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 font-medium leading-tight group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                  {t.dashboard?.kpiQueueDesc || (lang === 'kk' ? 'Кеңес күтуде' : 'Ожидают консультации')}
                </div>
              </div>
            </Link>

            {/* 3. Критический (Critical Risk Group) */}
            <Link
              href="/archive"
              className="bg-white dark:bg-zinc-900/80 rounded-2xl p-3.5 sm:p-5 border border-rose-200 dark:border-rose-900/40 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-rose-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <div className="p-2 sm:p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[9px] sm:text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 px-2 sm:px-2.5 py-0.5 rounded-full">
                  {t.dashboard?.kpiCritical || (lang === 'kk' ? 'Қауіпті' : 'Критический')}
                </span>
              </div>
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                  {loading ? '—' : stats?.critical_count ?? 0}
                </div>
                <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 font-medium leading-tight">
                  {t.dashboard?.kpiCriticalDesc || (lang === 'kk' ? 'Критикалық қауіп тобы' : 'Группа критического риска')}
                </div>
              </div>
            </Link>

            {/* 4. Повышенный (High Risk Anxiety) */}
            <Link
              href="/archive"
              className="bg-white dark:bg-zinc-900/80 rounded-2xl p-3.5 sm:p-5 border border-orange-200 dark:border-orange-900/40 shadow-xs flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-orange-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black group"
            >
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <div className="p-2 sm:p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[9px] sm:text-[11px] font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-900/50 px-2 sm:px-2.5 py-0.5 rounded-full">
                  {t.dashboard?.kpiHigh || (lang === 'kk' ? 'Жоғары' : 'Повышенный')}
                </span>
              </div>
              <div>
                <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-orange-600 dark:text-orange-400">
                  {loading ? '—' : stats?.high_count ?? 0}
                </div>
                <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 font-medium leading-tight">
                  {t.dashboard?.kpiHighDesc || (lang === 'kk' ? 'Жоғары мазасыздық деңгейі' : 'Высокий уровень тревожности')}
                </div>
              </div>
            </Link>
          </div>

          {/* Activity Metric Card */}
          <DeferredChart minHeight={360}>
            <AnalyticsMetricCard
              title={t.dashboard?.activityDynamicsTitle || (lang === 'kk' ? 'Өтініштер динамикасы және психологиялық белсенділік' : 'Динамика обращений и психологической активности')}
              subtitle={t.dashboard?.activityDynamicsSubtitle || (lang === 'kk' ? 'Оқушылардың өтініш белсенділігі, чат-сессиялар және аяқталған диагностикалар' : 'Активность обращений учащихся, чат-сессии и завершенные диагностики')}
              badgeLabel={t.dashboard?.activityBadge || (lang === 'kk' ? 'Өтініштер ағыны' : 'Поток обращений')}
              unit={lang === 'kk' ? 'өтініш' : 'обращений'}
              periodData={activityData || undefined}
              initialPeriod="14d"
              initialChartType="area"
              colorScheme="indigo"
              lang={lang}
              isLoading={loadingActivity}
            />
          </DeferredChart>

          {/* Early Warning & Class Comparison Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-xs flex flex-col h-[520px]">
              <div className="p-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-500" />
                    <span>{t.dashboard?.earlyWarningTitle || (lang === 'kk' ? 'Дабыл белгілері' : 'Тревожные сигналы')}</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t.dashboard?.earlyWarningSubtitle || (lang === 'kk' ? 'Ерте скринингтік болжау' : 'Предиктивный ранний скрининг')}
                  </p>
                </div>
                <span className="bg-rose-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                  {stats?.early_warnings?.length ?? 0}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {stats?.early_warnings && stats.early_warnings.length > 0 ? (
                  stats.early_warnings.map((w) => {
                    const isCritical = w.severity === 'CRITICAL';
                    return (
                      <div
                        key={w.student_id}
                        className={`rounded-2xl p-4 transition-all duration-150 relative overflow-hidden flex flex-col justify-between space-y-2.5 border shadow-sm ${
                          isCritical
                            ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/50'
                            : 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-900/50'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                              {w.student_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                              {t.dashboard?.earlyWarningClass || (lang === 'kk' ? 'Сынып' : 'Класс')}: {w.class_id}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              isCritical
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200/60 dark:border-red-800/60'
                                : 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/60'
                            }`}
                          >
                            {isCritical ? (lang === 'kk' ? 'ҚАУІПТІ' : 'КРИТИЧЕСКИЙ') : (lang === 'kk' ? 'ЖОҒАРЫ' : 'ВЫСОКИЙ')}
                          </span>
                        </div>
                        <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
                          {w.reasons.map((r, i) => {
                            let localizedReason = r;
                            if (lang === 'kk') {
                              if (r.toLowerCase().includes('критический') || r.toLowerCase().includes('диагностик')) {
                                localizedReason = t.dashboard?.reasonCriticalDiag || 'Диагностикадағы критикалық қауіп';
                              } else if (r.toLowerCase().includes('стресс') && r.toLowerCase().includes('высокий')) {
                                localizedReason = t.dashboard?.reasonHighStress || 'Жоғары орташа стресс деңгейі';
                              } else if (r.toLowerCase().includes('хронический')) {
                                localizedReason = t.dashboard?.reasonStressAnxiety || 'Созылмалы стресс және мазасыздық';
                              }
                            }
                            return <li key={i} className="leading-snug">{localizedReason}</li>;
                          })}
                        </ul>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                    <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                    <p className="text-xs">{t.dashboard?.earlyWarningNoAlerts || (lang === 'kk' ? 'Дезадаптацияның қауіпті белгілері анықталған жоқ' : 'Критических сигналов дезадаптации не зафиксировано')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Bar Pattern Chart */}
            <div className="lg:col-span-8 w-full">
              <DeferredChart minHeight={360}>
                <BarPatternChart data={formattedClassComparisonData} lang={lang} />
              </DeferredChart>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: STANDARDIZED PSYCHOLOGICAL METHODOLOGIES ────────────────── */}
      {activeMainTab === 'psych_tests' && !isDemo && <p className="rounded-xl border p-4">Реальные результаты доступны в <Link href="/archive" className="underline">картотеке учеников</Link>. Демонстрационные записи здесь не отображаются.</p>}
      {activeMainTab === 'psych_tests' && isDemo && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            {/* Header and Selectors */}
            <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                    Мониторинг психологических методик
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Методика: <span className="font-semibold text-purple-600 dark:text-purple-400">{currentPsychTest.title}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Поиск по ФИО или классу..."
                      value={psychSearchQuery}
                      onChange={(e) => setPsychSearchQuery(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/80 text-xs text-zinc-900 dark:text-zinc-100 rounded-full border border-zinc-200 dark:border-zinc-700 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 py-2 pl-9 pr-4"
                    />
                  </div>

                  <button
                    onClick={handleExportClassPsychPdf}
                    disabled={isExportingPsychPdf || filteredPsychStudents.length === 0}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer whitespace-nowrap w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4" />
                    <span>Сводный протокол класса (PDF)</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">ПСИХОЛОГИЧЕСКАЯ МЕТОДИКА</label>
                  <select
                    value={selectedPsychTestId}
                    onChange={(e) => setSelectedPsychTestId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2 px-3 focus:ring-2 focus:ring-purple-500/20"
                  >
                    {PSYCH_METHODOLOGIES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">КЛАСС / ПАРАЛЛЕЛЬ</label>
                  <select
                    value={selectedPsychClass}
                    onChange={(e) => setSelectedPsychClass(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2 px-3 focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="ALL">Все классы</option>
                    <option value="8А">8 «А» класс</option>
                    <option value="8Б">8 «Б» класс</option>
                    <option value="9Б">9 «Б» класс</option>
                    <option value="10А">10 «А» класс</option>
                    <option value="11А">11 «А» класс</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">УРОВЕНЬ РИСКА</label>
                  <select
                    value={selectedPsychRisk}
                    onChange={(e) => setSelectedPsychRisk(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2 px-3 focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="ALL">Все уровни риска</option>
                    <option value="CRITICAL">Критический риск</option>
                    <option value="HIGH">Высокий риск</option>
                    <option value="MEDIUM">Средний риск</option>
                    <option value="LOW">Норма (Низкий риск)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table of Psychological Results: Table on md+, Cards on mobile */}
            <div className="w-full">
              <table className="w-full border-collapse text-xs">
                <thead className="hidden md:table-header-group">
                  <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-bold uppercase text-[11px]">
                    <th className="py-3.5 px-6 whitespace-nowrap">Ученик</th>
                    <th className="py-3.5 px-6 whitespace-nowrap">Класс</th>
                    <th className="py-3.5 px-6 whitespace-nowrap min-w-[140px]">Уровень риска</th>
                    <th className="py-3.5 px-6 min-w-[220px]">Основные шкалы</th>
                    <th className="py-3.5 px-6 whitespace-nowrap">Дата теста</th>
                    <th className="py-3.5 px-6 text-right whitespace-nowrap">Действия</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-zinc-100 dark:divide-zinc-800 p-4 md:p-0">
                  {filteredPsychStudents.length === 0 ? (
                    <tr className="block md:table-row py-12 text-center text-zinc-400">
                      <td colSpan={6} className="block md:table-cell py-8 text-center text-zinc-400">
                        Данных по выбранной методике не найдено.
                      </td>
                    </tr>
                  ) : (
                    filteredPsychStudents.map((student) => {
                      let riskBadge = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
                      let riskText = student.test_id === 'klimov' ? 'Не оценивается' : 'Норма';

                      if (student.risk_level === 'MEDIUM') {
                        riskBadge = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
                        riskText = 'Средний риск';
                      } else if (student.risk_level === 'HIGH') {
                        riskBadge = 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300';
                        riskText = 'Высокий риск';
                      } else if (student.risk_level === 'CRITICAL') {
                        riskBadge = 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
                        riskText = 'Критический';
                      }

                      return (
                        <tr
                          key={student.id}
                          className="block md:table-row bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 md:border-none rounded-2xl md:rounded-none mb-4 md:mb-0 p-4 md:p-0 shadow-sm md:shadow-none hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* 1. Ученик */}
                          <td className="block md:table-cell p-2.5 md:py-4 md:px-6 border-b border-zinc-100 dark:border-zinc-800/50 md:border-b-0">
                            <div className="flex justify-between items-center md:block">
                              <span className="md:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                Ученик
                              </span>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm md:text-xs">
                                {student.student_name}
                              </span>
                            </div>
                          </td>

                          {/* 2. Класс */}
                          <td className="block md:table-cell p-2.5 md:py-4 md:px-6 border-b border-zinc-100 dark:border-zinc-800/50 md:border-b-0">
                            <div className="flex justify-between items-center md:block">
                              <span className="md:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                Класс
                              </span>
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                {student.class_id}
                              </span>
                            </div>
                          </td>

                          {/* 3. Уровень риска */}
                          <td className="block md:table-cell p-2.5 md:py-4 md:px-6 border-b border-zinc-100 dark:border-zinc-800/50 md:border-b-0">
                            <div className="flex justify-between items-center md:block">
                              <span className="md:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                Уровень риска
                              </span>
                              <span
                                className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${riskBadge}`}
                              >
                                {riskText}
                              </span>
                            </div>
                          </td>

                          {/* 4. Основные шкалы */}
                          <td className="block md:table-cell p-2.5 md:py-4 md:px-6 border-b border-zinc-100 dark:border-zinc-800/50 md:border-b-0">
                            <div className="flex flex-col md:block gap-1">
                              <span className="md:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                                Основные шкалы
                              </span>
                              <div className="flex flex-col gap-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                                {student.scales.slice(0, 2).map((scale, i) => (
                                  <div key={i} className="flex justify-between md:justify-start gap-1">
                                    <span className="font-semibold">{scale.scale_name}:</span>
                                    <span>{scale.raw_score} ({scale.interpretation})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* 5. Дата теста */}
                          <td className="block md:table-cell p-2.5 md:py-4 md:px-6 border-b border-zinc-100 dark:border-zinc-800/50 md:border-b-0">
                            <div className="flex justify-between items-center md:block">
                              <span className="md:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                Дата теста
                              </span>
                              <span className="text-zinc-500">
                                {student.completed_at
                                  ? new Date(student.completed_at).toLocaleDateString('ru-RU')
                                  : '—'}
                              </span>
                            </div>
                          </td>

                          {/* 6. Действия */}
                          <td className="block md:table-cell p-2.5 md:py-4 md:px-6 text-right pt-3 md:pt-4">
                            <div className="flex justify-between items-center md:justify-end gap-2">
                              <span className="md:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                Действия
                              </span>
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => { setModalSearch(''); setModalScaleFilter('ALL'); setModalTab('answers'); setInspectPsychStudent(student); }}
                                  title="Детальный разбор ответов"
                                  className="p-2 sm:p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleExportStudentPsychPdf(student)}
                                  title="Индивидуальное заключение (PDF)"
                                  disabled={!student.is_completed || isExportingPsychPdf}
                                  className="p-2 sm:p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 disabled:opacity-30 transition-colors cursor-pointer"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
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
        </div>
      )}

      {/* ─── MODAL: DETAILED PSYCHOLOGICAL BREAKDOWN ─────────────────────────── */}
      {inspectPsychStudent && (() => {
        const studentAnswers = getDemoAnswers(inspectPsychStudent);

        const filteredAnswers = studentAnswers.filter((item) => {
          if (modalScaleFilter !== 'ALL' && item.scale !== modalScaleFilter) return false;
          if (modalSearch.trim()) {
            const q = modalSearch.toLowerCase().trim();
            return (
              item.questionText.toLowerCase().includes(q) ||
              String(item.questionId).includes(q) ||
              item.value.toLowerCase().includes(q)
            );
          }
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex justify-between items-start pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 font-['Plus_Jakarta_Sans',sans-serif]">
                      {inspectPsychStudent.student_name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                      Класс {inspectPsychStudent.class_id}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {inspectPsychStudent.test_name} • Пройдено: {inspectPsychStudent.completed_at ? new Date(inspectPsychStudent.completed_at).toLocaleDateString('ru-RU') : 'Сегодня'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setInspectPsychStudent(null);
                    setModalSearch('');
                    setModalScaleFilter('ALL');
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-500">Демонстрационные результаты выбранной методики. Данные вымышлены.</p>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2 shrink-0">
                <button
                  onClick={() => setModalTab('answers')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    modalTab === 'answers'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Ответы на {studentAnswers.length} вопросов</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${modalTab === 'answers' ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                    {studentAnswers.length}
                  </span>
                </button>
                <button
                  onClick={() => setModalTab('scales')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    modalTab === 'scales'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Шкалы и показатели</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
                {modalTab === 'scales' ? (
                  /* Scales Breakdown */
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase">Психологические шкалы методики:</h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {inspectPsychStudent.scales.map((s, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                          <div>
                            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{s.scale_name}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">{s.interpretation}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-purple-600">{s.raw_score} / {s.max_score}</div>
                            <div className="text-[10px] text-zinc-400">{s.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* 57 Eysenck Questions Breakdown */
                  <div className="space-y-3">
                    {/* Controls: Scale Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                        <button
                          onClick={() => setModalScaleFilter('ALL')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                            modalScaleFilter === 'ALL'
                              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          Все ({studentAnswers.length})
                        </button>
                      </div>

                      <div className="relative min-w-[160px]">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={modalSearch}
                          onChange={(e) => setModalSearch(e.target.value)}
                          placeholder="Поиск вопроса..."
                          className="w-full pl-8 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Scrollable Questions List */}
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {filteredAnswers.length === 0 ? (
                        <div className="text-center py-8 text-xs text-zinc-400">
                          Вопросов по данному фильтру не найдено
                        </div>
                      ) : (
                        filteredAnswers.map((item) => {
                          const isYes = item.value === 'Да';
                          return (
                            <div
                              key={item.questionId}
                              className="p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-purple-300 dark:hover:border-purple-800/60 transition-all flex items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md shrink-0 border border-purple-200/50 dark:border-purple-800/40">
                                  #{item.questionId}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-snug">
                                    {item.questionText}
                                  </p>
                                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    item.scale === 'extraversion'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                      : item.scale === 'neuroticism'
                                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  }`}>
                                    {item.scaleName || (item.scale === 'extraversion' ? 'Экстраверсия' : item.scale === 'neuroticism' ? 'Нейротизм' : 'Шкала лжи')}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                <span
                                  className={`inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-bold shadow-xs border ${
                                    isYes
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                                  }`}
                                >
                                  {item.value}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="text-[11px] text-zinc-400">
                  Всего ответов: <strong className="text-zinc-700 dark:text-zinc-300">{studentAnswers.length}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setInspectPsychStudent(null);
                      setModalSearch('');
                      setModalScaleFilter('ALL');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Закрыть
                  </button>
                  <button
                    onClick={() => handleExportStudentPsychPdf(inspectPsychStudent)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Индивидуальное заключение (PDF)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── HIDDEN PRINT COMPONENTS FOR PSYCHOLOGICAL PDF ───────────────────── */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none' }}>
        <div ref={psychClassReportRef}>
          <ClassSummaryReport
            classNameString={selectedPsychClass === 'ALL' ? 'Все параллели школы' : `Класс ${selectedPsychClass}`}
            testTitle={currentPsychTest.title}
            students={classSummaryRows}
            isDemo={isDemo}
            teacherDepartmentName="Служба психологической поддержки AISezim"
          />
        </div>


      </div>
    </div>
  );
}
