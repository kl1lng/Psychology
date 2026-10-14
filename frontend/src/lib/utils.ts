import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RiskLevel } from '@/types/test';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskColor(risk: RiskLevel | undefined | null): string {
  if (!risk) return 'text-gray-400';
  const map: Record<RiskLevel, string> = {
    LOW:      'text-risk-low',
    MEDIUM:   'text-risk-medium',
    HIGH:     'text-risk-high',
    CRITICAL: 'text-risk-critical',
  };
  return map[risk] || 'text-gray-400';
}

export function getRiskBg(risk: RiskLevel | undefined | null): string {
  if (!risk) return 'bg-gray-500/10';
  const map: Record<RiskLevel, string> = {
    LOW:      'bg-risk-low/10 border-risk-low/30',
    MEDIUM:   'bg-risk-medium/10 border-risk-medium/30',
    HIGH:     'bg-risk-high/10 border-risk-high/30',
    CRITICAL: 'bg-risk-critical/10 border-risk-critical/30',
  };
  return map[risk] || 'bg-gray-500/10';
}

export function getRiskLabel(risk: RiskLevel | undefined | null, lang?: string): string {
  if (!risk) return '—';
  if (lang === 'kk') {
    const kkMap: Record<RiskLevel, string> = {
      LOW:      'Қалыпты (Төмен)',
      MEDIUM:   'Орташа қауіп',
      HIGH:     'Жоғары қауіп',
      CRITICAL: 'Қауіпті (Критикалық)',
    };
    return kkMap[risk] || risk;
  }
  const map: Record<RiskLevel, string> = {
    LOW:      'Низкий риск',
    MEDIUM:   'Средний риск',
    HIGH:     'Высокий риск',
    CRITICAL: 'Критический',
  };
  return map[risk] || risk;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '—';
  }
}

export function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

