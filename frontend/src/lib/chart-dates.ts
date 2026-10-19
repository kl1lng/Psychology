const KK_MONTHS_SHORT = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'];
const KK_MONTHS_FULL = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];

export function formatLocalizedChartDate(
  value: string | number | Date | undefined,
  localeOrLang: string = 'ru',
  options: { format?: 'short' | 'full' } = { format: 'short' }
): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const isKk = ['qaz', 'kk', 'kz', 'kk-KZ'].includes(localeOrLang);
  if (isKk) {
    const day = date.getDate();
    const month = date.getMonth();
    return options.format === 'full'
      ? `${day} ${KK_MONTHS_FULL[month]} ${date.getFullYear()} ж.`
      : `${day} ${KK_MONTHS_SHORT[month]}`;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}
