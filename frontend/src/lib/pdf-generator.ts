import type { UniversalReportData } from '@/types/pdf-report';

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
  await document.fonts?.ready;
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 850,
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const contentWidth = 210 - marginMm * 2;
  const pageHeight = 297 - marginMm * 2;
  const bounds = element.getBoundingClientRect();
  const pixelRatio = canvas.width / bounds.width;
  const rows = Array.from(element.querySelectorAll('tr')).map((row) => {
    const rect = row.getBoundingClientRect();
    return { top: Math.round((rect.top - bounds.top) * pixelRatio), bottom: Math.round((rect.bottom - bounds.top) * pixelRatio) };
  });
  const headers = Array.from(element.querySelectorAll('table')).flatMap((table) => {
    const header = table.querySelector('thead');
    if (!header) return [];
    const rect = header.getBoundingClientRect();
    return [{ top: Math.round((rect.top - bounds.top) * pixelRatio),
      bottom: Math.round((rect.bottom - bounds.top) * pixelRatio),
      tableBottom: Math.round((table.getBoundingClientRect().bottom - bounds.top) * pixelRatio) }];
  });
  const capacity = Math.floor(pageHeight / contentWidth * canvas.width);
  let sourceY = 0;
  while (sourceY < canvas.height) {
    if (sourceY > 0) pdf.addPage();
    const repeatedHeader = sourceY > 0 ? headers.find((header) => sourceY >= header.bottom && sourceY < header.tableBottom) : undefined;
    const headerHeight = repeatedHeader ? repeatedHeader.bottom - repeatedHeader.top : 0;
    let end = Math.min(sourceY + capacity - headerHeight, canvas.height);
    const crossingRow = rows.find((row) => row.top < end && row.bottom > end);
    if (crossingRow) {
      if (crossingRow.top <= sourceY) throw new Error('Строка таблицы не помещается на странице отчёта.');
      end = crossingRow.top;
    }
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = end - sourceY + headerHeight;
    const context = pageCanvas.getContext('2d');
    if (!context) throw new Error('Не удалось подготовить страницу PDF');
    if (repeatedHeader) context.drawImage(canvas, 0, repeatedHeader.top, canvas.width, headerHeight, 0, 0, canvas.width, headerHeight);
    context.drawImage(canvas, 0, sourceY, canvas.width, end - sourceY, 0, headerHeight, canvas.width, end - sourceY);
    const pageImageHeight = (pageCanvas.height * contentWidth) / canvas.width;
    pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', marginMm, marginMm, contentWidth, pageImageHeight, undefined, 'FAST');
    sourceY = end;
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export async function exportComponentToPdf(
  element: HTMLElement,
  filename: string,
  options?: Omit<ExportPdfOptions, 'filename'>
): Promise<void> {
  return exportElementToPdf(element, { filename, ...options });
}

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const ANSWERS_PER_PAGE = 15;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRiskStyle(value: string) {
  const risk = value.toLocaleUpperCase('ru-RU');
  if (risk.includes('КРИТИЧ') || risk.includes('CRITICAL')) {
    return { label: 'Критический риск', foreground: '#172033', background: '#ffffff', border: '#64748b' };
  }
  if (risk.includes('ВЫСОК') || risk.includes('HIGH')) {
    return { label: 'Высокий риск', foreground: '#172033', background: '#ffffff', border: '#64748b' };
  }
  if (risk.includes('СРЕДН') || risk.includes('УМЕРЕН') || risk.includes('MEDIUM') || risk.includes('ВНИМАНИ')) {
    return { label: 'Умеренный риск', foreground: '#172033', background: '#ffffff', border: '#64748b' };
  }
  if (risk.includes('НИЗК') || risk.includes('НОРМ') || risk.includes('LOW')) {
    return { label: 'Низкий риск', foreground: '#172033', background: '#ffffff', border: '#64748b' };
  }
  return { label: value || 'Не определён', foreground: '#172033', background: '#ffffff', border: '#94a3b8' };
}

function getTemperament(extraversion: number, neuroticism: number) {
  if (extraversion > 12 && neuroticism > 12) {
    return { title: 'Холерик', detail: 'Активность и высокая эмоциональная реактивность.' };
  }
  if (extraversion > 12) {
    return { title: 'Сангвиник', detail: 'Общительность, активность и эмоциональная устойчивость.' };
  }
  if (neuroticism > 12) {
    return { title: 'Меланхолик', detail: 'Чувствительность и склонность глубоко переживать события.' };
  }
  return { title: 'Флегматик', detail: 'Спокойствие, устойчивость и последовательность.' };
}

function reportPage(content: string, pageNumber: number, totalPages: number, extraClass = ''): string {
  return `
    <section class="report-page ${extraClass}" style="width:${PAGE_WIDTH}px;height:${PAGE_HEIGHT}px">
      <div class="report-content">${content}</div>
      <footer class="report-footer">
        <span>AISezim · Психологическая служба · Конфиденциально</span>
        <span>Страница ${pageNumber} из ${totalPages}</span>
      </footer>
    </section>`;
}

function reportStyles(): string {
  return `
    * { box-sizing: border-box; }
    .report-page { position: relative; flex: none; overflow: hidden; background: #fff; color: #172033; font-family: Arial, sans-serif; }
    .report-content { height: 100%; padding: 48px 54px 82px; }
    .report-topline { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #dbe3ee; padding-bottom:14px; color:#64748b; font-size:11px; letter-spacing:.8px; text-transform:uppercase; }
    .brand { color:#4f46e5; font-weight:800; letter-spacing:1.2px; }
    .doc-title { margin:25px 0 5px; color:#111827; font-size:25px; line-height:1.2; font-weight:800; }
    .doc-subtitle { margin:0; color:#64748b; font-size:13px; line-height:1.5; }
    .section-title { margin:25px 0 10px; color:#334155; font-size:12px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; }
    .identity { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:10px; margin-top:22px; }
    .identity-card { min-height:70px; padding:13px 15px; border:1px solid #cbd5e1; border-radius:10px; background:#fff; }
    .label { margin-bottom:6px; color:#64748b; font-size:9px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; }
    .value { color:#111827; font-size:14px; line-height:1.35; font-weight:700; overflow-wrap:anywhere; }
    .risk-card { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:12px; padding:13px 15px; border:1px solid #dbe3ee; border-radius:10px; background:#fff; }
    .risk-label { color:#172033; font-size:11px; line-height:1.4; font-weight:800; white-space:nowrap; }
    .score-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:18px; }
    .score-card { padding:14px; border:1px solid #cbd5e1; border-radius:10px; background:#fff; }
    .score-card .value { color:#172033; font-size:18px; }
    .temperament { margin-top:14px; padding:16px 18px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; }
    .temperament strong { display:block; margin-bottom:4px; color:#172033; font-size:16px; }
    .temperament span { color:#475569; font-size:12px; line-height:1.5; }
    table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:10px; }
    thead { display:table-header-group; }
    th { padding:10px 9px; border:1px solid #cbd5e1; background:#eef2f7; color:#172033; text-align:left; font-size:9px; line-height:1.25; font-weight:800; vertical-align:middle; }
    td { padding:9px; border:1px solid #dbe3ee; color:#334155; line-height:1.4; vertical-align:middle; overflow-wrap:anywhere; }
    tbody tr:nth-child(odd) { background:#fff; }
    tbody tr:nth-child(even) { background:#f8fafc; }
    .center { text-align:center; }
    .answer { display:inline-flex; min-width:54px; height:24px; align-items:center; justify-content:center; border-radius:6px; background:#ecfdf5; color:#047857; font-weight:800; line-height:1; white-space:nowrap; }
    .answer.no { background:#f1f5f9; color:#475569; }
    .answer.long { display:block; min-width:0; height:auto; white-space:normal; text-align:left; background:transparent; color:#334155; font-weight:400; line-height:1.4; }
    .muted { color:#64748b; }
    .info-note { margin-top:18px; padding:12px 14px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#475569; font-size:10px; line-height:1.5; }
    .report-footer { position:absolute; right:54px; bottom:32px; left:54px; display:flex; justify-content:space-between; gap:20px; border-top:1px solid #e2e8f0; padding-top:10px; color:#94a3b8; font-size:9px; }
    .answers-heading { margin:24px 0 5px; color:#111827; font-size:21px; font-weight:800; }
    .answers-caption { margin-bottom:16px; color:#64748b; font-size:11px; }
  `.replace(/([^{}]+)\{/g, (_rule, selectors: string) =>
    selectors.split(',').map((selector) => `.pdf-report-root ${selector.trim()}`).join(', ') + ' {');
}

export async function generatePdfReport(data: UniversalReportData, filename?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const studentName = escapeHtml(data.student.fullName || 'Ученик');
  const className = escapeHtml(data.student.className || '—');
  const testName = escapeHtml(data.test.name || 'Психологический опрос');
  const reportDate = escapeHtml(data.test.date || new Date().toLocaleDateString('ru-RU'));
  const risk = getRiskStyle(String(data.test.riskLevel || 'LOW'));
  const hasEysenck = data.scales.some((scale) => scale.name.toLocaleLowerCase('ru-RU').includes('экстраверс'))
    && data.scales.some((scale) => scale.name.toLocaleLowerCase('ru-RU').includes('нейротизм'));
  const extraversion = data.scales.find((scale) => scale.name.toLocaleLowerCase('ru-RU').includes('экстраверс'));
  const neuroticism = data.scales.find((scale) => scale.name.toLocaleLowerCase('ru-RU').includes('нейротизм'));
  const lie = data.scales.find((scale) => /лжи|искренност/i.test(scale.name));
  const temperament = hasEysenck
    ? getTemperament(Number(extraversion?.rawScore) || 0, Number(neuroticism?.rawScore) || 0)
    : null;
  const answerPages: typeof data.answers[] = [];
  for (let index = 0; index < data.answers.length; index += ANSWERS_PER_PAGE) {
    answerPages.push(data.answers.slice(index, index + ANSWERS_PER_PAGE));
  }

  const scaleRows = data.scales.map((scale) => `
    <tr>
      <td><strong>${escapeHtml(scale.name)}</strong></td>
      <td class="center">${scale.percentage === undefined ? '—' : `${escapeHtml(scale.percentage)}%`}</td>
      <td>${escapeHtml(scale.interpretation || '—')}</td>
    </tr>`).join('');

  const totalPages = answerPages.length + 1;
  const overview = `
    <div class="report-topline"><span class="brand">AISezim</span><span>Психологическая служба · Протокол обследования</span></div>
    <h1 class="doc-title">Индивидуальный отчёт</h1>
    <p class="doc-subtitle">${testName}${data.isDemo ? ' · Демонстрационный отчёт: данные вымышлены' : ''}</p>
    <div class="identity">
      <div class="identity-card"><div class="label">Ученик</div><div class="value">${studentName}</div></div>
      <div class="identity-card"><div class="label">Класс</div><div class="value">${className}</div></div>
      <div class="identity-card"><div class="label">Дата прохождения</div><div class="value">${reportDate}</div></div>
      <div class="identity-card"><div class="label">Итоговый балл</div><div class="value">${escapeHtml(data.test.totalScore && data.test.totalScore !== '-' ? data.test.totalScore : '—')}</div></div>
    </div>
    <div class="risk-card">
      <div><div class="label">Уровень риска по результатам методики</div><div class="muted" style="font-size:11px">Показатель для внимания специалиста</div></div>
      <span class="risk-label">${escapeHtml(risk.label)}</span>
    </div>
    ${temperament ? `
      <div class="score-grid">
        <div class="score-card"><div class="label">Экстраверсия</div><div class="value">${escapeHtml(extraversion?.rawScore)} <span class="muted" style="font-size:11px">/ ${escapeHtml(extraversion?.maxScore)}</span></div></div>
        <div class="score-card"><div class="label">Нейротизм</div><div class="value">${escapeHtml(neuroticism?.rawScore)} <span class="muted" style="font-size:11px">/ ${escapeHtml(neuroticism?.maxScore)}</span></div></div>
        <div class="score-card"><div class="label">Шкала искренности</div><div class="value">${escapeHtml(lie?.rawScore ?? '—')} <span class="muted" style="font-size:11px">/ ${escapeHtml(lie?.maxScore ?? 9)}</span></div></div>
      </div>
      <div class="temperament"><strong>${escapeHtml(temperament.title)}</strong><span>${escapeHtml(temperament.detail)}</span></div>
    ` : ''}
    ${scaleRows ? `<h2 class="section-title">Результаты по шкалам</h2>
      <table><colgroup><col style="width:30%"><col style="width:14%"><col style="width:56%"></colgroup>
        <thead><tr><th>Шкала</th><th class="center">Доля</th><th>Интерпретация результата</th></tr></thead>
        <tbody>${scaleRows}</tbody>
      </table>` : ''}
    <div class="info-note">Ответов в протоколе: <strong>${data.answers.length}</strong>. Подробная таблица ответов приведена на следующих страницах. Итоговую интерпретацию результатов выполняет педагог-психолог с учётом беседы и контекста ученика.</div>`;

  const pages = [reportPage(overview, 1, totalPages, 'overview-page')];
  for (const [pageIndex, answers] of answerPages.entries()) {
    const start = pageIndex * ANSWERS_PER_PAGE + 1;
    const end = start + answers.length - 1;
    const rows = answers.map((answer, index) => {
      const answerText = String(answer.studentAnswer ?? '—');
      const isYes = answerText.toLocaleLowerCase('ru-RU') === 'да';
      return `<tr>
        <td class="center muted">${escapeHtml(answer.number || start + index)}</td>
        <td>${escapeHtml(answer.questionText || `Вопрос ${start + index}`)}</td>
        <td class="muted">${escapeHtml(answer.scaleName || '—')}</td>
        <td class="center"><span class="answer ${answerText.length > 12 ? 'long' : isYes ? '' : 'no'}">${escapeHtml(answerText)}</span></td>
      </tr>`;
    }).join('');
    const hasLongAnswers = answers.some((answer) => String(answer.studentAnswer).length > 12);
    const columns = hasLongAnswers
      ? '<colgroup><col style="width:7%"><col style="width:35%"><col style="width:25%"><col style="width:33%"></colgroup>'
      : '<colgroup><col style="width:7%"><col style="width:61%"><col style="width:18%"><col style="width:14%"></colgroup>';
    const answerContent = `
      <div class="report-topline"><span class="brand">AISezim</span><span>${studentName} · ${className}</span></div>
      <h2 class="answers-heading">Ответы на вопросы</h2>
      <div class="answers-caption">${testName} · вопросы ${start}–${end} из ${data.answers.length}${data.isDemo ? ' · Данные вымышлены' : ''}</div>
      <table>${columns}
        <thead><tr><th class="center">№</th><th>Вопрос</th><th>Шкала</th><th class="center">Ответ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    pages.push(reportPage(answerContent, pageIndex + 2, totalPages, 'answers-page'));
  }

  const root = document.createElement('div');
  root.className = 'pdf-report-root';
  root.setAttribute('aria-hidden', 'true');
  root.style.cssText = `position:fixed;left:-${PAGE_WIDTH + 20}px;top:0;z-index:-1;width:${PAGE_WIDTH}px;pointer-events:none;`;
  root.innerHTML = `<style>${reportStyles()}</style>${pages.join('')}`;
  document.body.appendChild(root);

  try {
    await document.fonts?.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    // Measure the real wrapped rows instead of cutting an arbitrary number of pixels.
    const answerElements = Array.from(root.querySelectorAll<HTMLElement>('.answers-page'));
    for (let index = 0; index < answerElements.length; index++) {
      const page = answerElements[index];
      const table = page.querySelector('table')!;
      const body = table.querySelector('tbody')!;
      const footer = page.querySelector('footer')!;
      while (table.getBoundingClientRect().bottom > footer.getBoundingClientRect().top - 14) {
        if (body.rows.length <= 1) throw new Error('Ответ слишком длинный для страницы отчёта. Сократите текст и повторите экспорт.');
        let next = answerElements[index + 1];
        if (!next) {
          next = page.cloneNode(true) as HTMLElement;
          next.querySelector('tbody')!.replaceChildren();
          root.appendChild(next);
          answerElements.push(next);
        }
        next.querySelector('tbody')!.prepend(body.lastElementChild!);
      }
    }
    const pageElements = Array.from(root.querySelectorAll<HTMLElement>('.report-page'));
    for (const [index, page] of pageElements.entries()) {
      page.querySelector('footer span:last-child')!.textContent = `Страница ${index + 1} из ${pageElements.length}`;
      if (page.classList.contains('answers-page')) {
        const rows = page.querySelectorAll('tbody tr');
        const first = rows[0]?.firstElementChild?.textContent;
        const last = rows[rows.length - 1]?.firstElementChild?.textContent;
        page.querySelector('.answers-caption')!.textContent = `${data.test.name} · вопросы ${first}–${last} из ${data.answers.length}${data.isDemo ? ' · Данные вымышлены' : ''}`;
      }
    }
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    for (const [index, pageElement] of pageElements.entries()) {
      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: PAGE_WIDTH,
        windowHeight: PAGE_HEIGHT,
      });
      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const safeStudent = data.student.fullName.trim().replace(/[^A-Za-z0-9\u0400-\u04FF_-]+/g, '_');
    const safeTest = (data.test.name || 'опрос').trim().replace(/[^A-Za-z0-9\u0400-\u04FF_-]+/g, '_');
    pdf.save(filename || `Отчёт_${safeStudent}_${safeTest}.pdf`);
  } finally {
    root.remove();
  }
}
