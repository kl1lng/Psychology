'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ChevronRight, ClipboardList, Compass, Sparkles, BookOpen, HeartPulse, Brain } from 'lucide-react';
import { assessmentsApi } from '@/lib/api';
import { TestInfo } from '@/types/test';
import { useLanguage } from '@/context/language-context';

export default function TestsPage() {
  const { lang, t } = useLanguage();
  const [tests, setTests] = useState<TestInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    assessmentsApi.list()
      .then(r => setTests(r.data ?? []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [lang]);

  function getTestMeta(testId: string) {
    switch (testId) {
      case 'klimov_ddo':
        return {
          icon: Compass,
          badge: lang === 'kk' ? 'Кәсіби бағдар' : 'Профориентация',
          badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          points: '+80',
        };
      case 'luskanova_motivation':
        return {
          icon: BookOpen,
          badge: lang === 'kk' ? 'Оқу мотивациясы' : 'Школьная мотивация',
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          points: '+60',
        };
      case 'phillips_school':
        return {
          icon: HeartPulse,
          badge: lang === 'kk' ? 'Мектеп мазасыздығы' : 'Школьная тревожность',
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          points: '+70',
        };
      case 'eysenck_epi_a':
      default:
        return {
          icon: Brain,
          badge: lang === 'kk' ? 'Тұлғалық қасиеттер' : 'Личность и темперамент',
          badgeColor: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
          points: '+70',
        };
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title">
          {lang === 'kk' ? 'Психологиялық тесттер' : 'Психологические тесты'}
        </h1>
        <p className="section-subtitle">
          {lang === 'kk'
            ? 'Өзіңді тереңірек танып, оқу мотивациясы мен кәсіби бейімділігіңді анықта. Нәтижелер анонимді.'
            : 'Пройди тест и узнай о себе больше: уровень мотивации, профессиональные склонности и особенности характера.'}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card animate-pulse h-48" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 space-y-3 shadow-sm">
          <ClipboardList size={36} className="text-zinc-400 mx-auto" />
          <h3 className="text-zinc-900 dark:text-white font-bold text-sm">
            {t.errors?.fetchFailed || (lang === 'kk' ? 'Деректерді жүктеу мүмкін болмады' : 'Не удалось загрузить данные')}
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mx-auto">
            {t.errors?.fetchFailedDesc || (lang === 'kk' ? 'Серверге қосылуды тексеріп, кейінірек қайталап көріңіз.' : 'Проверьте подключение к серверу и попробуйте позже.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map(test => {
            const meta = getTestMeta(test.id);
            const Icon = meta.icon;
            return (
              <Link
                key={test.id}
                href={`/tests/${test.id}`}
                className="group flex flex-col p-6 rounded-[1.5rem] bg-white dark:bg-[#121214] border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-[#E1E0CC]/40 hover:scale-[1.005] transition-all duration-300 shadow-sm dark:shadow-card justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-900 dark:bg-[#E1E0CC] rounded-full flex items-center justify-center">
                        <Icon size={18} className="text-white dark:text-black" />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.badgeColor}`}>
                        {meta.badge}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-zinc-400 dark:text-white/30 group-hover:text-zinc-900 dark:group-hover:text-[#E1E0CC] transition-colors" />
                  </div>
                  <h3 className="text-zinc-900 dark:text-white font-semibold text-lg tracking-tight mb-2">
                    {test.title}
                  </h3>
                  <p className="text-zinc-500 dark:text-white/50 text-sm mb-6 leading-relaxed">
                    {test.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-white/40 border-t border-black/5 dark:border-white/5 pt-4">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />
                    {test.estimated_minutes} {lang === 'kk' ? 'мин' : 'мин'}
                  </span>
                  <span>
                    {test.question_count} {lang === 'kk' ? 'сұрақ' : 'вопросов'}
                  </span>
                  <span className="ml-auto text-zinc-900 dark:text-[#E1E0CC] font-semibold flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-400" />
                    <span>{meta.points} {lang === 'kk' ? 'ұпай' : 'баллов'}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
