'use client';

import { useState } from 'react';
import { Upload, CheckCircle, Music, Tag } from 'lucide-react';
import { podcastsApi } from '@/lib/api';
import { useLanguage } from '@/context/language-context';

const PODCAST_CATEGORIES = [
  { id: 'stress_management', labelRu: 'Стресс-менеджмент', labelKk: 'Стресс-менеджмент' },
  { id: 'meditation', labelRu: 'Медитация и релаксация', labelKk: 'Медитация және тынығу' },
  { id: 'motivation', labelRu: 'Мотивация и учеба', labelKk: 'Мотивация және оқу' },
  { id: 'career', labelRu: 'Профориентация и будущее', labelKk: 'Кәсіби бағдар және болашақ' },
];

export default function PodcastUploadPage() {
  const { lang } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(PODCAST_CATEGORIES[0].labelRu);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  function handleFile(f: File) {
    if (!f.type.startsWith('audio/')) {
      setError(lang === 'kk' ? 'Аудиофайл таңдаңыз (MP3, OGG, WAV)' : 'Пожалуйста, выберите аудиофайл (MP3, OGG, WAV)');
      return;
    }
    setFile(f);
    setError('');
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return;
    setError('');
    setUploading(true);

    const fd = new FormData();
    fd.append('title', title);
    if (description) fd.append('description', description);
    if (category) fd.append('category', category);
    fd.append('file', file);

    try {
      await podcastsApi.upload(fd);
      setSuccess(true);
      setTitle('');
      setDescription('');
      setCategory(PODCAST_CATEGORIES[0].labelRu);
      setFile(null);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail)
        : null;
      setError(msg || (lang === 'kk' ? 'Жүктеу қатесі' : 'Ошибка загрузки'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="section-title">
          {lang === 'kk' ? 'Подкаст жүктеу' : 'Загрузить подкаст'}
        </h1>
        <p className="section-subtitle">
          {lang === 'kk' ? 'Оқушыларға арналған пайдалы аудиоматериал қосыңыз' : 'Добавьте аудиоматериал для учеников'}
        </p>
      </div>

      <div className="card">
        {success && (
          <div className="mb-6 p-4 bg-risk-low/10 border border-risk-low/30 rounded-xl flex items-center gap-3">
            <CheckCircle size={20} className="text-risk-low" />
            <span className="text-risk-low font-medium">
              {lang === 'kk' ? 'Подкаст сәтті жүктелді!' : 'Подкаст успешно загружен!'}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-risk-critical/10 border border-risk-critical/30 rounded-xl text-risk-critical text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
              dragOver
                ? 'border-brand-500 bg-brand-500/10'
                : file
                ? 'border-risk-low/50 bg-risk-low/5'
                : 'border-surface-border hover:border-brand-500/50'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <Music size={40} className="text-risk-low" />
                <div className="text-white font-semibold">{file.name}</div>
                <div className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(1)} МБ</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload size={40} className="text-gray-600" />
                <div className="text-gray-400">
                  {lang === 'kk' ? 'Аудиофайлды сүйреп әкеліңіз немесе таңдау үшін басыңыз' : 'Перетащите аудиофайл или нажмите для выбора'}
                </div>
                <div className="text-gray-600 text-xs">MP3, OGG, WAV — до 50 МБ</div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              {lang === 'kk' ? 'Атауы *' : 'Название *'}
            </label>
            <input
              id="podcast-title"
              className="input"
              placeholder={lang === 'kk' ? 'Стресстен арылу медитациясы' : 'Медитация для снятия стресса'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Tag size={14} />
              <span>{lang === 'kk' ? 'Санаты / Бағыты *' : 'Категория подкаста *'}</span>
            </label>
            <select
              id="podcast-category"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {PODCAST_CATEGORIES.map((cat) => (
                <option key={cat.id} value={lang === 'kk' ? cat.labelKk : cat.labelRu}>
                  {lang === 'kk' ? cat.labelKk : cat.labelRu}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              {lang === 'kk' ? 'Сипаттамасы' : 'Описание'}
            </label>
            <textarea
              id="podcast-description"
              className="input resize-none"
              rows={3}
              placeholder={lang === 'kk' ? 'Мазмұнының қысқаша сипаттамасы...' : 'Краткое описание содержания...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button
            id="btn-upload-podcast"
            type="submit"
            disabled={uploading || !file || !title}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={18} />
                {lang === 'kk' ? 'Подкастты жүктеу' : 'Загрузить подкаст'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
