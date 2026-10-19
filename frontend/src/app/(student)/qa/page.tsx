'use client';

import { useState, useEffect } from 'react';
import {
  HelpCircle,
  Send,
  Heart,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Lock,
  Tag,
  ThumbsUp,
} from 'lucide-react';
import { qaApi } from '@/lib/api';
import { useLanguage } from '@/context/language-context';
import { formatDate, formatTime } from '@/lib/utils';

const QA_CATEGORIES = [
  { id: 'all', labelRu: 'Все темы', labelKk: 'Барлық тақырыптар' },
  { id: 'Учеба', labelRu: 'Учеба и экзамены', labelKk: 'Оқу және емтихандар' },
  { id: 'Стресс', labelRu: 'Стресс и тревога', labelKk: 'Стресс және үрей' },
  { id: 'Отношения', labelRu: 'Отношения и друзья', labelKk: 'Қарым-қатынас және достар' },
  { id: 'Профориентация', labelRu: 'Профориентация', labelKk: 'Кәсіби бағдар' },
  { id: 'Буллинг', labelRu: 'Буллинг и конфликты', labelKk: 'Буллинг және қақтығыстар' },
];

export default function StudentQAPage() {
  const { lang } = useLanguage();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // New question form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Стресс');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, [selectedCategory]);

  async function fetchFeed() {
    setLoading(true);
    setFetchError(false);
    try {
      const cat = selectedCategory === 'all' ? undefined : selectedCategory;
      const res = await qaApi.getFeed(cat);
      setQuestions(res.data?.items ?? []);
    } catch (err) {
      console.warn('Failed to load Q&A feed:', err);
      setFetchError(true);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAskQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await qaApi.askQuestion({
        title: title.trim(),
        content: content.trim(),
        category,
      });
      setTitle('');
      setContent('');
      setCategory('Стресс');
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 5000);
    } catch (err) {
      console.error('Failed to submit question:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(questionId: string) {
    try {
      const res = await qaApi.likeQuestion(questionId);
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, likes_count: res.data.likes_count } : q))
      );
    } catch (err) {
      console.error('Failed to like question:', err);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="section-title">
          {lang === 'kk' ? 'Анонимді сұрақ-жауап қабырғасы' : 'Анонимная стена вопросов психологу'}
        </h1>
        <p className="section-subtitle">
          {lang === 'kk'
            ? 'Өзіңізді мазалаған сұрақты толық анонимді түрде қойыңыз және маманнан ресми кеңес алыңыз'
            : 'Задайте волнующий вопрос полностью анонимно. Школьный психолог опубликует профессиональный ответ.'}
        </p>
      </div>

      {/* Ask Question Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-sm">
            <Lock size={16} className="text-emerald-500" />
            <span>{lang === 'kk' ? 'Жаңа анонимді сұрақ қою' : 'Задать анонимный вопрос'}</span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>{lang === 'kk' ? '100% құпия және қауіпсіз' : '100% анонимно'}</span>
          </span>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300 animate-slide-up">
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              {lang === 'kk'
                ? 'Сұрағыңыз қабылданды! Психолог жауап бергеннен кейін ол осы қабырғада жарияланады.'
                : 'Вопрос успешно отправлен! После ответа психолога он появится на публичной стене.'}
            </span>
          </div>
        )}

        <form onSubmit={handleAskQuestion} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={lang === 'kk' ? 'Сұрақтың қысқаша тақырыбы (Мысалы: ҰБТ алдындағы қорқыныш)' : 'Краткая тема вопроса (Например: Страх перед ЕНТ/экзаменом)'}
                className="input !py-2.5 text-xs"
                required
              />
            </div>
            <div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input !py-2.5 text-xs"
              >
                {QA_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'kk' ? c.labelKk : c.labelRu}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={lang === 'kk' ? 'Сұрағыңызды немесе жағдайыңызды толығырақ жазыңыз...' : 'Опишите вашу ситуацию или переживания подробнее...'}
            className="input resize-none text-xs leading-relaxed"
            rows={3}
            required
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-6 text-xs font-bold disabled:opacity-50"
            >
              <Send size={14} />
              <span>{submitting ? (lang === 'kk' ? 'Жіберілуде...' : 'Отправка...') : (lang === 'kk' ? 'Анонимді жіберу' : 'Отправить анонимно')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {QA_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {lang === 'kk' ? cat.labelKk : cat.labelRu}
          </button>
        ))}
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="card animate-pulse h-36" />)
        ) : fetchError ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 space-y-3 shadow-sm">
            <MessageSquare size={36} className="text-zinc-400 mx-auto" />
            <h3 className="text-zinc-900 dark:text-white font-bold text-sm">
              {lang === 'kk' ? 'Деректерді жүктеу мүмкін болмады' : 'Не удалось загрузить вопросы'}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mx-auto">
              {lang === 'kk' ? 'Серверге қосылуды тексеріп, кейінірек қайталап көріңіз.' : 'Проверьте подключение к серверу и попробуйте позже.'}
            </p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 space-y-3 shadow-sm">
            <MessageSquare size={36} className="text-zinc-400 mx-auto" />
            <h3 className="text-zinc-900 dark:text-white font-bold text-sm">
              {lang === 'kk' ? 'Әзірге жарияланған сұрақтар жоқ' : 'В этой категории пока нет опубликованных ответов'}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mx-auto">
              {lang === 'kk'
                ? 'Сіз бірінші болып сұрақ қоя аласыз. Психолог жақында жауап береді!'
                : 'Вы можете задать первый вопрос анонимно выше, и психолог подготовит ответ.'}
            </p>
          </div>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                      {q.category}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {formatDate(q.created_at)}
                    </span>
                  </div>
                  <h3 className="text-zinc-900 dark:text-white font-bold text-sm leading-snug">{q.title}</h3>
                </div>

                <button
                  onClick={() => handleLike(q.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold border border-zinc-200/60 dark:border-zinc-700/60 transition-all flex-shrink-0"
                  title="Полезный ответ"
                >
                  <ThumbsUp size={13} />
                  <span>{q.likes_count || 0}</span>
                </button>
              </div>

              {/* Question Content */}
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                «{q.content}»
              </p>

              {/* Psychologist Answer */}
              {q.answer && (
                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-xs">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>{lang === 'kk' ? 'Мектеп психологының жауабы:' : 'Ответ школьного психолога:'}</span>
                  </div>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {q.answer}
                  </p>
                  {q.answered_at && (
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 text-right">
                      {formatDate(q.answered_at)} {formatTime(q.answered_at)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
