'use client';

import { useEffect, useState } from 'react';
import { Save, Sun, Heart, Sparkles, Activity, Flame, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { moodApi } from '@/lib/api';
import StressChart from '@/components/stress-chart';
import { useLanguage } from '@/context/language-context';

interface MoodStatsData {
  daily_trend: { date: string; avg_stress: number; entries_count: number }[];
  easiest_day: string;
  easiest_day_avg: number;
  overall_avg: number;
  total_entries: number;
  weekday_stats: { weekday: string; weekday_num: number; avg_stress: number; entries_count: number }[];
  emotion_counts: { emotion: string; entries_count: number }[];
}

const EMOTIONS = [
  { id: 'joy', emoji: '😊', ru: 'Радость', kk: 'Қуаныш' },
  { id: 'calm', emoji: '😌', ru: 'Спокойствие', kk: 'Сабырлылық' },
  { id: 'sadness', emoji: '😔', ru: 'Грусть', kk: 'Мұң' },
  { id: 'anger', emoji: '😠', ru: 'Злость', kk: 'Ашу' },
  { id: 'anxiety', emoji: '😟', ru: 'Тревога', kk: 'Алаңдау' },
  { id: 'tired', emoji: '😴', ru: 'Усталость', kk: 'Шаршау' },
];

export default function MoodPage() {
  const { t, lang } = useLanguage();
  const [stress, setStress] = useState(5);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MoodStatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = () => {
    moodApi.getStats()
      .then(r => setStats(r.data ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const stressValue = Math.min(Math.max(Number(stress) || 1, 1), 10);
      const noteValue = note.trim() ? note.trim() : undefined;

      await moodApi.saveEntry(stressValue, noteValue, emotion || undefined);
      setSaved(true);
      setNote('');
      setEmotion(null);
      fetchStats();
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error('Mood save error:', e);
      const detailMsg = e?.response?.data?.detail;
      const displayMsg =
        typeof detailMsg === 'string'
          ? detailMsg
          : Array.isArray(detailMsg)
          ? detailMsg[0]?.msg || 'Ошибка валидации данных'
          : e?.response?.data?.message || 'Не удалось сохранить запись. Попробуйте еще раз.';
      setError(displayMsg);
    } finally {
      setSaving(false);
    }
  }

  const getStressCategory = (val: number) => {
    if (val <= 3) return { label: t.mood.categories.calm.label, desc: t.mood.categories.calm.desc, dotColor: 'bg-[#82C3A6]' };
    if (val <= 6) return { label: t.mood.categories.medium.label, desc: t.mood.categories.medium.desc, dotColor: 'bg-[#D4A373]' };
    return { label: t.mood.categories.high.label, desc: t.mood.categories.high.desc, dotColor: 'bg-[#E63946]' };
  };

  const category = getStressCategory(stress);
  const formatWeekday = (weekdayNum: number) => new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2024, 0, 1 + weekdayNum)));

  const renderStressIcon = (val: number) => {
    return (
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 mx-auto mb-4">
        {val <= 3 ? (
          <Sparkles className="w-8 h-8 text-zinc-900 dark:text-[#E1E0CC]" strokeWidth={1.5} />
        ) : val <= 6 ? (
          <Activity className="w-8 h-8 text-zinc-900 dark:text-[#E1E0CC]" strokeWidth={1.5} />
        ) : (
          <Flame className="w-8 h-8 text-zinc-900 dark:text-[#E1E0CC]" strokeWidth={1.5} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 min-h-screen transition-colors duration-300">
      {/* Title */}
      <div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-2">{t.mood.title}</h1>
        <p className="text-zinc-500 dark:text-[#E1E0CC]/60 text-sm md:text-base">{t.mood.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Entry Card */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-[2.5rem] bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 p-8 shadow-sm dark:shadow-2xl relative overflow-hidden transition-colors duration-300">
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-900/5 dark:bg-[#E1E0CC]/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-8 border-b border-black/10 dark:border-white/5 pb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#E1E0CC]/50">{t.mood.recordTitle}</span>
              <Heart className="text-zinc-400 dark:text-[#E1E0CC]/60 w-5 h-5 fill-current" />
            </div>

            {/* Icon and value */}
            <div className="text-center mb-8">
              {renderStressIcon(stress)}
              <div className="text-5xl font-semibold text-zinc-900 dark:text-[#E1E0CC] tracking-tight">{stress}</div>
              <div className="text-zinc-500 dark:text-white/40 text-xs mt-1.5 uppercase tracking-widest font-semibold">{t.mood.stressLevel}</div>
            </div>

            {/* Range bubbles */}
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-8">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setStress(n)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                    stress === n
                      ? 'bg-zinc-900 dark:bg-[#E1E0CC] text-white dark:text-black scale-105 shadow-md'
                      : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-[#E1E0CC]/50 border border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20 hover:text-zinc-900 dark:hover:text-[#E1E0CC]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Category label indicator */}
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 mb-8 text-center transition-all duration-300">
              <div className="flex items-center justify-center gap-2 text-zinc-900 dark:text-[#E1E0CC] font-semibold text-base mb-1 tracking-tight">
                <span className={`w-2 h-2 rounded-full ${category.dotColor}`} />
                {category.label}
              </div>
              <div className="text-zinc-500 dark:text-white/40 text-xs">
                {category.desc}
              </div>
            </div>

            {/* Note text area */}
            <div className="mb-8">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#E1E0CC]/50">{lang === 'kk' ? 'Қазір қай сезім жақын?' : 'Какое чувство ближе сейчас?'} <span className="normal-case font-normal">({lang === 'kk' ? 'міндетті емес' : 'необязательно'})</span></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {EMOTIONS.map((item) => <button type="button" key={item.id} aria-pressed={emotion === item.id} onClick={() => setEmotion(emotion === item.id ? null : item.id)} className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${emotion === item.id ? 'border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-[#E1E0CC] dark:bg-white/10 dark:text-white' : 'border-black/10 text-zinc-600 hover:bg-black/5 dark:border-white/10 dark:text-[#E1E0CC]/70 dark:hover:bg-white/5'}`}><span className="mr-2" aria-hidden="true">{item.emoji}</span>{lang === 'kk' ? item.kk : item.ru}</button>)}
              </div>
            </div>

            {/* Note text area */}
            <div className="mb-8">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#E1E0CC]/50 mb-3">{t.mood.thoughtsLabel}</label>
              <textarea
                id="mood-note"
                className="w-full bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white rounded-2xl px-5 py-4 placeholder-zinc-400 dark:placeholder-white/20 outline-none transition-all duration-300 focus:border-zinc-500 dark:focus:border-[#E1E0CC]/40 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-[#E1E0CC]/20 resize-none text-sm"
                rows={3}
                placeholder={t.mood.placeholder}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-600 dark:text-red-400 text-sm transition-all duration-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-red-500/10 transition-all ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Save Button */}
            <button
              id="btn-save-mood"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-[#E1E0CC] dark:hover:bg-[#cfcda9] text-white dark:text-black font-semibold py-4 transition-all duration-300 flex items-center justify-center gap-2 group hover:scale-[1.01] shadow-sm"
            >
              {saved ? (
                <span className="flex items-center justify-center gap-2 text-emerald-500 dark:text-emerald-400 font-bold animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                  <span>{t.mood.saved}</span>
                </span>
              ) : saving ? (
                <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  <span>{t.mood.save}</span>
                </>
              )}
            </button>
          </div>
        </div>


        {/* Right column: Stats & charts */}
        <div className="lg:col-span-5 space-y-6">
          {!loadingStats && stats && (
            <>
              {/* Easiest day premium card */}
              {stats.easiest_day && stats.easiest_day !== 'Нет данных' && (
                <div className="rounded-[2rem] bg-white dark:bg-zinc-900/20 border border-black/10 dark:border-white/10 p-6 relative overflow-hidden flex items-center gap-5 shadow-sm dark:shadow-none">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 dark:bg-[#E1E0CC]/5 blur-3xl rounded-full" />
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-[#E1E0CC] flex items-center justify-center flex-shrink-0">
                    <Sun size={22} className="text-white dark:text-black" />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-white/40">
                      {lang === 'kk' ? 'Стрессі ең төмен апта күні' : 'День недели с самым низким стрессом'}
                    </span>
                    <h4 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight mt-0.5">
                      {formatWeekday(stats.weekday_stats.find((day) => day.weekday === stats.easiest_day)?.weekday_num ?? 0)}
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-[#E1E0CC]/70 mt-1">
                      {t.mood.averageStress}: {(stats.easiest_day_avg ?? 0).toFixed(1)} / 10 · {stats.weekday_stats.find((day) => day.weekday === stats.easiest_day)?.entries_count ?? 0} {lang === 'kk' ? 'белгі' : 'отметок'}
                    </p>
                  </div>
                </div>
              )}

              {/* Stress Chart */}
              {(stats.daily_trend ?? []).length > 0 && (
                <StressChart
                  data={stats.daily_trend}
                  title={t.mood.stressHistory}
                  color="#6366F1"
                  locale={lang === 'kk' ? 'kk-KZ' : 'ru-RU'}
                />
              )}

              {(stats.emotion_counts ?? []).length > 0 && (
                <div className="rounded-[2rem] border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-[#121214]">
                  <h3 className="mb-1 text-base font-semibold text-zinc-900 dark:text-white">{lang === 'kk' ? 'Сезімдер картасы' : 'Карта чувств'}</h3>
                  <p className="mb-4 text-xs text-zinc-500 dark:text-white/50">{lang === 'kk' ? 'Соңғы 30 күндегі өз белгілеулеріңіз' : 'Ваши отметки за последние 30 дней'}</p>
                  <div className="space-y-3">{stats.emotion_counts.map((entry) => { const option = EMOTIONS.find((item) => item.id === entry.emotion); const maxCount = Math.max(...stats.emotion_counts.map((item) => item.entries_count)); return <div key={entry.emotion} className="flex items-center gap-3 text-sm"><span className="w-7">{option?.emoji || '•'}</span><span className="w-28 text-zinc-700 dark:text-zinc-300">{lang === 'kk' ? option?.kk : option?.ru}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10"><div className="h-full rounded-full bg-zinc-700 dark:bg-[#E1E0CC]" style={{ width: `${(entry.entries_count / maxCount) * 100}%` }} /></div><span className="w-8 text-right tabular-nums text-zinc-500">{entry.entries_count}</span></div>; })}</div>
                </div>
              )}

              {/* Weekday table summary */}
              {(stats.weekday_stats ?? []).length > 0 && (
                <div className="rounded-[2.5rem] bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 p-6 shadow-sm dark:shadow-none">
                  <h3 className="text-zinc-900 dark:text-white font-semibold tracking-tight text-base mb-6">{t.mood.daysTitle}</h3>
                  <div className="space-y-4">
                    {stats.weekday_stats.map(day => (
                      <div key={day.weekday_num} className="flex items-center gap-4">
                        <div className="w-24 text-zinc-500 dark:text-white/50 text-xs font-semibold tracking-tight">{formatWeekday(day.weekday_num)}</div>
                        <div className="flex-1 bg-black/5 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-zinc-900 dark:bg-[#E1E0CC] h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(day.avg_stress ?? 0) * 10}%` }}
                          />
                        </div>
                        <div className="text-zinc-900 dark:text-white text-xs font-bold w-8 text-right">
                          {(day.avg_stress ?? 0).toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
