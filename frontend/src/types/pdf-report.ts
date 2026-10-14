/**
 * Universal PDF Report Data Structure
 * Supports any psychological methodology (Eysenck, Phillips, Luskanova, Klimov, etc.)
 */

export interface UniversalReportScale {
  name: string;
  rawScore: number | string;
  maxScore: number | string;
  percentage?: number | string;
  interpretation: string;
}

export interface UniversalReportAnswer {
  number: number | string;
  questionText: string;
  studentAnswer: string;
  points?: string | number; // Optional awarded points (+1, 0, etc.)
}

export interface UniversalReportData {
  student: {
    fullName: string;
    className: string;
  };
  test: {
    name: string;
    date: string;
    totalScore?: string | number; // Total score (if applicable)
    riskLevel?: string;           // Risk level (Норма, Повышенный, etc.)
  };
  scales: UniversalReportScale[];
  answers: UniversalReportAnswer[];
}
