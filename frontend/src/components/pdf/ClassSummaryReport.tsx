'use client';

import React from 'react';
import type { RiskLevel } from '@/types/test';

export interface ClassSummaryStudentRow {
  student_name: string;
  class_id: string;
  is_completed: boolean;
  total_score: number;
  risk_level: RiskLevel;
  completed_at: string | null;
}

export interface ClassSummaryReportProps {
  classNameString: string;
  testTitle: string;
  students: ClassSummaryStudentRow[];
  generatedAt?: string;
  teacherDepartmentName?: string;
}

export const ClassSummaryReport: React.FC<ClassSummaryReportProps> = ({
  classNameString,
  testTitle,
  students,
  generatedAt,
  teacherDepartmentName,
}) => {
  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('ru-RU');

  // Stats calculation
  const total = students.length;
  const completed = students.filter((s) => s.is_completed).length;
  const lowRisk = students.filter((s) => s.is_completed && s.risk_level === 'LOW').length;
  const mediumRisk = students.filter((s) => s.is_completed && s.risk_level === 'MEDIUM').length;
  const highCriticalRisk = students.filter(
    (s) => s.is_completed && (s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL')
  ).length;

  return (
    <div
      style={{
        width: '800px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: 'Inter, Arial, sans-serif',
        padding: '36px 40px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>
            Школьная психологическая служба • {teacherDepartmentName || 'Кафедра преподавателей'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            СВОДНАЯ ВЕДОМОСТЬ ТЕСТИРОВАНИЯ
          </div>
          <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
            Класс: <strong style={{ color: '#0f172a' }}>{classNameString}</strong> • Методика: <strong style={{ color: '#0f172a' }}>{testTitle}</strong>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
          <div>Дата выгрузки: <strong style={{ color: '#0f172a' }}>{formattedDate}</strong></div>
          <div>Платформа: <strong style={{ color: '#0f172a' }}>AISezim</strong></div>
        </div>
      </div>

      {/* ── Summary Statistics KPI Grid ──────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '10px',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Всего в классе
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {total}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Сдали опрос
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
            {completed} ({total > 0 ? Math.round((completed / total) * 100) : 0}%)
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Норма (LOW)
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
            {lowRisk}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Умеренный (MED)
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
            {mediumRisk}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Зона риска (HIGH)
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
            {highCriticalRisk}
          </div>
        </div>
      </div>

      {/* ── Table of Students ─────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            border: '1px solid #cbd5e1',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', color: '#334155', textAlign: 'left', fontWeight: 700 }}>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '32px', textAlign: 'center' }}>№</th>
              <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>ФИО ученика</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '60px', textAlign: 'center' }}>Класс</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '80px', textAlign: 'center' }}>Статус</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '80px', textAlign: 'center' }}>Балл</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '130px', textAlign: 'center' }}>Уровень риска</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '90px', textAlign: 'center' }}>Дата сдачи</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st, idx) => {
              let riskColor = '#15803d';
              let riskBg = '#dcfce7';
              let riskText = 'Норма';

              if (st.risk_level === 'MEDIUM') {
                riskColor = '#b45309';
                riskBg = '#fef3c7';
                riskText = 'Умеренный';
              } else if (st.risk_level === 'HIGH') {
                riskColor = '#c2410c';
                riskBg = '#ffedd5';
                riskText = 'Высокий';
              } else if (st.risk_level === 'CRITICAL') {
                riskColor = '#b91c1c';
                riskBg = '#fee2e2';
                riskText = 'Критический';
              }

              return (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#64748b' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '7px 12px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#0f172a' }}>
                    {st.student_name}
                  </td>
                  <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    {st.class_id}
                  </td>
                  <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    {st.is_completed ? (
                      <span style={{ color: '#15803d', fontWeight: 700 }}>Сдал</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Не сдал</span>
                    )}
                  </td>
                  <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }}>
                    {st.is_completed ? `${st.total_score} б.` : '—'}
                  </td>
                  <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    {st.is_completed ? (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: riskColor,
                          backgroundColor: riskBg,
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {riskText}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
                    {st.completed_at
                      ? new Date(st.completed_at).toLocaleDateString('ru-RU')
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer / Signatures ──────────────────────────────────── */}
      <div
        style={{
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid #cbd5e1',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          fontSize: '11px',
          color: '#334155',
        }}
      >
        <div>
          <div>Председатель кафедры / Классный руководитель:</div>
          <div style={{ marginTop: '28px', borderBottom: '1px solid #0f172a', width: '220px' }}></div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '3px' }}>(подпись / расшифровка подписи)</div>
        </div>

        <div>
          <div>Педагог-психолог школы:</div>
          <div style={{ marginTop: '28px', borderBottom: '1px solid #0f172a', width: '220px' }}></div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '3px' }}>(подпись / расшифровка подписи)</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', marginTop: '24px' }}>
        Документ сформирован автоматически цифровой платформой психологической поддержки AISezim
      </div>
    </div>
  );
};
