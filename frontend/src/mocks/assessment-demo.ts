import definitions from './assessment-definitions.json';
import type { RiskLevel, ScaleResult, QuestionResponse } from '@/types/test';

type Localized = string | { ru: string; kk?: string };
interface Definition {
  title: Localized;
  scoring_type?: string;
  risk_thresholds: Record<string, number>;
  questions: { id: number; text: Localized; options?: { value: number; label: Localized }[] }[];
  scales: { id: string; name: Localized; max_score?: number; keys?: { q: number; a: number }[]; interpretations: { min: number; text: Localized }[] }[];
}
export interface DemoAssessment {
  id: string; student_id: string; student_name: string; class_id: string;
  test_id: string; test_name: string; is_completed: boolean; total_score: number;
  risk_level: RiskLevel; completed_at: string | null; scales: ScaleResult[];
  question_responses: QuestionResponse[];
}
export const localText = (value: Localized): string =>
  (typeof value === 'string' ? value : value.ru).replace(/\(EPI[^)]*\)/g, '(форма А)').replace(/\bIT\b/g, 'информационных технологий');
export function getDefinition(id: string): Definition {
  return (definitions as unknown as Record<string, Definition>)[id];
}
export const DEMO_METHODOLOGIES = Object.keys(definitions).map((id) => ({
  id, title: localText(getDefinition(id).title), questionsCount: getDefinition(id).questions.length,
}));

function createExample(testId: string, index: number): DemoAssessment {
  const config = getDefinition(testId);
  const values = new Map<number, number>();
  for (const question of config.questions) {
    const key = config.scales.flatMap((scale) => scale.keys || []).find((item) => item.q === question.id);
    const options = question.options || [{ value: 0, label: 'Нет' }, { value: 1, label: 'Да' }];
    const match = (question.id * 17 % 100) < [20, 55, 90][index % 3];
    const option = key
      ? options.find((option) => match ? option.value === key.a : option.value !== key.a)
      : options[index % options.length];
    values.set(question.id, option?.value ?? 0);
  }
  const scales = config.scales.map((scale) => {
    const raw = config.scoring_type === 'weighted'
      ? Array.from(values.values()).reduce((sum, value) => sum + value, 0)
      : (scale.keys || []).filter((key) => values.get(key.q) === key.a).length;
    const max = scale.max_score || scale.keys?.length || 1;
    const interpretation = [...scale.interpretations].sort((a, b) => b.min - a.min).find((item) => raw >= item.min);
    return { scale_name: localText(scale.name), raw_score: raw, max_score: max,
      percentage: Math.round(raw / max * 1000) / 10, interpretation: interpretation ? localText(interpretation.text) : 'Не определено' };
  });
  const threshold = config.risk_thresholds;
  const percentage = testId === 'eysenck' ? scales[1].percentage : Math.max(...scales.map((scale) => scale.percentage));
  let risk: RiskLevel = percentage >= threshold.critical ? 'CRITICAL' : percentage >= threshold.high ? 'HIGH' : percentage >= threshold.medium ? 'MEDIUM' : 'LOW';
  if (testId === 'klimov') risk = 'LOW'; // Professional preference is not a psychological risk.
  if (config.scoring_type === 'weighted') risk = scales[0].raw_score < (threshold.critical_below ?? 10) ? 'HIGH' : scales[0].raw_score < (threshold.medium_below ?? 15) ? 'MEDIUM' : 'LOW';
  return {
    id: `demo-${testId}-${index}`, student_id: `demo-student-${index}`,
    student_name: ['Айдос Нурланов', 'Айзере Серикова', 'Батырхан Садыков', 'Камилла Мусина'][index],
    class_id: index === 3 ? '9Б' : '10А', test_id: testId, test_name: localText(config.title),
    is_completed: index !== 3, total_score: scales[0]?.raw_score ?? 0,
    risk_level: risk, completed_at: index === 3 ? null : '2026-10-14T09:00:00Z',
    scales: index === 3 ? [] : scales,
    question_responses: index === 3 ? [] : config.questions.map((question) => {
      const value = values.get(question.id)!;
      const option = question.options?.find((option) => option.value === value);
      return { id: `demo-${testId}-${index}-${question.id}`, questionId: question.id,
        selectedOption: option ? localText(option.label) : value === 1 ? 'Да' : 'Нет', score: value };
    }),
  };
}
export const DEMO_ASSESSMENTS = DEMO_METHODOLOGIES.flatMap(({ id }) => [0, 1, 2, 3].map((index) => createExample(id, index)));
export function getDemoAnswers(student: DemoAssessment) {
  const config = getDefinition(student.test_id);
  return student.question_responses.map((answer) => {
    const questionId = Number(answer.questionId);
    const question = config.questions.find((question) => question.id === questionId);
    const scales = config.scales.filter((scale) => config.scoring_type === 'weighted' || scale.keys?.some((key) => key.q === questionId));
    return { questionId, questionText: question ? localText(question.text) : `Вопрос ${questionId}`,
      scale: scales[0]?.id || '', scaleName: scales.map((scale) => localText(scale.name)).join(', '), value: answer.selectedOption };
  });
}
