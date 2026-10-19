import definitions from './assessment-definitions.json';
export interface EysenckQuestion {
  id: number;
  text: string;
  scale?: 'extraversion' | 'neuroticism' | 'lie';
}

export const EYSENCK_QUESTIONS = definitions.eysenck.questions.map((question) => ({ id: question.id, text: question.text.ru }));

const canonicalKeys = (id: string) => {
  const keys = definitions.eysenck.scales.find((scale) => scale.id === id)!.keys;
  return { yes: keys.filter((key) => key.a === 1).map((key) => key.q), no: keys.filter((key) => key.a === 0).map((key) => key.q) };
};
export const KEYS = { extraversion: canonicalKeys('extraversion'), neuroticism: canonicalKeys('neuroticism'), lie: canonicalKeys('lie') };

export interface StudentAnswerItem {
  questionId: number;
  questionText: string;
  scale: 'extraversion' | 'neuroticism' | 'lie';
  scaleName: string;
  value: 'Да' | 'Нет';
  isKeyMatch: boolean;
}

export function getQuestionScale(questionId: number): { scale: 'extraversion' | 'neuroticism' | 'lie'; scaleName: string } {
  if (KEYS.extraversion.yes.includes(questionId) || KEYS.extraversion.no.includes(questionId)) {
    return { scale: 'extraversion', scaleName: 'Экстраверсия' };
  }
  if (KEYS.neuroticism.yes.includes(questionId) || KEYS.neuroticism.no.includes(questionId)) {
    return { scale: 'neuroticism', scaleName: 'Нейротизм' };
  }
  return { scale: 'lie', scaleName: 'Шкала лжи' };
}

export const MOCK_STUDENT_ANSWERS = getMockStudentAnswers('default');

/**
 * Генерация стабильного набора ответов для конкретного ученика
 */
export function getMockStudentAnswers(studentSeed: string = 'default'): StudentAnswerItem[] {
  let hash = 0;
  for (let i = 0; i < studentSeed.length; i++) {
    hash = (hash << 5) - hash + studentSeed.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  return EYSENCK_QUESTIONS.map((q) => {
    const { scale, scaleName } = getQuestionScale(q.id);
    const isYes = (seed + q.id * 19) % 100 > 45;
    const value: 'Да' | 'Нет' = isYes ? "Да" : "Нет";
    const isKey =
      value === "Да"
        ? (KEYS.extraversion.yes.includes(q.id) || KEYS.neuroticism.yes.includes(q.id) || KEYS.lie.yes.includes(q.id))
        : (KEYS.extraversion.no.includes(q.id) || KEYS.neuroticism.no.includes(q.id) || KEYS.lie.no.includes(q.id));

    return {
      questionId: q.id,
      questionText: q.text,
      scale,
      scaleName,
      value,
      isKeyMatch: isKey,
    };
  });
}

export function calculateEysenckResults(answers: { questionId: number; value: string }[]) {
  let e = 0, n = 0, l = 0;

  answers.forEach(ans => {
    if (ans.value === "Да") {
      if (KEYS.extraversion.yes.includes(ans.questionId)) e++;
      if (KEYS.neuroticism.yes.includes(ans.questionId)) n++;
      if (KEYS.lie.yes.includes(ans.questionId)) l++;
    } else if (ans.value === "Нет") {
      if (KEYS.extraversion.no.includes(ans.questionId)) e++;
      if (KEYS.neuroticism.no.includes(ans.questionId)) n++;
      if (KEYS.lie.no.includes(ans.questionId)) l++;
    }
  });

  // Определение темперамента по осям (центр = 12)
  let temperament = "Смешанный";
  let temperamentColor = "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20";
  let description = "Сбалансированные черты характера с адаптивной эмоциональной регуляцией.";

  if (e > 12 && n > 12) {
    temperament = "Холерик (Нестабильный экстраверт)";
    temperamentColor = "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30";
    description = "Высокая активность, импульсивность, страстность, эмоциональная возбудимость и быстрая смена настроения.";
  } else if (e > 12 && n <= 12) {
    temperament = "Сангвиник (Стабильный экстраверт)";
    temperamentColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    description = "Общительность, оптимизм, высокая работоспособность, эмоциональная устойчивость и лидерские качества.";
  } else if (e <= 12 && n > 12) {
    temperament = "Меланхолик (Нестабильный интроверт)";
    temperamentColor = "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
    description = "Высокая чувствительность, глубокие переживания, склонность к самоанализу, замкнутость и быстрая утомляемость.";
  } else if (e <= 12 && n <= 12) {
    temperament = "Флегматик (Стабильный интроверт)";
    temperamentColor = "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30";
    description = "Спокойствие, невозмутимость, методичность, высокий самоконтроль и устойчивость к стрессам.";
  }

  return {
    extraversion: e,
    neuroticism: n,
    lie: l,
    temperament,
    temperamentColor,
    description,
  };
}
