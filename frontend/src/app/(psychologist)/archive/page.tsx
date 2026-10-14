'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Filter, Download, FileText, X, Printer, User, Award, ShieldAlert, Sparkles, FolderOpen, SearchX, ChevronLeft } from 'lucide-react';
import { analyticsApi } from '@/lib/api';
import { RiskLevel, AssessmentDetailReport } from '@/types/test';
import { formatDate, formatTime, getRiskLabel } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';

interface ArchiveResultItem {
  id: string;
  student_id: string;
  test_id: string;
  test_name?: string;
  risk_level: RiskLevel;
  reward_points?: number;
  created_at: string;
  users?: {
    full_name?: string;
    class_id?: string;
    email?: string;
  };
}

export default function ArchivePage() {
  const { lang } = useLanguage();
  const [results, setResults] = useState<ArchiveResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentDetailReport | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const RISK_OPTIONS: { value: string; labelRu: string; labelKk: string }[] = [
    { value: '', labelRu: 'Все риски', labelKk: 'Барлық деңгейлер' },
    { value: 'CRITICAL', labelRu: 'Критический', labelKk: 'Қауіпті (Критикалық)' },
    { value: 'HIGH', labelRu: 'Высокий', labelKk: 'Жоғары қауіп' },
    { value: 'MEDIUM', labelRu: 'Средний', labelKk: 'Орташа' },
    { value: 'LOW', labelRu: 'Низкий', labelKk: 'Қалыпты (Төмен)' },
  ];

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    analyticsApi
      .getResults({
        class_id: classFilter || undefined,
        risk_level: riskFilter || undefined,
        limit: 150,
      })
      .then((r) => setResults(r.data?.items ?? []))
      .catch((err) => {
        console.warn('Could not fetch archive results:', err);
        setFetchError(true);
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [classFilter, riskFilter]);

  // ─── 1. Export CSV with UTF-8 BOM for Excel ──────────────────────────────────
  function exportToCSV() {
    if (results.length === 0) {
      alert(lang === 'kk' ? 'Экспорттау үшін деректер жоқ' : 'Нет данных для экспорта');
      return;
    }

    const headers = lang === 'kk'
      ? ['Аты-жөні', 'Сынып', 'Әдістеме', 'Өткен уақыты', 'Қауіп деңгейі', 'Берілген ұпай']
      : ['ФИО', 'Класс', 'Методика', 'Дата прохождения', 'Уровень риска', 'Начислено очков'];

    const rows = results.map((r) => [
      `"${(r.users?.full_name || r.student_id || '').replace(/"/g, '""')}"`,
      `"${(r.users?.class_id || '—').replace(/"/g, '""')}"`,
      `"${(r.test_name || r.test_id || '').replace(/"/g, '""')}"`,
      `"${formatDate(r.created_at)} ${formatTime(r.created_at)}"`,
      `"${getRiskLabel(r.risk_level as RiskLevel)}"`,
      `"${r.reward_points || 0}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const cleanClass = classFilter ? classFilter.trim().replace(/\s+/g, '_') : 'all';
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `psychology_report_${cleanClass}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ─── 2. Open Official Assessment Report ──────────────────────────────────────
  async function openReport(assessmentId: string, fallbackRow?: ArchiveResultItem) {
    setLoadingDetail(true);
    try {
      const res = await analyticsApi.getAssessmentDetail(assessmentId);
      setSelectedAssessment(res.data);
    } catch {
      if (fallbackRow) {
        setSelectedAssessment({
          id: fallbackRow.id,
          student_id: fallbackRow.student_id,
          student_name: fallbackRow.users?.full_name || fallbackRow.student_id,
          class_id: fallbackRow.users?.class_id || '—',
          test_id: fallbackRow.test_id,
          test_name: fallbackRow.test_name || fallbackRow.test_id,
          risk_level: fallbackRow.risk_level,
          reward_points: fallbackRow.reward_points || 0,
          created_at: fallbackRow.created_at,
          scales: [],
          message: 'Результат сохранен в базе данных.',
        });
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Printable styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
          .page-break-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="section-title">
            {lang === 'kk' ? 'Нәтижелер картотекасы' : 'Картотека результатов'}
          </h1>
          <p className="section-subtitle">
            {lang === 'kk'
              ? 'Оқушылардың тестілеу нәтижелері, ресми қорытындылар және реестр экспорты'
              : 'Все результаты тестирования учеников и экспорт официальных заключений'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center gap-2 !py-2.5 !px-4 text-sm font-medium"
            title="Экспорт отфильтрованного реестра в CSV для Excel"
          >
            <Download size={16} />
            <span>{lang === 'kk' ? 'Реестрді экспорттау (CSV)' : 'Экспорт реестра (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Filters (Screen only) */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center gap-4 flex-wrap no-print shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Filter size={18} />
          <span className="text-sm font-medium">{lang === 'kk' ? 'Сүзгілер:' : 'Фильтры:'}</span>
        </div>
        <input
          id="filter-class"
          className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-36"
          placeholder={lang === 'kk' ? 'Сынып (10А)' : 'Класс (10А)'}
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        />
        <select
          id="filter-risk"
          className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-52"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          {RISK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {lang === 'kk' ? o.labelKk : o.labelRu}
            </option>
          ))}
        </select>
        <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {lang === 'kk' ? 'Табылды:' : 'Найдено:'}{' '}
          <span className="text-gray-900 dark:text-white font-semibold">{results.length}</span>
        </div>
      </div>

      {/* Desktop Table View (hidden md:block) */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden no-print hidden md:block shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-neutral-800/60 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-neutral-800">
                <th className="text-left text-xs font-semibold px-6 py-4">
                  {lang === 'kk' ? 'Оқушы' : 'Ученик'}
                </th>
                <th className="text-left text-xs font-semibold px-4 py-4">
                  {lang === 'kk' ? 'Сынып' : 'Класс'}
                </th>
                <th className="text-left text-xs font-semibold px-4 py-4">
                  {lang === 'kk' ? 'Әдістеме' : 'Методика'}
                </th>
                <th className="text-left text-xs font-semibold px-4 py-4">
                  {lang === 'kk' ? 'Қауіп деңгейі' : 'Риск'}
                </th>
                <th className="text-left text-xs font-semibold px-4 py-4">
                  {lang === 'kk' ? 'Уақыты' : 'Дата'}
                </th>
                <th className="text-right text-xs font-semibold px-6 py-4">
                  {lang === 'kk' ? 'Әрекет' : 'Действие'}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-200 dark:border-neutral-800 animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : results.length === 0 ? (
                /* Styled Empty State for Table */
                <tr>
                  <td colSpan={6} className="text-center py-16 px-4">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-500">
                        {classFilter || riskFilter ? <SearchX size={28} /> : <FolderOpen size={28} />}
                      </div>
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">
                        {classFilter || riskFilter
                          ? (lang === 'kk' ? 'Сүзгіге сәйкес нәтиже табылмады' : 'По заданным фильтрам ничего не найдено')
                          : (lang === 'kk' ? 'Картотекада әзірге нәтижелер жоқ' : 'В картотеке пока нет записей')}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                        {classFilter || riskFilter
                          ? (lang === 'kk' ? 'Сүзгілерді тазартып немесе басқа параметрлерді енгізіп көріңіз.' : 'Попробуйте сбросить фильтры по классу или уровню риска.')
                          : (lang === 'kk' ? 'Оқушылар тестілеуден өткен соң олардың ресми нәтижелері осында жинақталады.' : 'Здесь будут накапливаться протоколы тестирования всех учеников школы.')}
                      </p>
                      {(classFilter || riskFilter) && (
                        <button
                          onClick={() => { setClassFilter(''); setRiskFilter(''); }}
                          className="btn-secondary !py-1.5 !px-3 text-xs"
                        >
                          {lang === 'kk' ? 'Сүзгілерді тазарту' : 'Сбросить фильтры'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-200 dark:border-neutral-800 hover:bg-gray-50/70 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100 text-sm font-medium">
                      <Link
                        href={`/archive/${r.student_id}`}
                        className="text-gray-900 dark:text-gray-100 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                        title="Открыть карту учащегося и радарный профиль"
                      >
                        <span>{r.users?.full_name || r.student_id}</span>
                        <ChevronLeft size={14} className="rotate-180 text-gray-400" />
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-gray-500 dark:text-gray-400 text-sm">
                      {r.users?.class_id || '—'}
                    </td>
                    <td className="px-4 py-4 text-gray-700 dark:text-gray-300 text-sm font-medium">
                      {r.test_name || r.test_id}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`badge-${r.risk_level?.toLowerCase()}`}>
                        {getRiskLabel(r.risk_level as RiskLevel, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500 dark:text-gray-400 text-sm" suppressHydrationWarning>
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openReport(r.id, r)}
                        className="inline-flex items-center gap-1.5 text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
                      >
                        <FileText size={14} />
                        <span>{lang === 'kk' ? 'Қорытынды (PDF)' : 'Заключение (PDF)'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View (block md:hidden) */}
      <div className="space-y-3 block md:hidden no-print">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 animate-pulse space-y-3 shadow-sm">
              <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-neutral-800 rounded w-3/4" />
              <div className="h-8 bg-gray-200 dark:bg-neutral-800 rounded w-full" />
            </div>
          ))
        ) : results.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl text-center py-12 px-4 space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-gray-500 mx-auto">
              {classFilter || riskFilter ? <SearchX size={24} /> : <FolderOpen size={24} />}
            </div>
            <p className="text-gray-900 dark:text-white font-semibold text-sm">
              {classFilter || riskFilter
                ? (lang === 'kk' ? 'Сүзгіге сәйкес нәтиже табылмады' : 'По заданным фильтрам ничего не найдено')
                : (lang === 'kk' ? 'Картотекада әзірге нәтижелер жоқ' : 'В картотеке пока нет записей')}
            </p>
            {(classFilter || riskFilter) && (
              <button
                onClick={() => { setClassFilter(''); setRiskFilter(''); }}
                className="btn-secondary !py-1.5 !px-3 text-xs mx-auto"
              >
                {lang === 'kk' ? 'Сүзгілерді тазарту' : 'Сбросить фильтры'}
              </button>
            )}
          </div>
        ) : (
          results.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3 shadow-sm"
            >
              {/* Header: Student Name + Class badge + Risk badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/archive/${r.student_id}`}
                    className="text-gray-900 dark:text-gray-100 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 text-sm flex items-center gap-1 truncate"
                  >
                    <span>{r.users?.full_name || r.student_id}</span>
                    <ChevronLeft size={13} className="rotate-180 flex-shrink-0 text-gray-400" />
                  </Link>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {r.users?.class_id ? `${r.users.class_id} ${lang === 'kk' ? 'сынып' : 'класс'}` : '—'}
                  </div>
                </div>

                <span className={`badge-${r.risk_level?.toLowerCase()} flex-shrink-0 text-[10px]`}>
                  {getRiskLabel(r.risk_level as RiskLevel)}
                </span>
              </div>

              {/* Body: Test Name and Date */}
              <div className="pt-2 border-t border-gray-100 dark:border-neutral-800/80">
                <div className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                  {r.test_name || r.test_id}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5" suppressHydrationWarning>
                  {formatDate(r.created_at)}
                </div>
              </div>

              {/* Action Button: Full width PDF conclusion */}
              <button
                onClick={() => openReport(r.id, r)}
                className="w-full py-2 px-3 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <FileText size={14} />
                <span>{lang === 'kk' ? 'Қорытындыны жүктеу (PDF)' : 'Скачать заключение (PDF)'}</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* ─── Official Assessment Modal (Printable) ──────────────────────────── */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
          <div
            id="printable-report"
            className="bg-zinc-900 border border-white/10 rounded-3xl max-w-2xl w-full p-8 text-white space-y-6 shadow-2xl relative my-8"
          >
            {/* Header actions (Screen only) */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 no-print">
              <div className="flex items-center gap-2 text-brand-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles size={16} />
                <span>Официальный бланк заключения</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="btn-primary flex items-center gap-2 !py-2 !px-4 text-xs font-bold"
                >
                  <Printer size={14} />
                  <span>Скачать заключение (PDF)</span>
                </button>
                <button
                  onClick={() => setSelectedAssessment(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Official Report Header */}
            <div className="text-center space-y-1 page-break-avoid border-b pb-4">
              <div className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
                Психологическая служба школы
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                ОФИЦИАЛЬНОЕ ПСИХОЛОГИЧЕСКОЕ ЗАКЛЮЧЕНИЕ
              </h2>
              <p className="text-xs text-gray-500">
                по результатам стандартизированного психодиагностического обследования
              </p>
            </div>

            {/* Student Metadata Card */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs page-break-avoid">
              <div>
                <span className="text-gray-400 block mb-0.5">ФИО учащегося:</span>
                <span className="font-semibold text-white text-sm">
                  {selectedAssessment.student_name}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Класс / Группа:</span>
                <span className="font-semibold text-white text-sm">
                  {selectedAssessment.class_id || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Используемая методика:</span>
                <span className="font-semibold text-white">{selectedAssessment.test_name}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Дата и время тестирования:</span>
                <span className="font-semibold text-white">
                  {formatDate(selectedAssessment.created_at)} {formatTime(selectedAssessment.created_at)}
                </span>
              </div>
            </div>

            {/* Diagnostic Scales Table */}
            {selectedAssessment.scales && selectedAssessment.scales.length > 0 && (
              <div className="space-y-3 page-break-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Показатели по диагностическим шкалам
                </h3>
                <div className="border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-gray-400">
                        <th className="text-left p-3 font-semibold">Шкала методики</th>
                        <th className="text-center p-3 font-semibold w-24">Балл</th>
                        <th className="text-center p-3 font-semibold w-24">Выраженность</th>
                        <th className="text-left p-3 font-semibold">Интерпретация</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAssessment.scales.map((scale, i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0">
                          <td className="p-3 font-medium text-white">{scale.scale_name}</td>
                          <td className="p-3 text-center text-gray-300 font-mono">
                            {scale.raw_score} / {scale.max_score}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-300">
                              {scale.percentage}%
                            </span>
                          </td>
                          <td className="p-3 text-gray-400 leading-relaxed">
                            {scale.interpretation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Overall Risk & Psychological Summary */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 page-break-avoid">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Итоговый диагностический уровень
                </span>
                <span className={`badge-${selectedAssessment.risk_level?.toLowerCase()}`}>
                  {getRiskLabel(selectedAssessment.risk_level as RiskLevel)}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{selectedAssessment.message}</p>
            </div>

            {/* Recommendations Block */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 page-break-avoid">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Методические рекомендации педагога-психолога
              </span>
              <p className="text-xs text-gray-400 leading-relaxed">
                {selectedAssessment.risk_level === 'CRITICAL' || selectedAssessment.risk_level === 'HIGH'
                  ? 'Рекомендуется проведение индивидуальной консультативной беседы, психоэмоциональная разгрузка и мониторинг адаптации в классном коллективе.'
                  : 'Показатели находятся в пределах возрастной нормы. Рекомендуется поддержание благоприятного психологического климата и учебной мотивации.'}
              </p>
            </div>

            {/* Signature Area */}
            <div className="pt-8 border-t border-white/10 flex justify-between items-end text-xs text-gray-400 page-break-avoid">
              <div>
                Педагог-психолог: ____________________ / ____________________
              </div>
              <div>
                М.П. (Дата: {new Date().toLocaleDateString('ru-RU')})
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
