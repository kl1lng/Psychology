'use client';

import React from 'react';
import type { RiskLevel, ScaleResult, QuestionResponse } from '@/types/test';
import {
  EYSENCK_QUESTIONS,
  calculateEysenckResults,
  getQuestionScale,
  KEYS,
} from '@/mocks/eysenck-demo';

export interface StudentIndividualReportProps {
  studentName: string;
  studentId?: string;
  classId: string;
  testId: string;
  testName: string;
  completedAt: string | null;
  totalScore?: number | string;
  riskLevel: RiskLevel;
  scales: ScaleResult[];
  questionResponses: QuestionResponse[];
  getQuestionText?: (testId: string, qId: number | string) => string;
}

export const StudentIndividualReport: React.FC<StudentIndividualReportProps> = ({
  studentName,
  studentId = 'default',
  classId,
  testId,
  testName,
  completedAt,
  totalScore,
  riskLevel,
  scales,
  questionResponses,
  getQuestionText,
}) => {
  const formattedDate = completedAt
    ? new Date(completedAt).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('ru-RU');

  // Clean test name to avoid duplicate abbreviations
  let cleanTestName = testName || 'Стандартизированная психодиагностика';
  cleanTestName = cleanTestName.replace(/\(EPI-A\)\s*\(EPI-A\)/gi, '(EPI-A)');
  cleanTestName = cleanTestName.replace(/\s+/g, ' ').trim();

  // Prepare full 57 answers dataset for Eysenck test
  const isEysenck = testId.toLowerCase().includes('eysenck');

  // Use provided responses or deterministic 57 responses
  let fullResponses: {
    questionId: number;
    text: string;
    scaleName: string;
    value: string;
    score: number;
  }[] = [];

  if (isEysenck) {
    fullResponses = EYSENCK_QUESTIONS.flatMap((q) => {
      const matchResp = questionResponses.find((r) => Number(r.questionId) === q.id);
      if (!matchResp) return [];
      const val = matchResp.selectedOption;
      const isKey = Object.values(KEYS).some((key) => (val === 'Да' ? key.yes : key.no).includes(q.id));
      const { scaleName } = getQuestionScale(q.id);

      return {
        questionId: q.id,
        text: q.text,
        scaleName,
        value: val,
        score: isKey ? 1 : 0,
      };
    });
  } else {
    fullResponses = questionResponses.map((qr, idx) => {
      const qNum = Number(qr.questionId) || idx + 1;
      const text = getQuestionText ? getQuestionText(testId, qNum) : `Вопрос #${qNum}`;
      return {
        questionId: qNum,
        text,
        scaleName: 'Диагностическая шкала',
        value: qr.selectedOption,
        score: qr.score,
      };
    });
  }

  // Calculate Eysenck summary (temperament & scores)
  const eysenckCalc = calculateEysenckResults(
    fullResponses.map((r) => ({ questionId: r.questionId, value: r.value }))
  );

  // Dynamic Risk Level Dictionary & Color Palette
  const rawRisk = String(riskLevel || 'LOW').trim();
  const upperRisk = rawRisk.toUpperCase();

  let riskText = 'НОРМА (НИЗКИЙ РИСК)';
  let riskColor = '#172033';
  let riskBg = '#ffffff';
  let riskBorder = '#94a3b8';

  if (
    upperRisk.includes('КРИТИЧ') ||
    upperRisk.includes('CRITICAL') ||
    upperRisk.includes('ОЧЕНЬ ВЫСОК')
  ) {
    riskColor = '#172033';
    riskBg = '#ffffff';
    riskBorder = '#94a3b8';
    riskText = 'КРИТИЧЕСКИЙ УРОВЕНЬ РИСКА';
  } else if (
    upperRisk.includes('ВЫСОК') ||
    upperRisk.includes('HIGH')
  ) {
    riskColor = '#172033';
    riskBg = '#ffffff';
    riskBorder = '#94a3b8';
    riskText = 'ВЫСОКИЙ УРОВЕНЬ РИСКА';
  } else if (
    upperRisk.includes('СРЕДН') ||
    upperRisk.includes('УМЕРЕН') ||
    upperRisk.includes('MEDIUM') ||
    upperRisk.includes('ВНИМАНИ')
  ) {
    riskColor = '#172033';
    riskBg = '#ffffff';
    riskBorder = '#94a3b8';
    riskText = 'УМЕРЕННЫЙ РИСК';
  } else if (
    upperRisk.includes('НИЗК') ||
    upperRisk.includes('НОРМ') ||
    upperRisk.includes('LOW')
  ) {
    riskColor = '#172033';
    riskBg = '#ffffff';
    riskBorder = '#94a3b8';
    riskText = 'НОРМА (НИЗКИЙ РИСК)';
  } else {
    riskColor = '#172033';
    riskBg = '#ffffff';
    riskBorder = '#94a3b8';
    riskText = rawRisk;
  }


  // Normalize scales if Eysenck test
  const normalizedScales = scales?.map((s) => {
    const nameStr = typeof s.scale_name === 'object' ? JSON.stringify(s.scale_name) : String(s.scale_name);
    const isLie = nameStr.toLowerCase().includes('лож') || nameStr.toLowerCase().includes('искренност');
    if (isLie && isEysenck) {
      const raw = typeof s.raw_score === 'number' ? s.raw_score : Number(s.raw_score) || eysenckCalc.lie;
      return {
        ...s,
        scale_name: 'Шкала лжи',
        raw_score: raw,
        max_score: 9,
        percentage: Math.round((raw / 9) * 100),
        interpretation: raw <= 4 ? 'Результаты достоверны' : 'Результаты сомнительны',
      };
    }
    return s;
  });

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

      {/* ── 1. Document Header with strictly aligned left and right blocks ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '16px',
          marginBottom: '20px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flex: 1, maxWidth: '65%' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>
            Школьная психологическая служба • Платформа AISezim
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            ИНДИВИДУАЛЬНЫЙ ПРОТОКОЛ ПСИХОДИАГНОСТИКИ
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
            Методика: <span style={{ fontWeight: 700, color: '#0f172a' }}>{cleanTestName}</span>
          </div>
        </div>

        <div style={{ flex: '0 0 auto', textAlign: 'right', fontSize: '10px', color: '#64748b', marginLeft: 'auto' }}>
          <div>Протокол №: <strong style={{ color: '#0f172a' }}>AIS-{(studentId || 'STD').slice(0, 6).toUpperCase()}</strong></div>
          <div style={{ marginTop: '2px' }}>Дата: <strong style={{ color: '#0f172a' }}>{formattedDate}</strong></div>
        </div>
      </div>

      {/* ── 2. Student Info Card ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '20px',
          pageBreakInside: 'avoid',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            ФИО Ученика
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {studentName}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Учебный класс
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            Класс {classId}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Итоговый показатель
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {isEysenck || totalScore === '-' || !totalScore ? '—' : (typeof totalScore === 'number' ? `${totalScore} баллов` : String(totalScore))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Уровень риска
          </div>
          <div
            style={{
              display: 'inline-block',
              verticalAlign: 'middle',
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              lineHeight: '20px',
              height: '20px',
              color: riskColor,
              backgroundColor: riskBg,
              padding: '0 8px',
              borderRadius: '6px',
              border: `1px solid ${riskBorder}`,
              outline: 'none',
              whiteSpace: 'nowrap',
              width: 'fit-content',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {riskText.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── 3. Temperament & Psychological Conclusion Card (Aligned with equal-width badges) ───────── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '20px',
          pageBreakInside: 'avoid',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
              ПСИХОЛОГИЧЕСКИЙ ТИП ПО СИСТЕМЕ АЙЗЕНКА
            </div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#172033', marginTop: '2px' }}>
              {eysenckCalc.temperament}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
            <div style={{ flex: '1 1 0', minWidth: '96px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '8px', textAlign: 'center', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '8px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Экстраверсия</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#172033', marginTop: '2px' }}>{eysenckCalc.extraversion} / 24</div>
            </div>
            <div style={{ flex: '1 1 0', minWidth: '96px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '8px', textAlign: 'center', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '8px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Нейротизм</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#172033', marginTop: '2px' }}>{eysenckCalc.neuroticism} / 24</div>
            </div>
            <div style={{ flex: '1 1 0', minWidth: '96px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '8px', textAlign: 'center', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '8px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Шкала лжи</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#172033', marginTop: '2px' }}>
                {eysenckCalc.lie} / 9
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.45' }}>
          {eysenckCalc.description}
        </div>
      </div>


      {/* ── 4. Diagnostic Scales Table with comfortable cell padding ───────────────────────────── */}
      {scales && scales.length > 0 && (
        <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f172a', marginBottom: '8px' }}>
            1. Результаты по диагностическим шкалам
          </div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10px',
              border: '1px solid #cbd5e1',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#ffffff', color: '#172033', textAlign: 'left', fontWeight: 700 }}>
                <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>Название шкалы</th>
                <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '70px', textAlign: 'center' }}>Процент</th>
                <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>Психологическая интерпретация</th>
              </tr>
            </thead>
            <tbody>
              {normalizedScales?.map((s, idx) => (
                <tr key={idx} style={{ backgroundColor: '#ffffff', pageBreakInside: 'avoid' }}>
                  <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', fontWeight: 700 }}>
                    {typeof s.scale_name === 'object' ? JSON.stringify(s.scale_name) : s.scale_name}
                  </td>
                  <td style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                    {s.percentage}%
                  </td>
                  <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', color: '#334155', lineHeight: '1.4' }}>
                    {typeof s.interpretation === 'object' ? JSON.stringify(s.interpretation) : s.interpretation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 5. Detailed Question Responses Table with generous padding ───────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0f172a', marginBottom: '8px' }}>
          2. Детализация ответов на вопросы ({fullResponses.length} вопросов)
        </div>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '9.5px',
            border: '1px solid #cbd5e1',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#ffffff', color: '#172033', textAlign: 'left', fontWeight: 800 }}>
              <th style={{ padding: '8px 8px', border: '1px solid #cbd5e1', width: '32px', textAlign: 'center' }}>№</th>
              <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>Текст диагностического вопроса</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '100px' }}>Шкала</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '90px', textAlign: 'center' }}>Выбор ученика</th>
              <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', width: '50px', textAlign: 'center' }}>Балл</th>
            </tr>
          </thead>
          <tbody>
            {fullResponses.map((r, idx) => (
              <tr
                key={r.questionId || idx}
                style={{
                  backgroundColor: '#ffffff',
                  pageBreakInside: 'avoid',
                }}
              >
                <td style={{ padding: '7px 8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                  {r.questionId}
                </td>
                <td style={{ padding: '7px 12px', border: '1px solid #cbd5e1', color: '#1e293b', lineHeight: '1.45' }}>
                  {r.text}
                </td>
                <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', color: '#64748b', fontSize: '9px', fontWeight: 600 }}>
                  {r.scaleName}
                </td>
                <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, color: '#172033' }}>
                  {r.value}
                </td>
                <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, color: '#172033' }}>
                  +{r.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 6. Signatures & Footer ───────────────────────────────── */}
      <div
        style={{
          marginTop: '28px',
          paddingTop: '16px',
          borderTop: '1px solid #cbd5e1',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          fontSize: '10px',
          color: '#334155',
          pageBreakInside: 'avoid',
        }}
      >
        <div>
          <div>Классный руководитель / Педагог:</div>
          <div style={{ marginTop: '24px', borderBottom: '1px solid #0f172a', width: '200px', height: '24px' }}></div>
          <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '3px' }}>(подпись / расшифровка подписи)</div>
        </div>

        <div>
          <div>Педагог-психолог школы:</div>
          <div style={{ marginTop: '24px', borderBottom: '1px solid #0f172a', width: '200px', height: '24px' }}></div>
          <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '3px' }}>(подпись / расшифровка подписи)</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '8.5px', color: '#94a3b8', marginTop: '20px', pageBreakInside: 'avoid' }}>
        Документ сформирован автоматически цифровой платформой психологической поддержки AISezim
      </div>
    </div>
  );
};
