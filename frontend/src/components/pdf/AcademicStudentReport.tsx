'use client';

import React from 'react';

export interface AcademicStudentReportProps {
  studentName: string;
  studentId?: string;
  classId: string;
  subject: string;
  testTitle: string;
  completedAt: string | null;
  score: number;
  gradeLevel: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_ATTENTION';
  departmentName: string;
  teacherName: string;
  qmjTopic?: string;
  breakdown?: { topic: string; score: number; maxScore: number }[];
}

export const AcademicStudentReport: React.FC<AcademicStudentReportProps> = ({
  studentName,
  studentId = 'STD-2026',
  classId,
  subject,
  testTitle,
  completedAt,
  score,
  gradeLevel,
  departmentName,
  teacherName,
  qmjTopic = 'ҚМЖ: Алгоритмизация и программирование (1-тоқсан)',
  breakdown = [
    { topic: 'Теоретические основы и терминология', score: 9, maxScore: 10 },
    { topic: 'Практические задачи и алгоритмы', score: 18, maxScore: 20 },
    { topic: 'Анализ программного кода', score: 17, maxScore: 20 },
  ],
}) => {
  const formattedDate = completedAt
    ? new Date(completedAt).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('ru-RU');

  let gradeBadgeBg = '#dcfce7';
  let gradeBadgeText = '#15803d';
  let gradeLabel = 'ОТЛИЧНО (А / 5)';
  let recommendation =
    'Ученик демонстрирует глубокое понимание программного материала, высокий уровень логического мышления и способность решать комплексные предметные задачи.';

  if (gradeLevel === 'GOOD') {
    gradeBadgeBg = '#dbeafe';
    gradeBadgeText = '#1d4ed8';
    gradeLabel = 'ХОРОШО (В / 4)';
    recommendation =
      'Материал усвоен на высоком уровне. Рекомендуется уделить внимание сложным практическим задачам повышенной трудности.';
  } else if (gradeLevel === 'SATISFACTORY') {
    gradeBadgeBg = '#fef3c7';
    gradeBadgeText = '#b45309';
    gradeLabel = 'УДОВЛЕТВОРИТЕЛЬНО (С / 3)';
    recommendation =
      'Базовый уровень пройден. Требуется дополнительное повторение ключевых определений и тренировка практических навыков.';
  } else if (gradeLevel === 'NEEDS_ATTENTION') {
    gradeBadgeBg = '#fee2e2';
    gradeBadgeText = '#b91c1c';
    gradeLabel = 'ТРЕБУЕТСЯ КОРРЕКЦИЯ (D / 2)';
    recommendation =
      'Рекомендуются индивидуальные консультации с учителем-предметником и проработка тем в рамках плана восполнения знаний.';
  }

  return (
    <div
      style={{
        width: '800px',
        padding: '36px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        lineHeight: '1.5',
      }}
    >
      {/* ── Document Header ────────────────────────────────────────── */}
      <div style={{ borderBottom: '2px solid #047857', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#047857' }}>
              AISezim • ИНДИВИДУАЛЬНАЯ КАРТОЧКА УСПЕВАЕМОСТИ
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginTop: '4px' }}>
              {departmentName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Дата сдачи:</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{formattedDate}</div>
          </div>
        </div>
      </div>

      {/* ── Student Information Block ──────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}
      >
        <div>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
            ФИО Ученика:
          </span>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{studentName}</div>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
            Класс:
          </span>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{classId}</div>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
            Учитель:
          </span>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{teacherName}</div>
        </div>
        <div style={{ gridColumn: 'span 3', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', color: '#047857', fontWeight: '700' }}>Предмет и срез: </span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>{testTitle}</span>
          <span style={{ marginLeft: '16px', fontSize: '11px', color: '#64748b' }}>({qmjTopic})</span>
        </div>
      </div>

      {/* ── Score & Grade Summary ──────────────────────────────────── */}
      <div
        style={{
          backgroundColor: gradeBadgeBg,
          border: `1px solid ${gradeBadgeText}40`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: gradeBadgeText, textTransform: 'uppercase' }}>
            Итоговая академическая оценка:
          </div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: gradeBadgeText, marginTop: '4px' }}>
            {gradeLabel}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: gradeBadgeText, fontWeight: '700' }}>ИТОГОВЫЙ БАЛЛ</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: gradeBadgeText }}>
            {score} <span style={{ fontSize: '14px', fontWeight: '600' }}>/ 100</span>
          </div>
        </div>
      </div>

      {/* ── Topic Breakdown ────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
          Результаты по разделам и критериям:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {breakdown.map((item, i) => {
            const pct = Math.round((item.score / item.maxScore) * 100);
            return (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: '600', color: '#334155' }}>{item.topic}</div>
                <div style={{ fontWeight: '700', color: '#047857' }}>
                  {item.score} / {item.maxScore} баллов ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Teacher Recommendation ─────────────────────────────────── */}
      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>
          Рекомендации преподавателя кафедры:
        </div>
        <div style={{ fontSize: '12px', color: '#166534', lineHeight: '1.6' }}>{recommendation}</div>
      </div>

      {/* ── Signatures ─────────────────────────────────────────────── */}
      <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Преподаватель:</div>
          <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>{teacherName} / _______________</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Ознакомлен (родитель/ученик):</div>
          <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>Подпись: _______________</div>
        </div>
      </div>
    </div>
  );
};
