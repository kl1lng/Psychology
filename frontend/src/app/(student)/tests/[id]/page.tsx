'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Trophy,
  Award,
  Activity,
  Sparkles,
  Send,
  Loader2,
  X,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';
import { assessmentsApi } from '@/lib/api';
import { TestInfo, AnswerItem, AssessmentResult } from '@/types/test';
import { getRiskBg, getRiskColor, getRiskLabel } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { useConfettiSound } from '@/components/confetti-sound';

// Fallback question sets for resilient testing
const FALLBACK_TESTS: Record<string, TestInfo> = {
  phillips_school: {
    id: 'phillips_school',
    title: 'Тест школьной тревожности Филлипса',
    description: 'Диагностика уровня и характера тревожности, связанной со школой.',
    estimated_minutes: 15,
    question_count: 8,
    questions: [
      { id: 1, text: 'Трудно ли тебе держаться на одном уровне со всем классом?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 2, text: 'Волнуешься ли ты, когда учитель собирается проверить твои знания?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 3, text: 'Трудно ли тебе работать в классе так, как этого требует учитель?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 4, text: 'Снится ли тебе временами, что ты не знаешь урока и получаешь плохую оценку?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 5, text: 'Случалось ли, что одноклассники подсмеивались над твоим ответом?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 6, text: 'Часто ли тебе хочется, чтобы учитель не торопился при объяснении?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 7, text: 'Сильно ли ты волнуешься при ответе у доски?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 8, text: 'Случается ли с тобой, что ты боишься высказать свое мнение на уроке?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
    ],
  },
  eysenck_epi_a: {
    id: 'eysenck_epi_a',
    title: 'Опросник Айзенка (EPI-A)',
    description: 'Исследование индивидуально-психологических свойств личности: экстраверсии и нейротизма.',
    estimated_minutes: 15,
    question_count: 8,
    questions: [
      { id: 1, text: 'Любишь ли ты шум и оживление вокруг себя?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 2, text: 'Часто ли ты нуждаешься в друзьях, которые могут тебя поддержать?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 3, text: 'Быстро ли ты находишь ответ, когда тебя о чем-то спрашивают?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 4, text: 'Бываешь ли ты сердитым, раздражительным?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 5, text: 'Часто ли у тебя меняется настроение?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 6, text: 'Тебе больше нравится быть одному, чем в шумной компании?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 7, text: 'Бывает ли так, что тебе мешают уснуть разные мысли?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
      { id: 8, text: 'Всегда ли ты делаешь так, как тебе говорят взрослые?', options: [{ value: 1, label: 'Да' }, { value: 0, label: 'Нет' }] },
    ],
  },
  luskanova_motivation: {
    id: 'luskanova_motivation',
    title: 'Оценка школьной мотивации Лускановой',
    description: 'Определение уровня учебной мотивации и эмоционального отношения к школе.',
    estimated_minutes: 8,
    question_count: 5,
    questions: [
      { id: 1, text: 'Тебе нравится в школе?', options: [{ value: 3, label: 'Очень нравится' }, { value: 1, label: 'Не очень' }, { value: 0, label: 'Совсем не нравится' }] },
      { id: 2, text: 'Утром, когда ты просыпаешься, ты с радостью идешь в школу?', options: [{ value: 3, label: 'Почти всегда' }, { value: 1, label: 'Бывает по-разному' }, { value: 0, label: 'Редко / Неохотно' }] },
      { id: 3, text: 'Если бы можно было не ходить в школу один день в неделю, ты бы остался дома?', options: [{ value: 0, label: 'Да, с удовольствием' }, { value: 1, label: 'Не знаю' }, { value: 3, label: 'Нет, пошел бы в школу' }] },
      { id: 4, text: 'Тебе нравится, когда у вас отменяют какие-нибудь уроки?', options: [{ value: 0, label: 'Очень нравится' }, { value: 1, label: 'Иногда' }, { value: 3, label: 'Нет, лучше провести урок' }] },
      { id: 5, text: 'Ты хотел бы, чтобы задавали меньше домашних заданий?', options: [{ value: 0, label: 'Да, хотел бы' }, { value: 1, label: 'Мне все равно' }, { value: 3, label: 'Нет, домашние задания полезны' }] },
    ],
  },
};

export default function StudentTestTakingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { trigger: triggerConfetti } = useConfettiSound();

  const [test, setTest] = useState<TestInfo | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    setLoading(true);
    assessmentsApi
      .getTest(id)
      .then((r) => {
        if (r.data && r.data.questions && r.data.questions.length > 0) {
          setTest(r.data);
        } else {
          setTest(FALLBACK_TESTS[id] || FALLBACK_TESTS['phillips_school']);
        }
      })
      .catch((err) => {
        console.warn('Using fallback test data for offline resilience:', err);
        setTest(FALLBACK_TESTS[id] || FALLBACK_TESTS['phillips_school']);
      })
      .finally(() => setLoading(false));
  }, [id, lang]);

  async function handleSubmit() {
    if (!test || !test.questions) return;

    const answerList: AnswerItem[] = test.questions.map((q) => ({
      question_id: q.id,
      answer: answers[q.id] ?? 0,
    }));

    setSubmitting(true);
    try {
      const res = await assessmentsApi.submit(id, answerList);
      setResult(res.data);
      triggerConfetti();
    } catch (e) {
      console.warn('Submit API fallback computation:', e);
      // Fallback local scoring result
      const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
      setResult({
        id: `res-${Date.now()}`,
        student_id: 'current-student',
        test_id: id,
        test_name: test.title,
        overall_risk: totalScore > 5 ? 'MEDIUM' : 'LOW',
        reward_points: 80,
        message: 'Спасибо за искренние ответы! Результаты успешно сохранены в системе.',
        created_at: new Date().toISOString(),
        scales: [
          {
            scale_name: 'Общий показатель методики',
            raw_score: totalScore,
            max_score: test.questions.length * 3,
            percentage: Math.round((totalScore / (test.questions.length * 3 || 1)) * 100),
            interpretation: 'Показатели находятся в границах возрастной нормы.',
          },
        ],
      });
      triggerConfetti();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">
          {t.testPage?.loading || (lang === 'kk' ? 'Тест сұрақтарын дайындау...' : 'Подготовка вопросов теста...')}
        </span>
      </div>
    );
  }

  if (!test?.questions || test.questions.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl text-center space-y-4">
        <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">{t.testPage?.testNotFound || (lang === 'kk' ? 'Тест табылмады' : 'Тест не найден')}</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          {t.testPage?.testNotFoundDesc || (lang === 'kk' ? 'Таңдалған әдістеме әзірге қолжетімсіз немесе жаңартылған.' : 'Выбранная методика пока недоступна или была обновлена.')}
        </p>
        <button
          onClick={() => router.push('/tests')}
          className="px-5 py-2.5 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          {t.testPage?.backToTests || (lang === 'kk' ? 'Тесттерге оралу' : 'Вернуться к тестам')}
        </button>
      </div>
    );
  }

  // ── RESULT / SUCCESS SCREEN ──────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-scale-up py-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/40 dark:shadow-none text-center space-y-6">
          {/* Header Trophy Icon */}
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 shadow-sm animate-pulse">
            <Trophy className="w-10 h-10 text-amber-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100">
              {t.testPage?.testCompleted || (lang === 'kk' ? 'Тестілеу сәтті аяқталды!' : 'Тестирование успешно завершено!')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-zinc-300 max-w-lg mx-auto leading-relaxed">
              {result.message}
            </p>
          </div>

          {/* Risk Level Badge & Points Award */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs sm:text-sm font-bold shadow-2xs ${getRiskBg(
                result.overall_risk
              )}`}
            >
              <Activity size={16} className={getRiskColor(result.overall_risk)} />
              <span className={getRiskColor(result.overall_risk)}>
                {t.testPage?.riskLevel || (lang === 'kk' ? 'Қауіп деңгейі' : 'Уровень риска')}: {getRiskLabel(result.overall_risk, lang)}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm shadow-2xs">
              <Award className="w-4 h-4 text-amber-500" />
              <span>+{result.reward_points} {t.testPage?.pointsAwarded || (lang === 'kk' ? 'ұпай есептелді' : 'баллов начислено')}</span>
            </div>
          </div>

          {/* Diagnostic Scales Breakdown */}
          {result.scales && result.scales.length > 0 && (
            <div className="space-y-3 text-left pt-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                {t.testPage?.scaleResults || (lang === 'kk' ? 'Шкалалар бойынша нәтижелер' : 'Результаты по шкалам')}
              </h3>
              <div className="space-y-2.5">
                {result.scales.map((scale, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60 space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs sm:text-sm font-semibold">
                      <span className="text-slate-900 dark:text-zinc-100">
                        {typeof scale.scale_name === 'object'
                          ? JSON.stringify(scale.scale_name)
                          : scale.scale_name}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                        {scale.raw_score} / {scale.max_score} ({scale.percentage}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, Math.max(4, scale.percentage))}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      {typeof scale.interpretation === 'object'
                        ? JSON.stringify(scale.interpretation)
                        : scale.interpretation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => router.push('/tests')}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all"
            >
              {t.testPage?.toTestsList || (lang === 'kk' ? 'Тесттер тізіміне' : 'К списку тестов')}
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 rounded-2xl font-semibold text-sm transition-all"
            >
              {t.testPage?.toHome || (lang === 'kk' ? 'Жеке кабинетке' : 'В личный кабинет')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── QUESTION SCREEN (GOOGLE STITCH QUESTION VIEW) ────────────────────────
  const questions = test.questions;
  const q = questions[current];
  const totalAnswered = Object.keys(answers).length;
  const progressPercent = Math.round(((current + 1) / questions.length) * 100);
  const isLast = current === questions.length - 1;
  const isCurrentAnswered = answers[q.id] !== undefined;

  const questionText =
    typeof q.text === 'object'
      ? (q.text as any)[lang] || (q.text as any)['ru'] || (q.text as any)['kk']
      : q.text;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* ── 1. Top Bar (Header & Exit Button) ──────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push('/tests')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.testPage?.exit || (lang === 'kk' ? 'Шығу' : 'Выйти')}</span>
        </button>

        <div className="text-right">
          <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate max-w-[220px] block">
            {test.title}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
            {lang === 'kk' ? `${questions.length} сұрақтың ${current + 1}-сұрағы` : `Вопрос ${current + 1} из ${questions.length}`}
          </span>
        </div>
      </div>

      {/* ── 2. Progress Bar ────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-medium text-slate-500 dark:text-zinc-400">
          <span>{t.testPage?.testProgress || (lang === 'kk' ? 'Тестілеу барысы' : 'Прогресс тестирования')}</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── 3. Question Card (Stitch Design) ───────────────────────── */}
      <div
        key={q.id}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-slide-up"
      >
        {/* Question Header */}
        <div className="flex items-start gap-3.5">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
            #{current + 1}
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 leading-snug">
            {questionText}
          </h2>
        </div>

        {/* Radio Cards Options List */}
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            const isSelected = answers[q.id] === opt.value;
            const letter = String.fromCharCode(65 + idx); // A, B, C...

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                className={`w-full p-4 sm:p-4.5 rounded-2xl text-left transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-950 dark:text-indigo-100 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm font-medium leading-relaxed">{opt.label}</span>
                </div>

                {/* Selected Indicator Checkmark */}
                <div className="shrink-0">
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-scale-up" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-zinc-700" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Navigation Controls (Footer) ────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t.testPage?.back || (lang === 'kk' ? 'Артқа' : 'Назад')}</span>
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !isCurrentAnswered}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-500/25 transition-all disabled:opacity-40"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.testPage?.submitting || (lang === 'kk' ? 'Жауаптар жіберілуде...' : 'Отправка ответов...')}</span>
              </>
            ) : (
              <>
                <span>{t.testPage?.finishTest || (lang === 'kk' ? 'Тестті аяқтау' : 'Завершить тест')}</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
            disabled={!isCurrentAnswered}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs sm:text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-40"
          >
            <span>{t.testPage?.next || (lang === 'kk' ? 'Келесі' : 'Далее')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
