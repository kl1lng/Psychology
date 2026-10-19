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
  isDemo?: boolean;
}

export const ClassSummaryReport: React.FC<ClassSummaryReportProps> = ({
  classNameString,
  testTitle,
  students,
  generatedAt,
  teacherDepartmentName,
  isDemo = false,
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
  const riskApplies = !/Климов|ДДО/.test(testTitle);
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
      {isDemo && <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700 }}>ДЕМОНСТРАЦИОННЫЙ ОТЧЁТ · Все данные вымышлены</p>}
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
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Учеников в выборке
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {total}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Сдали опрос
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {completed} ({total > 0 ? Math.round((completed / total) * 100) : 0}%)
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Норма
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {riskApplies ? lowRisk : '—'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Умеренный риск
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {riskApplies ? mediumRisk : '—'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Высокий / критический риск
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {riskApplies ? highCriticalRisk : '—'}
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
            tableLayout: 'fixed',
          }}
        >
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '32%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: '#ffffff', color: '#172033', textAlign: 'left', fontWeight: 700 }}>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '32px', textAlign: 'center' }}>№</th>
              <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>ФИО ученика</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '60px', textAlign: 'center' }}>Класс</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '80px', textAlign: 'center' }}>Статус</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '130px', textAlign: 'center' }}>Уровень риска</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '90px', textAlign: 'center' }}>Дата сдачи</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st, idx) => {
              let riskText = 'Норма';

              if (st.risk_level === 'MEDIUM') {
                riskText = 'Умеренный';
              } else if (st.risk_level === 'HIGH') {
                riskText = 'Высокий';
              } else if (st.risk_level === 'CRITICAL') {
                riskText = 'Критический';
              }

              return (
                <tr key={idx} style={{ backgroundColor: '#ffffff', verticalAlign: 'middle' }}>
                  <td style={{ padding: '9px 6px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#64748b', verticalAlign: 'middle' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '9px 10px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#0f172a', verticalAlign: 'middle', overflowWrap: 'anywhere' }}>
                    {st.student_name}
                  </td>
                  <td style={{ padding: '9px 6px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'middle' }}>
                    {st.class_id}
                  </td>
                  <td style={{ padding: '9px 6px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'middle' }}>
                    {st.is_completed ? (
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>Сдал</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Не сдал</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 6px', border: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'middle' }}>
                    {st.is_completed ? (
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{riskApplies ? riskText : 'Не оценивается'}</span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 6px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '10px', color: '#64748b', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
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
