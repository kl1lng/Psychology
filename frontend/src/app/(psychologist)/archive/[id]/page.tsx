'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  ShieldAlert,
  Flame,
  Award,
  Calendar,
  Clock,
  Heart,
  FileText,
  Lock,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Activity,
  History,
  ShieldCheck,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { formatDate, formatTime, getRiskLabel, getRiskBg, getRiskColor } from '@/lib/utils';
import { RiskLevel } from '@/types/test';
import { useLanguage } from '@/context/language-context';

interface AssessmentRecord {
  id: string;
  student_id: string;
  test_id: string;
  test_name: string;
  risk_level: RiskLevel;
  reward_points: number;
  raw_score?: number;
  answers_json?: Record<string, string | number>;
  created_at: string;
}

interface MoodRecord {
  id: string;
  student_id: string;
  stress_level: number;
  note?: string;
  created_at: string;
}

interface StudentProfileData {
  student: {
    id: string;
    full_name: string;
    email: string;
    class_id: string;
    points_balance: number;
  };
  assessments: AssessmentRecord[];
  mood_entries: MoodRecord[];
  risk_summary: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

interface NoteItem {
  id: string;
  student_id: string;
  psychologist_id: string;
  note: string;
  created_at: string;
}

export default function StudentCardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLanguage();

