'use client';

import React from 'react';

export interface AcademicStudentRow {
  id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  subject: string;
  test_title: string;
  is_completed: boolean;
  score: number; // 0-100
  grade_level: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_ATTENTION';
  completed_at: string | null;
  qmj_topic?: string;
}

export interface AcademicClassReportProps {
  classId: string;
  subject: string;
  testTitle: string;
  departmentName: string;
  teacherName: string;
  students: AcademicStudentRow[];
  qmjTitle?: string;
}

export const AcademicClassReport: React.FC<AcademicClassReportProps> = ({
  classId,
  subject,
  testTitle,
  departmentName,
  teacherName,
  students,
  qmjTitle = 'Краткосрочный план (ҚМЖ) — 1-я четверть 2026',
}) => {
  const currentDate = new Date().toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const completedStudents = students.filter((s) => s.is_completed);
  const totalCount = students.length;
  const completedCount = completedStudents.length;
  const avgScore =
    completedCount > 0
      ? Math.round(completedStudents.reduce((acc, s) => acc + s.score, 0) / completedCount)
      : 0;

  const qualityCount = completedStudents.filter(
    (s) => s.grade_level === 'EXCELLENT' || s.grade_level === 'GOOD'
  ).length;
  const qualityRate = completedCount > 0 ? Math.round((qualityCount / completedCount) * 100) : 0;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      style={{
        width: '800px',
        padding: '32px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        lineHeight: '1.5',
      }}
    >
      {/* ── Document Header ────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: '2px solid #047857',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#047857', letterSpacing: '-0.5px' }}>
              AISezim • ВЕДОМОСТЬ АКАДЕМИЧЕСКОЙ УСПЕВАЕМОСТИ
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginTop: '4px' }}>
              {departmentName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Дата формирования:</div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{currentDate}</div>
          </div>
        </div>
      </div>

      {/* ── Meta Info Grid ──────────────────────────────────────────── */}
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
            Класс:
          </span>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
            {classId === 'ALL' ? 'Все параллели' : `Класс ${classId}`}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
            Предмет / Срез:
          </span>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{testTitle}</div>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
            Преподаватель:
          </span>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{teacherName}</div>
        </div>
        <div style={{ gridColumn: 'span 3', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
          <span style={{ fontSize: '10px', color: '#047857', fontWeight: '700' }}>Привязка к ҚМЖ: </span>
          <span style={{ fontSize: '11px', color: '#334155' }}>{qmjTitle}</span>
        </div>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '10px', color: '#166534', fontWeight: '700' }}>ВСЕГО УЧЕНИКОВ</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#166534', marginTop: '4px' }}>{totalCount}</div>
        </div>
        <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: '700' }}>СДАЛИ ТЕСТ</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e40af', marginTop: '4px' }}>
            {completedCount} <span style={{ fontSize: '11px', fontWeight: '600' }}>({completionRate}%)</span>
          </div>
        </div>
        <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
          <div style={{ fontSize: '10px', color: '#854d0e', fontWeight: '700' }}>СРЕДНИЙ БАЛЛ</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#854d0e', marginTop: '4px' }}>
            {avgScore} / 100
          </div>
        </div>
        <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
          <div style={{ fontSize: '10px', color: '#5b21b6', fontWeight: '700' }}>КАЧЕСТВО ЗНАНИЙ</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#5b21b6', marginTop: '4px' }}>{qualityRate}%</div>
        </div>
      </div>

      {/* ── Table of Students ───────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <thead>
          <tr style={{ backgroundColor: '#047857', color: '#ffffff', textAlign: 'left' }}>
            <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: '700', width: '30px' }}>#</th>
            <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: '700' }}>ФИО Ученика</th>
            <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: '700', width: '60px' }}>Класс</th>
            <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: '700', width: '80px' }}>Статус</th>
            <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: '700', width: '70px' }}>Балл (100)</th>
            <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: '700', width: '110px' }}>Успеваемость</th>
            <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: '700', width: '90px' }}>Дата сдачи</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => {
            let gradeBadgeBg = '#dcfce7';
            let gradeBadgeText = '#15803d';
            let gradeLabel = 'Отлично (85+)';

            if (student.grade_level === 'GOOD') {
              gradeBadgeBg = '#dbeafe';
              gradeBadgeText = '#1d4ed8';
              gradeLabel = 'Хорошо (70-84)';
            } else if (student.grade_level === 'SATISFACTORY') {
              gradeBadgeBg = '#fef3c7';
              gradeBadgeText = '#b45309';
              gradeLabel = 'Удовл. (50-69)';
            } else if (student.grade_level === 'NEEDS_ATTENTION') {
              gradeBadgeBg = '#fee2e2';
              gradeBadgeText = '#b91c1c';
              gradeLabel = 'Внимание (<50)';
            }

            return (
              <tr
                key={student.id}
                style={{
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                }}
              >
                <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '10px' }}>{index + 1}</td>
                <td style={{ padding: '7px 10px', fontWeight: '600', color: '#0f172a' }}>
                  {student.student_name}
                </td>
                <td style={{ padding: '7px 10px', color: '#334155', fontWeight: '600' }}>{student.class_id}</td>
                <td style={{ padding: '7px 10px' }}>
                  {student.is_completed ? (
                    <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '11px' }}>Сдал</span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>Не сдал</span>
                  )}
                </td>
                <td style={{ padding: '7px 10px', fontWeight: '700', color: '#0f172a' }}>
                  {student.is_completed ? `${student.score}` : '—'}
                </td>
                <td style={{ padding: '7px 10px' }}>
                  {student.is_completed ? (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: gradeBadgeBg,
                        color: gradeBadgeText,
                        fontSize: '10px',
                        fontWeight: '700',
                      }}
                    >
                      {gradeLabel}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '10px' }}>
                  {student.completed_at
                    ? new Date(student.completed_at).toLocaleDateString('ru-RU')
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Signatures Area ─────────────────────────────────────────── */}
      <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Учитель-предметник:</div>
          <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>{teacherName} / _______________</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Заведующий кафедрой:</div>
          <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>Подпись: _______________</div>
        </div>
      </div>
    </div>
  );
};
