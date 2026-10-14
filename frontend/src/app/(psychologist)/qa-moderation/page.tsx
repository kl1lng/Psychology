'use client';

import { useState, useEffect } from 'react';
import {
  HelpCircle,
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  Check,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';
import { qaApi } from '@/lib/api';
import { useLanguage } from '@/context/language-context';
import { formatDate, formatTime } from '@/lib/utils';

interface QAQuestion {
  id: string;
  student_id: string;
  title: string;
  content: string;
  category: string;
  answer?: string | null;
  is_published: boolean;
  likes_count: number;
  created_at: string;
  answered_at?: string | null;
}

export default function QAModerationPage() {
  const { lang } = useLanguage();
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [activeQuestion, setActiveQuestion] = useState<QAQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [statusFilter]);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const res = await qaApi.getModeration(statusFilter === 'all' ? undefined : statusFilter);
      setQuestions(res.data?.items ?? []);
    } catch (err) {
      console.warn('Failed to fetch moderation queue:', err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAnswer(q: QAQuestion) {
    setActiveQuestion(q);
    setAnswerText(q.answer || '');
    setPublishImmediately(q.is_published ?? true);
  }

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!activeQuestion || !answerText.trim() || saving) return;

    setSaving(true);
    try {
      const res = await qaApi.answerQuestion(activeQuestion.id, {
        answer: answerText.trim(),
        is_published: publishImmediately,
      });

      setQuestions((prev) =>
        prev.map((q) => (q.id === activeQuestion.id ? res.data : q))
      );
      setActiveQuestion(null);
      setAnswerText('');
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">
            {lang === 'kk' ? 'Анонимді сұрақтар модерациясы (Q&A)' : 'Модерация и ответы на вопросы (Q&A)'}
          </h1>
          <p className="section-subtitle">
            {lang === 'kk'
              ? 'Оқушылардан түскен анонимді сауалдарға кәсіби жауап беру және қабырғаға жариялау'
              : 'Профессиональные ответы на вопросы учащихся и публикация на открытой стене'}
          </p>
        </div>

        {/* Filter Segmented Control Tabs */}
        <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out text-center ${
              statusFilter === 'all'
                ? 'bg-white text-gray-900 font-semibold shadow-sm border border-gray-200/60'
                : 'bg-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {lang === 'kk' ? 'Барлығы' : 'Все'}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out text-center ${
              statusFilter === 'pending'
                ? 'bg-white text-gray-900 font-semibold shadow-sm border border-gray-200/60'
                : 'bg-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {lang === 'kk' ? 'Жауапсыз' : 'Ожидают ответа'}
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('answered')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out text-center ${
              statusFilter === 'answered'
                ? 'bg-white text-gray-900 font-semibold shadow-sm border border-gray-200/60'
                : 'bg-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {lang === 'kk' ? 'Жауап берілген' : 'Отвеченные'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Questions list (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="card animate-pulse h-28" />)
          ) : questions.length === 0 ? (
            <div className="card text-center !py-12 border-dashed border-white/10">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-2" />
              <h3 className="text-white font-bold text-sm">
                {lang === 'kk' ? 'Сұрақтар кезегі бос' : 'Очередь вопросов пуста'}
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                {lang === 'kk' ? 'Оқушылардан жаңа сұрақтар түскенде осында пайда болады.' : 'Новые вопросы от учащихся появятся здесь автоматически.'}
              </p>
            </div>
          ) : (
            questions.map((q) => {
              const isSelected = activeQuestion?.id === q.id;
              const hasAnswer = Boolean(q.answer);
              return (
                <div
                  key={q.id}
                  onClick={() => handleOpenAnswer(q)}
                  className={`card-hover p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                      : 'border-surface-border bg-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-300">
                        {q.category}
                      </span>
                      <span className="text-[11px] text-gray-500">{formatDate(q.created_at)}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                        hasAnswer
                          ? q.is_published
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {hasAnswer ? (
                        q.is_published ? (
                          <>
                            <Eye size={11} />
                            <span>{lang === 'kk' ? 'Жарияланды' : 'Опубликован'}</span>
                          </>
                        ) : (
                          <>
                            <EyeOff size={11} />
                            <span>{lang === 'kk' ? 'Жасырын' : 'Черновик'}</span>
                          </>
                        )
                      ) : (
                        <>
                          <Clock size={11} />
                          <span>{lang === 'kk' ? 'Жауап күтуде' : 'Требует ответа'}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="text-white font-bold text-sm mb-1">{q.title}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    «{q.content}»
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Answer Console (5 cols) */}
        <div className="lg:col-span-5 card !p-6 space-y-4 sticky top-6 border-brand-500/20">
          {!activeQuestion ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare size={36} className="text-gray-600 mx-auto" />
              <h3 className="text-white font-bold text-sm">
                {lang === 'kk' ? 'Сұрақты таңдаңыз' : 'Выберите вопрос'}
              </h3>
              <p className="text-gray-400 text-xs max-w-xs mx-auto">
                {lang === 'kk'
                  ? 'Сол жақтағы тізімнен оқушы сұрағын таңдап, ресми жауап пен жариялау күйін реттеңіз.'
                  : 'Выберите вопрос из списка слева для составления ответа и публикации на стене.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <div className="border-b border-surface-border pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-300">
                    {activeQuestion.category}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(activeQuestion.created_at)}</span>
                </div>
                <h2 className="text-white font-bold text-base">{activeQuestion.title}</h2>
                <p className="text-xs text-gray-300 mt-2 bg-surface-muted/40 p-3 rounded-xl border border-white/5 leading-relaxed">
                  «{activeQuestion.content}»
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>{lang === 'kk' ? 'Психологтың кәсіби жауабы *' : 'Профессиональный ответ психолога *'}</span>
                </label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder={lang === 'kk' ? 'Оқушыға қолдау білдіретін және нақты бағыт-бағдар беретін жауап жазыңыз...' : 'Напишите поддерживающий и содержательный ответ ученику...'}
                  className="input resize-none text-xs leading-relaxed"
                  rows={6}
                  required
                />
              </div>

              {/* Publish Checkbox */}
              <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  className="rounded border-gray-600 text-brand-500 focus:ring-brand-500"
                />
                <span>{lang === 'kk' ? 'Анонимді сұрақ қабырғасында барлығына жариялау' : 'Опубликовать на публичной стене Q&A'}</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveQuestion(null)}
                  className="btn-secondary !py-2 !px-4 text-xs font-semibold"
                >
                  {lang === 'kk' ? 'Бас тарту' : 'Отмена'}
                </button>
                <button
                  type="submit"
                  disabled={saving || !answerText.trim()}
                  className="btn-primary inline-flex items-center gap-1.5 !py-2 !px-5 text-xs font-bold"
                >
                  <Send size={13} />
                  <span>{saving ? (lang === 'kk' ? 'Сақталуда...' : 'Сохранение...') : (lang === 'kk' ? 'Жауапты сақтау' : 'Сохранить ответ')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