  const [data, setData] = useState<StudentProfileData | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [resProfile, resNotes] = await Promise.all([
        analyticsApi.getStudentResults(id),
        analyticsApi.getStudentNotes(id).catch(() => ({ data: [] })),
      ]);
      setData(resProfile.data);
      setNotes(resNotes.data || []);
    } catch (err) {
      console.error('Failed to load student card:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim() || savingNote) return;

    setSavingNote(true);
    try {
      const res = await analyticsApi.addStudentNote(id, newNote.trim());
      setNotes((prev) => [res.data, ...prev]);
      setNewNote('');
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center !py-16 space-y-4 max-w-lg mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
        <AlertTriangle size={40} className="text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {lang === 'kk' ? 'Оқушы картасы табылмады' : 'Карта ученика не найдена'}
        </h2>
        <Link
          href="/archive"
          className="btn-secondary inline-flex items-center gap-2 !px-5 !py-2.5 text-xs font-semibold"
        >
          <ArrowLeft size={16} />
          <span>{lang === 'kk' ? 'Картотекаға оралу' : 'Назад в картотеку'}</span>
        </Link>
      </div>
    );
  }

  const { student, assessments = [], mood_entries = [], risk_summary } = data;

  // ─── 1. Build Radar Data from Assessment Psychological Profile ────────────
  const motivationTests = assessments.filter((a) => a.test_id === 'luskanova_motivation');
  const anxietyTests = assessments.filter((a) => a.test_id === 'phillips_school');
  const personalityTests = assessments.filter((a) => a.test_id === 'eysenck_epi_a');
  const vocationalTests = assessments.filter((a) => a.test_id === 'klimov_ddo');

  const avgMotivation = motivationTests.length > 0
    ? Math.round(motivationTests.reduce((acc, t) => acc + (t.raw_score || (t.risk_level === 'LOW' ? 26 : t.risk_level === 'MEDIUM' ? 18 : 8)), 0) / motivationTests.length / 30 * 100)
    : 75;

  const avgResilience = mood_entries.length > 0
    ? Math.round(100 - (mood_entries.reduce((acc, m) => acc + m.stress_level, 0) / mood_entries.length * 10))
    : 70;

  const avgCalmness = anxietyTests.length > 0
    ? (anxietyTests[0].risk_level === 'CRITICAL' ? 25 : anxietyTests[0].risk_level === 'HIGH' ? 45 : anxietyTests[0].risk_level === 'MEDIUM' ? 70 : 90)
    : 80;

  const avgSociability = personalityTests.length > 0
    ? (personalityTests[0].risk_level === 'LOW' ? 85 : 65)
    : 75;

  const avgVocational = vocationalTests.length > 0 ? 90 : 60;

  const radarData = [
    {
      subject: lang === 'kk' ? 'Оқу мотивациясы' : 'Учебная мотивация',
      A: avgMotivation,
      fullMark: 100,
    },
    {
      subject: lang === 'kk' ? 'Стресске төзімділік' : 'Стрессоустойчивость',
      A: avgResilience,
      fullMark: 100,
    },
    {
      subject: lang === 'kk' ? 'Эмоционалды тыныштық' : 'Эмоциональный покой',
      A: avgCalmness,
      fullMark: 100,
    },
    {
      subject: lang === 'kk' ? 'Әлеуметтену' : 'Социализация',
      A: avgSociability,
      fullMark: 100,
    },
    {
      subject: lang === 'kk' ? 'Кәсіби айқындық' : 'Проф. ориентация',
      A: avgVocational,
      fullMark: 100,
    },
  ];

  // Average stress
  const avgStress = mood_entries.length > 0
    ? (mood_entries.reduce((acc, m) => acc + m.stress_level, 0) / mood_entries.length).toFixed(1)
    : '3.2';

  const hasCritical = (risk_summary.CRITICAL || 0) > 0;
  const hasHigh = (risk_summary.HIGH || 0) > 0;

  // Timeline events (tests + mood entries merged & sorted by date desc)
  const timelineEvents = [
    ...assessments.map((a) => ({
      type: 'assessment',
      id: a.id,
      title: a.test_name || a.test_id,
      risk: a.risk_level,
      points: a.reward_points,
      date: a.created_at,
      details: a,
    })),
    ...mood_entries.map((m, idx) => ({
      type: 'mood',
      id: `mood_${idx}`,
      title: `${lang === 'kk' ? 'Көңіл-күй белгісі' : 'Отметка настроения'}: ${m.stress_level}/10 ${lang === 'kk' ? 'стресс' : 'стресса'}`,
      stress: m.stress_level,
      note: m.note,
      date: m.created_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        <Link
          href="/archive"
          className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>{lang === 'kk' ? 'Картотекаға оралу' : 'Back to Registry'}</span>
        </Link>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-bold">
          {lang === 'kk' ? 'Оқушының кешенді картасы' : 'Student Comprehensive Profile'}
        </span>
      </nav>

      {/* ─── GOOGLE STITCH BENTO GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── 1. PROFILE CARD (4 cols) ──────────────────────────────────────── */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="w-24 h-24 rounded-full bg-brand-500/10 border-4 border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-extrabold text-3xl shadow-sm mb-4">
            {student.full_name?.[0]?.toUpperCase() || 'У'}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {student.full_name}
          </h1>

          <div className="flex items-center gap-1.5 mt-1 text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <User size={14} />
            <span>
              {student.class_id
                ? `${lang === 'kk' ? 'Сынып' : 'Grade'} ${student.class_id}`
                : (lang === 'kk' ? 'Сынып белгіленбеген' : 'Grade not set')}
            </span>
          </div>

          {student.email && (
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate max-w-full">
              {student.email}
            </div>
          )}

          {/* Stress Rating Pill */}
          <div
            className={`mt-4 rounded-full px-4 py-1.5 flex items-center gap-2 border shadow-sm ${
              hasCritical
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : hasHigh
                ? 'bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400'
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                hasCritical ? 'bg-rose-500 animate-pulse' : hasHigh ? 'bg-orange-500' : 'bg-indigo-500'
              }`}
            />
            <span className="text-xs font-bold">
              {lang === 'kk' ? `Стресс көрсеткіші: ${avgStress}` : `Stress Rating: ${avgStress}`}
            </span>
          </div>

          {/* Stats Bar at bottom of card */}
          <div className="grid grid-cols-3 gap-2 w-full mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
            <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
              <div className="text-[10px] text-zinc-400 font-medium">
                {lang === 'kk' ? 'Тесттер' : 'Tests'}
              </div>
              <div className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {assessments.length}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
              <div className="text-[10px] text-zinc-400 font-medium">
                {lang === 'kk' ? 'Көңіл-күй' : 'Moods'}
              </div>
              <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {mood_entries.length}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
              <div className="text-[10px] text-zinc-400 font-medium">
                {lang === 'kk' ? 'Ұпайлар' : 'Points'}
              </div>
              <div className="text-base font-extrabold text-brand-600 dark:text-brand-400 mt-0.5">
                {student.points_balance || 0}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. 360° PERSONA RADAR CHART (8 cols) ──────────────────────────── */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Activity size={18} className="text-brand-500" />
                <span>360° Persona</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {lang === 'kk'
                  ? 'Диагностикалық тестілеулер бойынша жинақталған психологиялық бейне'
                  : 'Multidimensional personality & mental wellness radar'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-xl border border-brand-500/20">
                {assessments.length} {lang === 'kk' ? 'әдістеме' : 'методик'}
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 15, right: 35, bottom: 15, left: 35 }}>
                <PolarGrid stroke="rgba(150,150,150,0.2)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                />
                <Radar
                  name={student.full_name}
                  dataKey="A"
                  stroke="#4f46e5"
                  fill="#6366f1"
                  fillOpacity={0.35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#ffffff',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk Summary Pills inside 360° block */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{lang === 'kk' ? 'Қалыпты' : 'Low'}:</span>
              <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{risk_summary.LOW}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <span className="text-amber-700 dark:text-amber-400 font-semibold">{lang === 'kk' ? 'Орташа' : 'Medium'}:</span>
              <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{risk_summary.MEDIUM}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
              <span className="text-orange-700 dark:text-orange-400 font-semibold">{lang === 'kk' ? 'Жоғары' : 'High'}:</span>
              <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{risk_summary.HIGH}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <span className="text-rose-700 dark:text-rose-400 font-semibold">{lang === 'kk' ? 'Қауіпті' : 'Critical'}:</span>
              <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{risk_summary.CRITICAL}</span>
            </div>
          </div>
        </div>

        {/* ─── 3. LONGITUDINAL TIMELINE (7 cols) ─────────────────────────────── */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CalendarDays size={18} className="text-brand-500" />
              <span>{lang === 'kk' ? 'Хронологиялық бақылау тарихы' : 'Longitudinal Timeline'}</span>
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {timelineEvents.length} {lang === 'kk' ? 'жазба' : 'events'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 relative space-y-3">
            {timelineEvents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 text-xs">
                <FileSpreadsheet size={28} className="mb-1 text-zinc-300 dark:text-zinc-600" />
                <span>{lang === 'kk' ? 'Әзірге оқиғалар жазылмаған' : 'No recorded events yet'}</span>
              </div>
            ) : (
              timelineEvents.map((evt, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 hover:border-brand-500/30 transition-all shadow-sm"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      evt.type === 'assessment'
                        ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {evt.type === 'assessment' ? <FileText size={15} /> : <Heart size={15} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {evt.title}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium flex-shrink-0">
                        {formatDate(evt.date)}
                      </span>
                    </div>

                    {evt.type === 'assessment' && 'risk' in evt && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            (evt as any).risk === 'CRITICAL'
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                              : (evt as any).risk === 'HIGH'
                              ? 'bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400'
                              : (evt as any).risk === 'MEDIUM'
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {getRiskLabel((evt as any).risk as RiskLevel)}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          +{(evt as any).points} {lang === 'kk' ? 'ұпай' : 'баллов'}
                        </span>
                      </div>
                    )}

                    {evt.type === 'mood' && 'note' in evt && (evt as any).note && (
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 italic bg-white dark:bg-zinc-800 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        «{(evt as any).note}»
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── 4. PRIVATE NOTES PANEL (5 cols) ───────────────────────────────── */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Lock size={16} className="text-rose-500" />
              <span>{lang === 'kk' ? 'Құпия жазбалар' : 'Private Notes'}</span>
            </h2>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>{lang === 'kk' ? 'Шифрланған' : 'Encrypted'}</span>
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {/* Input Form */}
            <form onSubmit={handleAddNote} className="relative flex flex-col flex-shrink-0">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={
                  lang === 'kk'
                    ? 'Оқушы туралы кәсіби бақылауларыңыз бен ұсыныстарыңызды жазыңыз...'
                    : 'Enter strictly confidential observations here. Content is encrypted...'
                }
                rows={2}
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700/80 p-3 pr-10 text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/60 resize-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={savingNote || !newNote.trim()}
                className="absolute right-2.5 bottom-2.5 p-1.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-all shadow-sm"
                title={lang === 'kk' ? 'Сақтау' : 'Сохранить'}
              >
                <Send size={13} />
              </button>
            </form>

            {/* Notes List Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {notes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 text-xs">
                  <span>{lang === 'kk' ? 'Бұл оқушы бойынша жазбалар әзірге жоқ' : 'No private notes yet'}</span>
                </div>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-1 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                        <Lock size={10} className="text-rose-500" />
                        <span>{lang === 'kk' ? 'Психолог жазбасы' : 'Psychologist Note'}</span>
                      </span>
                      <span>{formatDate(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {n.note}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

