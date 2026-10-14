'use client';

import { useEffect, useState } from 'react';
import { Headphones, Music } from 'lucide-react';
import { podcastsApi } from '@/lib/api';
import AudioPlayer from '@/components/audio-player';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';

interface Podcast {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  created_at: string;
}

export default function PodcastsPage() {
  const { lang, t } = useLanguage();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    podcastsApi.list()
      .then(r => setPodcasts(r.data?.items ?? []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title">
          {t.podcastsPage?.title || (lang === 'kk' ? 'Подкасттар мен медитациялар' : 'Подкасты и медитации')}
        </h1>
        <p className="section-subtitle">
          {t.podcastsPage?.subtitle || (lang === 'kk' ? 'Стрессті төмендетуге арналған тыныштандыратын мазмұн' : 'Расслабляющий контент для снижения стресса')}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 space-y-3 shadow-sm">
          <Headphones size={36} className="text-zinc-400 mx-auto" />
          <h3 className="text-zinc-900 dark:text-white font-bold text-sm">
            {t.errors?.fetchFailed || (lang === 'kk' ? 'Деректерді жүктеу мүмкін болмады' : 'Не удалось загрузить данные')}
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mx-auto">
            {t.errors?.fetchFailedDesc || (lang === 'kk' ? 'Серверге қосылуды тексеріп, кейінірек қайталап көріңіз.' : 'Проверьте подключение к серверу и попробуйте позже.')}
          </p>
        </div>
      ) : podcasts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 space-y-3 shadow-sm">
          <Music size={48} className="text-zinc-400 mx-auto mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            {t.podcastsPage?.empty || (lang === 'kk' ? 'Әлі подкасттар жоқ. Психолог жақында қосады!' : 'Пока нет подкастов. Психолог скоро добавит!')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {podcasts.map(podcast => (
            <div key={podcast.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  active === podcast.id
                    ? 'bg-gradient-brand shadow-glow-brand text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}>
                  <Headphones size={22} className={active === podcast.id ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-zinc-900 dark:text-white font-semibold truncate">{podcast.title}</h3>
                  {podcast.description && (
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 line-clamp-2">{podcast.description}</p>
                  )}
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-2">{formatDate(podcast.created_at)}</p>
                </div>
              </div>
              <AudioPlayer
                src={podcast.file_url}
                onPlay={() => setActive(podcast.id)}
                onPause={() => setActive(null)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
