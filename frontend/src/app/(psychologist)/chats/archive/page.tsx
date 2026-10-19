'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, MessageSquare, ArrowLeft, X } from 'lucide-react';
import { chatApi } from '@/lib/api';
import { ChatMessage, Dialog, DialogStatus } from '@/types/chat';
import { useLanguage } from '@/context/language-context';

type Filters = { from: string; to: string; student_id: string; status: string };

function formatOralTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Oral',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function ChatArchivePage() {
  const { lang } = useLanguage();
  const isKk = lang === 'kk';
  const [filters, setFilters] = useState<Filters>({ from: '', to: '', student_id: '', status: '' });
  const [applied, setApplied] = useState<Filters>(filters);
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [selected, setSelected] = useState<Dialog | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    chatApi.searchArchive({
      from: applied.from || undefined,
      to: applied.to || undefined,
      student_id: applied.student_id.trim() || undefined,
      status: applied.status || undefined,
      limit: 50,
      offset,
    }).then((response) => {
      if (active) {
        const nextPage = response.data || [];
        setDialogs((previous) => offset === 0 ? nextPage : [...previous, ...nextPage]);
        setHasMore(nextPage.length === 50);
      }
    }).catch(() => {
      if (active) {
        setDialogs([]);
        setError(true);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [applied, offset]);

  async function openDialog(dialog: Dialog) {
    setSelected({ ...dialog, messages: [] });
    try {
      const response = await chatApi.getHistory(dialog.id);
      setSelected({ ...dialog, messages: response.data?.messages || [] });
    } catch {
      setSelected({ ...dialog, messages: [] });
      setError(true);
    }
  }

  const statusLabel = (status: DialogStatus) => {
    const labels: Record<DialogStatus, string> = isKk
      ? { BOT: 'Бот', WAITING_PSYCHOLOGIST: 'Психологты күтуде', ACTIVE: 'Белсенді', CLOSED: 'Жабық' }
      : { BOT: 'Бот', WAITING_PSYCHOLOGIST: 'Ожидает психолога', ACTIVE: 'Активен', CLOSED: 'Закрыт' };
    return labels[status];
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/chats" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft size={16} /> {isKk ? 'Чаттарға оралу' : 'Вернуться к чатам'}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">{isKk ? 'Чаттар мұрағаты' : 'Архив переписок'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isKk ? 'Күні, оқушы ID немесе күйі бойынша іздеңіз' : 'Поиск по дате, ID ученика и статусу'}
          </p>
        </div>
      </div>

      <form className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5" onSubmit={(event) => { event.preventDefault(); setApplied({ ...filters }); }}>
        <label className="text-sm text-slate-600">
          {isKk ? 'Бастапқы күн' : 'С даты'}
          <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
        </label>
        <label className="text-sm text-slate-600">
          {isKk ? 'Соңғы күн' : 'По дату'}
          <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
        </label>
        <label className="text-sm text-slate-600">
          {isKk ? 'Оқушы ID' : 'ID ученика'}
          <input value={filters.student_id} onChange={(event) => setFilters({ ...filters, student_id: event.target.value })} placeholder={isKk ? 'ID енгізіңіз' : 'Введите ID'} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
        </label>
        <label className="text-sm text-slate-600">
          {isKk ? 'Күйі' : 'Статус'}
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
            <option value="">{isKk ? 'Барлық күй' : 'Все статусы'}</option>
            <option value="BOT">{statusLabel('BOT')}</option>
            <option value="WAITING_PSYCHOLOGIST">{statusLabel('WAITING_PSYCHOLOGIST')}</option>
            <option value="ACTIVE">{statusLabel('ACTIVE')}</option>
            <option value="CLOSED">{statusLabel('CLOSED')}</option>
          </select>
        </label>
        <button type="submit" className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700" onClick={() => setOffset(0)}>
          <Search size={16} /> {isKk ? 'Іздеу' : 'Найти'}
        </button>
      </form>

      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{isKk ? 'Архивті жүктеу мүмкін болмады. Қайталап көріңіз.' : 'Не удалось загрузить архив. Попробуйте ещё раз.'}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
            {loading ? (isKk ? 'Жүктелуде…' : 'Загрузка…') : `${isKk ? 'Табылды' : 'Найдено'}: ${dialogs.length}`}
          </div>
          {dialogs.length === 0 && !loading ? (
            <p className="p-6 text-sm text-slate-500">{isKk ? 'Сәйкес чаттар жоқ' : 'Переписки не найдены'}</p>
          ) : dialogs.map((dialog) => (
            <button key={dialog.id} onClick={() => openDialog(dialog)} className={`block w-full border-b border-slate-100 px-4 py-4 text-left hover:bg-slate-50 ${selected?.id === dialog.id ? 'bg-indigo-50' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-900">{dialog.student_name || dialog.student_id}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{statusLabel(dialog.status)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <MessageSquare size={14} /> {formatOralTime(dialog.updated_at || dialog.created_at, isKk ? 'kk-KZ' : 'ru-RU')}
              </div>
            </button>
          ))}
          {hasMore && <button onClick={() => setOffset((value) => value + 50)} disabled={loading} className="w-full px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50">
            {isKk ? 'Тағы жүктеу' : 'Загрузить ещё'}
          </button>}
        </section>

        <section className="min-h-80 rounded-2xl border border-slate-200 bg-white">
          {selected ? (
            <>
              <header className="flex items-start justify-between border-b border-slate-100 p-4">
                <div>
                  <h2 className="font-semibold text-slate-900">{selected.student_name || selected.student_id}</h2>
                  <p className="mt-1 text-xs text-slate-500">{formatOralTime(selected.created_at, isKk ? 'kk-KZ' : 'ru-RU')} · {statusLabel(selected.status)}</p>
                </div>
                <button onClick={() => setSelected(null)} aria-label={isKk ? 'Жабу' : 'Закрыть'} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
              </header>
              <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">
                {(selected.messages || []).map((message: ChatMessage) => (
                  <article key={message.id} className={`max-w-[90%] rounded-xl p-3 ${message.sender_role === 'PSYCHOLOGIST' ? 'ml-auto bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    <div className="mb-1 flex justify-between gap-4 text-[11px] opacity-70">
                      <span>{message.sender_role === 'STUDENT' ? (isKk ? 'Оқушы' : 'Ученик') : message.sender_role === 'PSYCHOLOGIST' ? (isKk ? 'Психолог' : 'Психолог') : 'AISezim'}</span>
                      <time>{formatOralTime(message.created_at, isKk ? 'kk-KZ' : 'ru-RU')}</time>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </article>
                ))}
                {(!selected.messages || selected.messages.length === 0) && <p className="text-sm text-slate-500">{isKk ? 'Хабарлар жоқ' : 'Сообщений нет'}</p>}
              </div>
            </>
          ) : <p className="p-8 text-sm text-slate-500">{isKk ? 'Толық жазбаны ашу үшін чатты таңдаңыз' : 'Выберите переписку, чтобы открыть полную историю'}</p>}
        </section>
      </div>
    </main>
  );
}
