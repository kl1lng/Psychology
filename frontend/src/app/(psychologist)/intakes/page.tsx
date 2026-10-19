'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, RefreshCw, UserRound, CircleAlert } from 'lucide-react';
import { intakesApi } from '@/lib/api';
import { useLanguage } from '@/context/language-context';

type Student = { id: string; full_name: string; class_id?: string };
type Intake = { id: string; student_id: string; curator_name: string; paper_signed: boolean; signed_at?: string; note?: string; created_at: string; users?: { full_name?: string; class_id?: string } };

export default function IntakeRegisterPage() {
  const { lang } = useLanguage();
  const kk = lang === 'kk';
  const [students, setStudents] = useState<Student[]>([]);
  const [items, setItems] = useState<Intake[]>([]);
  const [studentId, setStudentId] = useState('');
  const [curator, setCurator] = useState('');
  const [note, setNote] = useState('');
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, itemsRes] = await Promise.all([intakesApi.students(), intakesApi.list()]);
      setStudents(studentsRes.data || []);
      setItems(itemsRes.data || []);
      setError('');
    } catch {
      setError(kk ? 'Журнал жүктелмеді. Дерекқор сызбасын тексеріңіз.' : 'Журнал не загрузился. Проверьте схему базы данных.');
    } finally { setLoading(false); }
  }, [kk]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!studentId || curator.trim().length < 2) return;
    setSaving(true); setError('');
    try {
      await intakesApi.create({ student_id: studentId, curator_name: curator.trim(), paper_signed: signed, note: note.trim() || undefined });
      setCurator(''); setNote(''); setSigned(false); setStudentId('');
      await refresh();
    } catch { setError(kk ? 'Жазбаны сақтау мүмкін болмады.' : 'Не удалось сохранить запись.'); }
    finally { setSaving(false); }
  }

  async function toggleSignature(item: Intake) {
    try { await intakesApi.setPaperSignature(item.id, !item.paper_signed); await refresh(); }
    catch { setError(kk ? 'Қолтаңба күйін жаңарту мүмкін болмады.' : 'Не удалось обновить отметку о подписи.'); }
  }

  const unsignedCount = items.filter((item) => !item.paper_signed).length;
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <header className="flex items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{kk ? 'Оқушыны қабылдау журналы' : 'Журнал приёма учеников'}</h1>
        <p className="mt-1 text-sm text-gray-500">{kk ? 'Куратордың қағаздағы қолтаңбасын бақылау' : 'Контроль бумажной подписи куратора о сопровождении ученика'}</p></div>
      <button onClick={() => void refresh()} className="btn-secondary flex items-center gap-2"><RefreshCw size={16}/>{kk ? 'Жаңарту' : 'Обновить'}</button>
    </header>
    {unsignedCount > 0 && <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><CircleAlert size={20}/><span>{kk ? `Қағаз қолтаңбасы жоқ жазбалар: ${unsignedCount}` : `Напоминание: нет отметки о бумажной подписи в записях: ${unsignedCount}`}</span></div>}
    {error && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-800">{error}</div>}
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-2">
      <label className="space-y-1 text-sm font-medium">{kk ? 'Оқушы' : 'Ученик'}
        <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-transparent p-3 dark:border-neutral-700"><option value="">{kk ? 'Оқушыны таңдаңыз' : 'Выберите ученика'}</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name}{s.class_id ? ` · ${s.class_id}` : ''}</option>)}</select>
      </label>
      <label className="space-y-1 text-sm font-medium">{kk ? 'Куратордың аты-жөні' : 'ФИО куратора'}<input required minLength={2} maxLength={160} value={curator} onChange={e => setCurator(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-transparent p-3 dark:border-neutral-700" placeholder={kk ? 'Куратордың аты-жөні' : 'Куратор, сопровождавший ученика'} /></label>
      <label className="space-y-1 text-sm font-medium md:col-span-2">{kk ? 'Ескерту (міндетті емес)' : 'Примечание (необязательно)'}<input maxLength={1000} value={note} onChange={e => setNote(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-transparent p-3 dark:border-neutral-700" /></label>
      <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={signed} onChange={e => setSigned(e.target.checked)} />{kk ? 'Қағаз құжатқа қол қойылды' : 'Куратор подписал бумажный документ'}</label>
      <button disabled={saving || loading} className="btn-primary flex items-center justify-center gap-2 md:col-span-2"><ClipboardCheck size={17}/>{saving ? (kk ? 'Сақтау...' : 'Сохранение...') : (kk ? 'Қабылдауды тіркеу' : 'Зарегистрировать приём')}</button>
    </form>
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-gray-200 p-4 font-semibold dark:border-neutral-800">{kk ? 'Қабылдаулар тарихы' : 'История приёмов'}</div>
      {loading ? <div className="p-6 text-gray-500">{kk ? 'Жүктеу...' : 'Загрузка...'}</div> : items.length === 0 ? <div className="p-8 text-center text-gray-500">{kk ? 'Әзірге жазбалар жоқ' : 'Записей пока нет'}</div> : <div className="divide-y divide-gray-100 dark:divide-neutral-800">{items.map(item => <article key={item.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3"><UserRound size={19} className="mt-1 text-indigo-500"/><div><div className="font-medium">{item.users?.full_name || item.student_id} <span className="text-gray-500">{item.users?.class_id || ''}</span></div><div className="text-sm text-gray-500">{kk ? 'Куратор' : 'Куратор'}: {item.curator_name} · {new Date(item.created_at).toLocaleString(kk ? 'kk-KZ' : 'ru-RU')}</div>{item.note && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.note}</p>}</div></div>
        <button onClick={() => void toggleSignature(item)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${item.paper_signed ? 'border-emerald-300 text-emerald-700 dark:text-emerald-300' : 'border-amber-300 text-amber-800 dark:text-amber-300'}`}>{item.paper_signed ? (kk ? 'Қол қойылған' : 'Бумажная подпись получена') : (kk ? 'Қол қойылмаған · белгілеу' : 'Подписи нет · отметить получение')}</button>
      </article>)}</div>}
    </section>
  </main>;
}
