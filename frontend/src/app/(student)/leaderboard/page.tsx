'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Star, User as UserIcon } from 'lucide-react';
import { leaderboardApi } from '@/lib/api';
import { useLanguage } from '@/context/language-context';

interface LeaderEntry {
  rank: number;
  student_id: string;
  full_name: string;
  class_id: string;
  points_balance: number;
  medal: string | null;
}

export default function LeaderboardPage() {
  const { lang, t } = useLanguage();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUserId(u.id || null);
      } catch {}
    }

    leaderboardApi
      .get()
      .then((r) => setEntries(r.data?.leaderboard ?? []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  const localizedText = {
    title: t.leaderboard?.title || (lang === 'kk' ? 'Көшбасшылар кестесі' : 'Таблица лидеров'),
    subtitle:
      t.leaderboard?.subtitle ||
      (lang === 'kk'
        ? 'Платформадағы оқушылардың белсенділігі мен нәтижелері'
        : 'Рейтинг активности и психологического прогресса учеников'),
    rankCol: t.leaderboard?.rank || '#',
    studentCol: t.leaderboard?.student || (lang === 'kk' ? 'Оқушы' : 'Ученик'),
    classCol: t.leaderboard?.classCol || (lang === 'kk' ? 'Сынып' : 'Класс'),
    pointsCol: t.leaderboard?.points || (lang === 'kk' ? 'Балдар' : 'Баллы'),
    firstPlace: t.leaderboard?.firstPlace || (lang === 'kk' ? '1-орын • Алтын' : '1 место • Золото'),
    secondPlace: t.leaderboard?.secondPlace || (lang === 'kk' ? '2-орын • Күміс' : '2 место • Серебро'),
    thirdPlace: t.leaderboard?.thirdPlace || (lang === 'kk' ? '3-орын • Қола' : '3 место • Бронза'),
    youBadge: t.leaderboard?.youBadge || (lang === 'kk' ? '(сіз)' : '(вы)'),
    empty: t.leaderboard?.empty || (lang === 'kk' ? 'Әзірге деректер жоқ' : 'Пока нет данных для отображения'),
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* ─── Page Header ─── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {localizedText.title}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {localizedText.subtitle}
        </p>
      </div>

      {/* ─── Top 3 Podium Cards ─── */}
      {!loading && !fetchError && entries.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
          {/* 2nd Place (Silver) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 order-2 md:order-1">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
              <Medal className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              {localizedText.secondPlace}
            </div>
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                {entries[1]?.full_name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm truncate">
              {entries[1]?.full_name}
            </div>
            <div className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5 font-normal">
              {entries[1]?.class_id ? `${entries[1].class_id} ${lang === 'kk' ? 'сынып' : 'класс'}` : '—'}
            </div>
            <div className="text-zinc-900 dark:text-zinc-100 font-bold mt-3.5 flex items-center justify-center gap-1.5 text-sm">
              <Star size={14} className="fill-zinc-300 dark:fill-zinc-600 text-zinc-400 dark:text-zinc-500" />
              <span>{entries[1]?.points_balance}</span>
            </div>
          </div>

          {/* 1st Place (Gold) */}
          <div className="bg-white dark:bg-zinc-900 border border-amber-300/60 dark:border-amber-500/40 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-sm hover:border-amber-400 dark:hover:border-amber-500/60 order-1 md:order-2 md:-translate-y-1.5 shadow-sm">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#D4AF37]/10 mb-3">
              <Trophy className="w-5 h-5 text-[#D4AF37]" strokeWidth={2} />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37] mb-2">
              {localizedText.firstPlace}
            </div>
            <div className="w-14 h-14 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-base rounded-full flex items-center justify-center mx-auto mb-3">
              <span>{entries[0]?.full_name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="text-zinc-900 dark:text-zinc-100 font-bold text-base truncate">
              {entries[0]?.full_name}
            </div>
            <div className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5 font-normal">
              {entries[0]?.class_id ? `${entries[0].class_id} ${lang === 'kk' ? 'сынып' : 'класс'}` : '—'}
            </div>
            <div className="text-zinc-900 dark:text-zinc-100 font-extrabold mt-3.5 flex items-center justify-center gap-1.5 text-base">
              <Star size={15} className="fill-[#D4AF37] text-[#D4AF37]" />
              <span>{entries[0]?.points_balance}</span>
            </div>
          </div>

          {/* 3rd Place (Bronze) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 order-3">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#B08D57]/10 mb-3">
              <Award className="w-5 h-5 text-[#B08D57]" strokeWidth={2} />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#B08D57] mb-2">
              {localizedText.thirdPlace}
            </div>
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                {entries[2]?.full_name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm truncate">
              {entries[2]?.full_name}
            </div>
            <div className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5 font-normal">
              {entries[2]?.class_id ? `${entries[2].class_id} ${lang === 'kk' ? 'сынып' : 'класс'}` : '—'}
            </div>
            <div className="text-zinc-900 dark:text-zinc-100 font-bold mt-3.5 flex items-center justify-center gap-1.5 text-sm">
              <Star size={14} className="fill-zinc-300 dark:fill-zinc-600 text-zinc-400 dark:text-zinc-500" />
              <span>{entries[2]?.points_balance}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full Leaderboard Table ─── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {fetchError ? (
          <div className="text-center py-16 space-y-3">
            <Trophy size={36} className="text-zinc-400 mx-auto" />
            <h3 className="text-zinc-900 dark:text-white font-bold text-sm">
              {t.errors?.fetchFailed || (lang === 'kk' ? 'Деректерді жүктеу мүмкін болмады' : 'Не удалось загрузить данные')}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mx-auto">
              {t.errors?.fetchFailedDesc || (lang === 'kk' ? 'Серверге қосылуды тексеріп, кейінірек қайталап көріңіз.' : 'Проверьте подключение к серверу и попробуйте позже.')}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50">
                <th className="text-left text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider px-6 py-3.5 w-20">
                  {localizedText.rankCol}
                </th>
                <th className="text-left text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider px-4 py-3.5">
                  {localizedText.studentCol}
                </th>
                <th className="text-left text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider px-4 py-3.5 w-28 sm:w-36">
                  {localizedText.classCol}
                </th>
                <th className="text-right text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider px-6 py-3.5 w-28 sm:w-36">
                  {localizedText.pointsCol}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-6" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-36" />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {localizedText.empty}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isFirst = entry.rank === 1;
                  const isSecond = entry.rank === 2;
                  const isThird = entry.rank === 3;
                  const isMe = currentUserId ? entry.student_id === currentUserId : false;

                  let rowStyle = 'transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40';
                  if (isMe) {
                    rowStyle = 'bg-indigo-50/50 dark:bg-indigo-950/30 font-medium hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50';
                  }

                  return (
                    <tr key={entry.student_id} className={rowStyle}>
                      {/* Rank Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isFirst ? (
                            <div className="inline-flex items-center gap-1 text-[#D4AF37] font-semibold text-xs">
                              <Trophy className="w-4 h-4 text-[#D4AF37]" />
                              <span>1</span>
                            </div>
                          ) : isSecond ? (
                            <div className="inline-flex items-center gap-1 text-[#9CA3AF] font-semibold text-xs">
                              <Medal className="w-4 h-4 text-[#9CA3AF]" />
                              <span>2</span>
                            </div>
                          ) : isThird ? (
                            <div className="inline-flex items-center gap-1 text-[#B08D57] font-semibold text-xs">
                              <Award className="w-4 h-4 text-[#B08D57]" />
                              <span>3</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-xs font-medium">
                              #{entry.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Student Info */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-xs font-semibold shrink-0">
                            {entry.full_name?.[0]?.toUpperCase() || <UserIcon size={12} />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 block truncate">
                              {entry.full_name}
                              {isMe && (
                                <span className="ml-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded">
                                  {localizedText.youBadge}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="px-4 py-4 text-zinc-500 dark:text-zinc-400 text-sm whitespace-nowrap">
                        {entry.class_id ? `${entry.class_id}` : '—'}
                      </td>

                      {/* Points */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Star size={13} className="fill-zinc-300 dark:fill-zinc-600 text-zinc-400 dark:text-zinc-500" />
                          <span className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                            {entry.points_balance}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
