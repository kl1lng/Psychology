import definitions from '@/mocks/assessment-definitions.json';
import type { AssessmentResult, RiskLevel, TestInfo } from '@/types/test';

type LocalizedText = string | { ru?: string; kk?: string };
type LocalScale = {
  id: string;
  name: LocalizedText;
  keys?: { q: number; a: number }[];
  max_score?: number;
  interpretations: { min: number; text: LocalizedText }[];
};
type LocalQuestion = {
  id: number;
  text: LocalizedText;
  options?: { value: number; label: LocalizedText }[];
};
type LocalDefinition = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  estimated_minutes: number;
  scoring_type?: string;
  risk_thresholds: Record<string, number>;
  scales: LocalScale[];
  questions: LocalQuestion[];
};

const localDefinitions = Object.values(definitions) as LocalDefinition[];

function localized(value: LocalizedText, lang: string): string {
  if (typeof value === 'string') return value;
  return value[lang as 'ru' | 'kk'] || value.ru || value.kk || '';
}

function findDefinition(testId: string): LocalDefinition | undefined {
  return localDefinitions.find((definition) => definition.id === testId);
}

export function getLocalAssessmentList(lang: string): TestInfo[] {
  return localDefinitions.map((definition) => ({
    id: definition.id,
    title: localized(definition.title, lang),
    description: localized(definition.description, lang),
    estimated_minutes: definition.estimated_minutes,
    question_count: definition.questions.length,
  }));
}

export function getLocalAssessment(testId: string, lang: string): TestInfo | null {
  const definition = findDefinition(testId);
  if (!definition) return null;

  return {
    id: definition.id,
    title: localized(definition.title, lang),
    description: localized(definition.description, lang),
    estimated_minutes: definition.estimated_minutes,
    question_count: definition.questions.length,
    questions: definition.questions.map((question) => ({
      id: question.id,
      text: localized(question.text, lang),
      options: question.options
        ? question.options.map((option) => ({ value: option.value, label: localized(option.label, lang) }))
        : [
            { value: 1, label: lang === 'kk' ? 'Иә' : 'Да' },
            { value: 0, label: lang === 'kk' ? 'Жоқ' : 'Нет' },
          ],
    })),
  };
}

export function scoreLocalAssessment(
  testId: string,
  answers: Record<number, number>,
  studentId: string,
  lang: string,
): AssessmentResult {
  const definition = findDefinition(testId);
  if (!definition) throw new Error('Неизвестная методика');

  const questionIds = definition.questions.map((question) => question.id);
  if (questionIds.some((id) => answers[id] === undefined) || Object.keys(answers).length !== questionIds.length) {
    throw new Error('Ответьте на все вопросы перед отправкой.');
  }
  for (const question of definition.questions) {
    const allowed = question.options?.map((option) => option.value) || [0, 1];
    if (!allowed.includes(answers[question.id])) throw new Error(`Недопустимый ответ на вопрос ${question.id}`);
  }

  const weighted = definition.scoring_type === 'weighted';
  const totalScore = weighted
    ? definition.questions.reduce((sum, question) => sum + answers[question.id], 0)
    : 0;
  const scales = definition.scales.map((scale) => {
    const rawScore = weighted
      ? totalScore
      : (scale.keys || []).reduce((sum, key) => sum + (answers[key.q] === key.a ? 1 : 0), 0);
    const maxScore = weighted ? scale.max_score || 30 : (scale.keys || []).length;
    const interpretation = [...scale.interpretations]
      .sort((left, right) => right.min - left.min)
      .find((item) => rawScore >= item.min);
    return {
      scale_name: localized(scale.name, lang),
      raw_score: rawScore,
      max_score: maxScore,
      percentage: maxScore > 0 ? Math.round((rawScore / maxScore) * 1000) / 10 : 0,
      interpretation: localized(interpretation?.text || 'Норма', lang),
    };
  });

  const thresholds = definition.risk_thresholds;
  let risk: RiskLevel;
  if (testId === 'klimov_ddo') {
    risk = 'LOW';
  } else if (weighted) {
    risk = totalScore < (thresholds.critical_below ?? 10)
      ? 'HIGH'
      : totalScore < (thresholds.medium_below ?? 15) ? 'MEDIUM' : 'LOW';
  } else {
    const relevantScales = testId === 'eysenck_epi_a'
      ? scales.filter((_, index) => definition.scales[index].id === 'neuroticism')
      : scales;
    const highestPercentage = Math.max(0, ...relevantScales.map((scale) => scale.percentage));
    risk = highestPercentage >= (thresholds.critical ?? 80)
      ? 'CRITICAL'
      : highestPercentage >= (thresholds.high ?? 65)
        ? 'HIGH'
        : highestPercentage >= (thresholds.medium ?? 45) ? 'MEDIUM' : 'LOW';
  }

  const messages: Record<RiskLevel, { ru: string; kk: string }> = {
    LOW: {
      ru: 'Отличный результат! Уровень стресса в норме. Так держать! 🎉',
      kk: 'Тамаша нәтиже! Стресс деңгейі қалыпты. Осылай жалғастыра беріңіз! 🎉',
    },
    MEDIUM: {
      ru: 'Обнаружен умеренный уровень тревожности. Рекомендуем практики релаксации.',
      kk: 'Орташа мазасыздық деңгейі анықталды. Релаксация жаттығуларын ұсынамыз.',
    },
    HIGH: {
      ru: 'Выявлен повышенный уровень стресса. Рекомендуем консультацию с психологом.',
      kk: 'Жоғары стресс деңгейі анықталды. Психологпен кеңесуді ұсынамыз.',
    },
    CRITICAL: {
      ru: 'Обнаружен критический уровень. Пожалуйста, свяжитесь с психологом как можно скорее.',
      kk: 'Қауіпті деңгей анықталды. Тез арада психологпен хабарласыңыз.',
    },
  };
  const now = new Date().toISOString();
  const resultId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `local-${Date.now()}`;

  return {
    id: resultId,
    test_id: testId,
    test_name: localized(definition.title, lang),
    student_id: studentId,
    scales,
    overall_risk: risk,
    reward_points: 50 + ({ LOW: 30, MEDIUM: 20, HIGH: 10, CRITICAL: 10 }[risk]),
    created_at: now,
    message: messages[risk][lang === 'kk' ? 'kk' : 'ru'],
    question_responses: definition.questions.map((question) => {
      const answer = answers[question.id];
      const option = question.options?.find((item) => item.value === answer);
      const selectedOption = option ? localized(option.label, lang) : answer === 1 ? (lang === 'kk' ? 'Иә' : 'Да') : (lang === 'kk' ? 'Жоқ' : 'Нет');
      return {
        id: `${resultId}-${question.id}`,
        questionId: question.id,
        selectedOption,
        score: answer,
      };
    }),
  };
}
