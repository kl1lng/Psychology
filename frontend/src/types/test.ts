export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TestQuestion {
  id: number;
  text: string;
  options: { value: number; label: string }[];
}

export interface TestInfo {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  question_count: number;
  questions?: TestQuestion[];
}

export interface ScaleResult {
  scale_name: string;
  raw_score: number;
  max_score: number;
  percentage: number;
  interpretation: string;
}

export interface QuestionResponse {
  id: string;
  testResultId?: string;
  test_result_id?: string;
  questionId: string | number;
  question_id?: string | number;
  selectedOption: string;
  selected_option?: string;
  score: number;
  created_at?: string;
}

export interface TestResult {
  id: string;
  student_id: string | null;
  test_id: string;
  test_name: string;
  risk_level: RiskLevel;
  reward_points: number;
  answers_json?: Record<string, any>;
  question_responses?: QuestionResponse[];
  questionResponses?: QuestionResponse[];
  created_at: string;
}

export interface AssessmentResult {
  id: string;
  test_id: string;
  test_name: string;
  student_id: string | null;
  scales: ScaleResult[];
  overall_risk: RiskLevel;
  reward_points: number;
  created_at: string;
  message: string;
  question_responses?: QuestionResponse[];
  questionResponses?: QuestionResponse[];
}

export interface AnswerItem {
  question_id: number;
  answer: number;
}

export interface AssessmentDetailReport {
  id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  test_id: string;
  test_name: string;
  risk_level: RiskLevel;
  reward_points: number;
  created_at: string;
  scales: ScaleResult[];
  answers_json?: Record<string, number>;
  question_responses?: QuestionResponse[];
  questionResponses?: QuestionResponse[];
  message: string;
}

export interface ClassComparisonItem {
  class_id: string;
  total_students: number;
  total_assessments: number;
  avg_stress: number;
  risk_counts: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  critical_pct: number;
  high_pct: number;
}
