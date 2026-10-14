/**
 * Universal PDF Generator utility for AISezim Platform
 * Converts printable HTML elements and UniversalReportData into high-resolution A4 PDF documents.
 */

import { UniversalReportData } from '@/types/pdf-report';

export interface ExportPdfOptions {
  filename: string;
  marginMm?: number;
  scale?: number;
}

export async function exportElementToPdf(
  element: HTMLElement,
  options: ExportPdfOptions
): Promise<void> {
  const { filename, marginMm = 0, scale = 2 } = options;

  // Dynamically import html2canvas and jsPDF to ensure SSR compatibility
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  // Render canvas with high resolution scale
  const canvas = await html2canvas(element, {
    scale: scale, // 2x for Retina/Print DPI
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 850,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm

  const contentWidth = pageWidth - marginMm * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = marginMm;

  // First page
  pdf.addImage(
    imgData,
    'PNG',
    marginMm,
    position,
    contentWidth,
    imgHeight,
    undefined,
    'FAST'
  );
  heightLeft -= pageHeight;

  // Add subsequent pages if content overflows A4
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + marginMm;
    pdf.addPage();
    pdf.addImage(
      imgData,
      'PNG',
      marginMm,
      position,
      contentWidth,
      imgHeight,
      undefined,
      'FAST'
    );
    heightLeft -= pageHeight;
  }

  // Save the generated PDF
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export async function exportComponentToPdf(
  element: HTMLElement,
  filename: string,
  options?: Omit<ExportPdfOptions, 'filename'>
): Promise<void> {
  return exportElementToPdf(element, {
    filename,
    ...options,
  });
}

/**
 * Universal function to generate high-resolution PDF report for any psychological methodology
 */
export async function generatePdfReport(
  data: UniversalReportData,
  filename?: string
): Promise<void> {
  if (typeof window === 'undefined') return;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'Inter, Arial, sans-serif';
  container.style.padding = '36px 40px';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  // Dynamic Risk Level Dictionary & Color Palette
  const rawRisk = String(data.test.riskLevel || 'Норма (Низкий риск)').trim();
  const upperRisk = rawRisk.toUpperCase();

  let riskText = rawRisk;
  let riskColor = '#166534';  // Dark green
  let riskBg = '#E6F5EA';     // Light green
  let riskBorder = '#BBF7D0';

  if (
    upperRisk.includes('КРИТИЧ') ||
    upperRisk.includes('CRITICAL') ||
    upperRisk.includes('ОЧЕНЬ ВЫСОК')
  ) {
    riskColor = '#991B1B';   // Dark red
    riskBg = '#FEE2E2';      // Light red
    riskBorder = '#FECACA';
    if (upperRisk === 'CRITICAL') riskText = 'КРИТИЧЕСКИЙ УРОВЕНЬ РИСКА';
  } else if (
    upperRisk.includes('ВЫСОК') ||
    upperRisk.includes('HIGH')
  ) {
    riskColor = '#991B1B';   // Dark red
    riskBg = '#FEE2E2';      // Light red
    riskBorder = '#FECACA';
    if (upperRisk === 'HIGH') riskText = 'ВЫСОКИЙ УРОВЕНЬ РИСКА';
  } else if (
    upperRisk.includes('СРЕДН') ||
    upperRisk.includes('УМЕРЕН') ||
    upperRisk.includes('MEDIUM') ||
    upperRisk.includes('ВНИМАНИ')
  ) {
    riskColor = '#92400E';   // Dark amber
    riskBg = '#FEF3C7';      // Light yellow
    riskBorder = '#FDE68A';
    if (upperRisk === 'MEDIUM') riskText = 'УМЕРЕННЫЙ РИСК';
  } else if (
    upperRisk.includes('НИЗК') ||
    upperRisk.includes('НОРМ') ||
    upperRisk.includes('LOW')
  ) {
    riskColor = '#166534';   // Dark green
    riskBg = '#E6F5EA';      // Light green
    riskBorder = '#BBF7D0';
    if (upperRisk === 'LOW') riskText = 'НОРМА (НИЗКИЙ РИСК)';
  } else {
    riskColor = '#3F3F46';   // Neutral zinc
    riskBg = '#F4F4F5';      // Light zinc
    riskBorder = '#E4E4E7';
  }


  // Clean test name to avoid duplicate abbreviations
  let cleanTestName = data.test.name || 'Стандартизированная психодиагностика';
  cleanTestName = cleanTestName.replace(/\(EPI-A\)\s*\(EPI-A\)/gi, '(EPI-A)');
  cleanTestName = cleanTestName.replace(/\s+/g, ' ').trim();

  // Check if Eysenck scales exist
  const extraversionScale = data.scales.find((s) =>
    s.name.toLowerCase().includes('экстраверс')
  );
  const neuroticismScale = data.scales.find(
    (s) =>
      s.name.toLowerCase().includes('нейротизм') ||
      s.name.toLowerCase().includes('эмоциональн')
  );
  const lieScale = data.scales.find(
    (s) =>
      s.name.toLowerCase().includes('лжи') ||
      s.name.toLowerCase().includes('искренн')
  );

  const isEysenck = Boolean(extraversionScale && neuroticismScale);
  let temperamentTitle = '';
  let temperamentDesc = '';
  let eScore = 0;
  let nScore = 0;
  let lScore = 0;

  if (isEysenck) {
    eScore = Number(extraversionScale?.rawScore) || 0;
    nScore = Number(neuroticismScale?.rawScore) || 0;
    lScore = Number(lieScale?.rawScore) || 0;

    if (eScore > 12 && nScore > 12) {
      temperamentTitle = 'Холерик (Нестабильный экстраверт)';
      temperamentDesc =
        'Высокая активность, импульсивность, страстность, эмоциональная возбудимость и быстрая смена настроения.';
    } else if (eScore > 12 && nScore <= 12) {
      temperamentTitle = 'Сангвиник (Стабильный экстраверт)';
      temperamentDesc =
        'Общительность, оптимизм, высокая работоспособность, эмоциональная устойчивость и лидерские качества.';
    } else if (eScore <= 12 && nScore > 12) {
      temperamentTitle = 'Меланхолик (Нестабильный интроверт)';
      temperamentDesc =
        'Высокая чувствительность, глубокие переживания, склонность к самоанализу, замкнутость и быстрая утомляемость.';
    } else {
      temperamentTitle = 'Флегматик (Стабильный интроверт)';
      temperamentDesc =
        'Спокойствие, невозмутимость, методичность, высокий самоконтроль и устойчивость к стрессам.';
    }
  }

  // Normalize scales for consistency

  const normalizedScales = data.scales.map((s) => {
    const isLie =
      s.name.toLowerCase().includes('лож') ||
      s.name.toLowerCase().includes('искренност');
    if (isLie && isEysenck) {
      const raw = typeof s.rawScore === 'number' ? s.rawScore : Number(s.rawScore) || 0;
      return {
        ...s,
        name: 'Шкала лжи',
        rawScore: raw,
        maxScore: 9,
        percentage: Math.round((raw / 9) * 100),
        interpretation: raw <= 4 ? 'Результаты достоверны' : 'Результаты сомнительны',
      };
    }
    return s;
  });

  const hasPointsColumn = data.answers.some(
    (a) => a.points !== undefined && a.points !== ''
  );


  container.innerHTML = `
    <!-- Header with strictly aligned left and right sides -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; border-bottom:2px solid #0f172a; padding-bottom:16px; margin-bottom:20px; box-sizing:border-box;">
      <div style="flex:1; max-width:65%;">
        <div style="font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#64748b;">
          Школьная психологическая служба • Платформа AISezim
        </div>
        <div style="font-size:18px; font-weight:800; color:#0f172a; margin-top:4px;">
          ИНДИВИДУАЛЬНЫЙ ПРОТОКОЛ ПСИХОДИАГНОСТИКИ
        </div>
        <div style="font-size:12px; color:#475569; margin-top:2px;">
          Методика: <span style="font-weight:700; color:#0f172a;">${cleanTestName}</span>
        </div>
      </div>
      <div style="flex:0 0 auto; text-align:right; font-size:10px; color:#64748b; margin-left:auto;">
        <div>Протокол №: <strong style="color:#0f172a;">AIS-${Math.random().toString(36).substring(2, 8).toUpperCase()}</strong></div>
        <div style="margin-top:2px;">Дата: <strong style="color:#0f172a;">${data.test.date || new Date().toLocaleDateString('ru-RU')}</strong></div>
      </div>
    </div>

    <!-- Student Info Card -->
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; background-color:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px 16px; margin-bottom:20px; page-break-inside:avoid; box-sizing:border-box;">
      <div>
        <div style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase;">ФИО Ученика</div>
        <div style="font-size:13px; font-weight:800; color:#0f172a; margin-top:2px;">${data.student.fullName}</div>
      </div>
      <div>
        <div style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase;">Учебный класс</div>
        <div style="font-size:13px; font-weight:800; color:#0f172a; margin-top:2px;">${data.student.className}</div>
      </div>
      <div>
        <div style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase;">Итоговый показатель</div>
        <div style="font-size:13px; font-weight:800; color:#0f172a; margin-top:2px;">${data.test.totalScore && data.test.totalScore !== '-' ? String(data.test.totalScore) : '—'}</div>
      </div>
      <div>
        <div style="font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">
          Уровень риска
        </div>
        <div style="display:inline-block; vertical-align:middle; text-align:center; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.3px; line-height:20px; height:20px; color:${riskColor}; background-color:${riskBg}; padding:0 8px; border-radius:6px; border:none; outline:none; white-space:nowrap; width:fit-content; max-width:100%; box-sizing:border-box;">
          ${riskText.toUpperCase()}
        </div>
      </div>
    </div>

    <!-- Eysenck Temperament Conclusion Card (Aligned & synced with data.scales) -->
    ${
      isEysenck
        ? `
      <div style="background-color:#faf5ff; border:1px solid #e9d5ff; border-radius:12px; padding:14px 16px; margin-bottom:20px; page-break-inside:avoid; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:16px;">
          <div style="flex:1;">
            <div style="font-size:9px; font-weight:800; text-transform:uppercase; color:#7e22ce; letter-spacing:0.5px;">
              ПСИХОЛОГИЧЕСКИЙ ТИП ПО СИСТЕМЕ АЙЗЕНКА
            </div>
            <div style="font-size:15px; font-weight:900; color:#581c87; margin-top:2px;">
              ${temperamentTitle}
            </div>
          </div>
          <div style="display:flex; gap:10px; align-items:stretch;">
            <div style="flex:1 1 0; min-width:96px; background-color:#ffffff; border:1px solid #d8b4fe; padding:6px 8px; border-radius:8px; text-align:center; box-sizing:border-box;">
              <div style="font-size:8px; color:#6b21a8; font-weight:700; text-transform:uppercase;">Экстраверсия</div>
              <div style="font-size:12px; font-weight:800; color:#1d4ed8; margin-top:2px;">${eScore} / 24</div>
            </div>
            <div style="flex:1 1 0; min-width:96px; background-color:#ffffff; border:1px solid #d8b4fe; padding:6px 8px; border-radius:8px; text-align:center; box-sizing:border-box;">
              <div style="font-size:8px; color:#6b21a8; font-weight:700; text-transform:uppercase;">Нейротизм</div>
              <div style="font-size:12px; font-weight:800; color:#b45309; margin-top:2px;">${nScore} / 24</div>
            </div>
            <div style="flex:1 1 0; min-width:96px; background-color:#ffffff; border:1px solid #d8b4fe; padding:6px 8px; border-radius:8px; text-align:center; box-sizing:border-box;">
              <div style="font-size:8px; color:#6b21a8; font-weight:700; text-transform:uppercase;">Шкала лжи</div>
              <div style="font-size:12px; font-weight:800; color:${lScore > 4 ? '#b91c1c' : '#15803d'}; margin-top:2px;">${lScore} / 9</div>
            </div>
          </div>
        </div>

        <div style="font-size:11px; color:#475569; line-height:1.45;">
          ${temperamentDesc}
        </div>
      </div>
    `
        : ''
    }

    <!-- Scales Section (Dynamic, with generous cell padding) -->
    ${
      normalizedScales && normalizedScales.length > 0
        ? `
      <div style="margin-bottom:20px; page-break-inside:avoid;">
        <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#0f172a; margin-bottom:8px;">
          1. РЕЗУЛЬТАТЫ ПО ДИАГНОСТИЧЕСКИМ ШКАЛАМ
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:10px; border:1px solid #cbd5e1;">
          <thead>
            <tr style="background-color:#f1f5f9; color:#334155; text-align:left; font-weight:700;">
              <th style="padding:8px 12px; border:1px solid #cbd5e1;">Название шкалы</th>
              <th style="padding:8px 10px; border:1px solid #cbd5e1; width:90px; text-align:center;">Сырой балл</th>
              <th style="padding:8px 10px; border:1px solid #cbd5e1; width:70px; text-align:center;">Процент</th>
              <th style="padding:8px 12px; border:1px solid #cbd5e1;">Психологическая интерпретация</th>
            </tr>
          </thead>
          <tbody>
            ${normalizedScales
              .map(
                (s, idx) => `
              <tr style="background-color:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; page-break-inside:avoid;">
                <td style="padding:8px 12px; border:1px solid #cbd5e1; font-weight:700;">${s.name}</td>
                <td style="padding:8px 10px; border:1px solid #cbd5e1; font-weight:800; text-align:center;">${s.rawScore} из ${s.maxScore}</td>
                <td style="padding:8px 10px; border:1px solid #cbd5e1; text-align:center;">${s.percentage !== undefined ? `${s.percentage}%` : '—'}</td>
                <td style="padding:8px 12px; border:1px solid #cbd5e1; color:#334155; line-height:1.4;">${s.interpretation}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
        : ''
    }

    <!-- Answers Section (Dynamic, supports any question count with comfortable padding) -->
    <div style="margin-bottom:24px;">
      <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:#0f172a; margin-bottom:8px;">
        2. ДЕТАЛИЗАЦИЯ ОТВЕТОВ НА ВОПРОСЫ (${data.answers.length} ОТВЕТОВ)
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:9.5px; border:1px solid #cbd5e1;">
        <thead>
          <tr style="background-color:#f1f5f9; color:#334155; text-align:left; font-weight:800;">
            <th style="padding:8px 8px; border:1px solid #cbd5e1; width:32px; text-align:center;">№</th>
            <th style="padding:8px 12px; border:1px solid #cbd5e1;">Текст диагностического вопроса</th>
            <th style="padding:8px 10px; border:1px solid #cbd5e1; width:95px; text-align:center;">Выбор ученика</th>
            ${
              hasPointsColumn
                ? `<th style="padding:8px 10px; border:1px solid #cbd5e1; width:50px; text-align:center;">Балл</th>`
                : ''
            }
          </tr>
        </thead>
        <tbody>
          ${data.answers
            .map(
              (a, idx) => `
            <tr style="background-color:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; page-break-inside:avoid;">
              <td style="padding:7px 8px; border:1px solid #cbd5e1; text-align:center; font-weight:700; color:#475569;">
                ${a.number || idx + 1}
              </td>
              <td style="padding:7px 12px; border:1px solid #cbd5e1; color:#1e293b; line-height:1.45;">
                ${a.questionText}
              </td>
              <td style="padding:7px 10px; border:1px solid #cbd5e1; text-align:center; font-weight:800; color:${a.studentAnswer === 'Да' ? '#15803d' : '#475569'};">
                ${a.studentAnswer}
              </td>
              ${
                hasPointsColumn
                  ? `<td style="padding:7px 10px; border:1px solid #cbd5e1; text-align:center; font-weight:700; color:${Number(a.points) > 0 ? '#15803d' : '#94a3b8'};">
                      ${a.points !== undefined && a.points !== '' ? (typeof a.points === 'number' && a.points > 0 ? `+${a.points}` : a.points) : '—'}
                    </td>`
                  : ''
              }
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Signatures & Footer -->
    <div style="margin-top:28px; padding-top:16px; border-top:1px solid #cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:24px; font-size:10px; color:#334155; page-break-inside:avoid;">
      <div>
        <div>Классный руководитель / Педагог:</div>
        <div style="margin-top:24px; border-bottom:1px solid #0f172a; width:200px; height:24px;"></div>
        <div style="font-size:8px; color:#94a3b8; margin-top:3px;">(подпись / расшифровка подписи)</div>
      </div>
      <div>
        <div>Педагог-психолог школы:</div>
        <div style="margin-top:24px; border-bottom:1px solid #0f172a; width:200px; height:24px;"></div>
        <div style="font-size:8px; color:#94a3b8; margin-top:3px;">(подпись / расшифровка подписи)</div>
      </div>
    </div>

    <div style="text-align:center; font-size:8.5px; color:#94a3b8; margin-top:20px; page-break-inside:avoid;">
      Документ сформирован автоматически цифровой платформой психологической поддержки AISezim
    </div>
  `;

  document.body.appendChild(container);

  try {
    const cleanStudent = data.student.fullName.replace(/\s+/g, '_');
    const cleanTest = cleanTestName.replace(/[^\w\u0400-\u04FF]/gi, '_');
    const targetFilename = filename || `Заключение_${cleanStudent}_${cleanTest}.pdf`;

    await exportElementToPdf(container, {
      filename: targetFilename,
    });
  } finally {
    document.body.removeChild(container);
  }
}
