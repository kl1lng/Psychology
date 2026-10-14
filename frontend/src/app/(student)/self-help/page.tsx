'use client';

import { useState } from 'react';
import {
  Wind,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { LogoIcon } from '@/components/ui/logo-icon';
import { useLanguage } from '@/context/language-context';
import { BoxBreathing } from '@/components/box-breathing';

export default function SelfHelpPage() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'breathing' | 'cbt'>('breathing');

  // ─── 2. CBT Thought Restructuring Master (4 Steps) ──────────────────────────
  const [cbtStep, setCbtStep] = useState(1);
  const [cbtSituation, setCbtSituation] = useState('');
  const [cbtThought, setCbtThought] = useState('');
  const [cbtDistortion, setCbtDistortion] = useState('');
  const [cbtReframed, setCbtReframed] = useState('');
  const [cbtCompleted, setCbtCompleted] = useState(false);

  const distortions = [
    { id: 'catastrophizing', labelRu: 'Катастрофизация («Всё пропало, я получу двойку/опозорюсь»)', labelKk: 'Құрдымға балау («Барлығы бітті, мен құримын»)' },
    { id: 'black_white', labelRu: 'Черно-белое мышление («Либо идеально, либо я неудачник»)', labelKk: 'Ақ-қара ойлау («Не мінсіз, немесе мен сәтсізбін»)' },
    { id: 'mind_reading', labelRu: 'Чтение мыслей («Все на меня смотрят и осуждают»)', labelKk: 'Өзгелердің ойын оқу («Барлығы маған қарап күліп жатыр»)' },
    { id: 'overgeneralization', labelRu: 'Сверхобобщение («Мне никогда ни в чём не везёт»)', labelKk: 'Асыра жалпылау («Маған ешқашан жол болмайды»)' },
  ];

  function resetCBT() {
    setCbtStep(1);
    setCbtSituation('');
    setCbtThought('');
    setCbtDistortion('');
    setCbtReframed('');
    setCbtCompleted(false);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {lang === 'kk' ? 'Өзін-өзі реттеу және стресске қарсы тренажерлар' : 'Инструменты самопомощи и антистресс'}
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
          {lang === 'kk'
            ? 'Шұғыл тынышталуға, үрейді басуға және ойларды ретке келтіруге арналған тәжірибелік әдістер'
            : 'Практические экспресс-техники для снятия тревоги перед уроками, экзаменами и сложными ситуациями'}
        </p>
      </div>

      {/* Segmented Control Tabs */}
      <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 grid grid-cols-2 gap-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('breathing')}
          className={`flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out ${
            activeTab === 'breathing'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs border border-zinc-200/80 dark:border-zinc-700'
              : 'bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Wind size={18} className={activeTab === 'breathing' ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400'} />
          <span>{lang === 'kk' ? '4-4-4-4 Тыныс алу' : '4-4-4-4 Квадратное дыхание'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cbt')}
          className={`flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out ${
            activeTab === 'cbt'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs border border-zinc-200/80 dark:border-zinc-700'
              : 'bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <LogoIcon className={`w-4 h-4 shrink-0 ${activeTab === 'cbt' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`} />
          <span>{lang === 'kk' ? 'КПТ-Ойларды талдау' : 'КПТ-Разбор мыслей'}</span>
        </button>
      </div>

      {/* ─── TAB 1: BREATHING SIMULATOR ─── */}
      {activeTab === 'breathing' && (
        <div className="py-2">
          <BoxBreathing initialLanguage={lang as 'kk' | 'ru'} />
        </div>
      )}

      {/* ─── TAB 2: CBT THOUGHT MASTER ──────────────────────────────────────── */}
      {activeTab === 'cbt' && (
        <div className="card space-y-6 !p-8 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {lang === 'kk' ? 'Когнитивті-мінез-құлықтық (КПТ) ойлар шебері' : 'Мастер трансформации тревожных мыслей (КПТ)'}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                {lang === 'kk'
                  ? 'Үрей мен үрейлі ойларды фактілер негізінде саралап, конструктивті шешім табу'
                  : 'Разложите пугающую мысль на факты и замените ее на реалистичное убеждение за 4 шага'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 px-3 py-1.5 rounded-xl border border-brand-500/20">
              <span>{lang === 'kk' ? `Қадам ${cbtStep} / 4` : `Шаг ${cbtStep} из 4`}</span>
            </div>
          </div>

          {/* Step Progress Bar */}
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${(cbtStep / 4) * 100}%` }}
            />
          </div>

          {!cbtCompleted ? (
            <div className="space-y-6">
              {/* STEP 1: SITUATION */}
              {cbtStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                    <HelpCircle size={16} className="text-brand-500" />
                    <span>{lang === 'kk' ? '1-қадам: Қандай оқиға немесе жағдай болды?' : 'Шаг 1: Какая ситуация или триггер вызвали тревогу?'}</span>
                  </div>
                  <textarea
                    value={cbtSituation}
                    onChange={(e) => setCbtSituation(e.target.value)}
                    placeholder={lang === 'kk' ? 'Мысалы: «Ертең алгебрадан бақылау жұмысы» немесе «Сынып алдында баяндама жасау керек»' : 'Например: «Завтра контрольная работа по физике» или «Нужно выступать перед всем классом»'}
                    className="input resize-none text-zinc-900 dark:text-zinc-100"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => setCbtStep(2)}
                      disabled={!cbtSituation.trim()}
                      className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-6 text-xs font-bold disabled:opacity-50"
                    >
                      <span>{lang === 'kk' ? 'Келесі қадам' : 'Далее'}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: AUTOMATIC THOUGHT */}
              {cbtStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                    <Zap size={16} className="text-amber-500" />
                    <span>{lang === 'kk' ? '2-қадам: Басыңызға келген ең қорқынышты автоматты ой қандай?' : 'Шаг 2: Какая самая пугающая автоматическая мысль возникла в голове?'}</span>
                  </div>
                  <textarea
                    value={cbtThought}
                    onChange={(e) => setCbtThought(e.target.value)}
                    placeholder={lang === 'kk' ? 'Мысалы: «Мен ештеңе білмеймін, екі алып барлығының алдында ұятқа қаламын»' : 'Например: «Я точно всё забуду, получу двойку и все будут надо мной смеяться»'}
                    className="input resize-none text-zinc-900 dark:text-zinc-100"
                    rows={3}
                  />
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setCbtStep(1)}
                      className="btn-secondary !py-2.5 !px-4 text-xs font-semibold"
                    >
                      <ArrowLeft size={14} className="inline mr-1" />
                      <span>{lang === 'kk' ? 'Артқа' : 'Назад'}</span>
                    </button>
                    <button
                      onClick={() => setCbtStep(3)}
                      disabled={!cbtThought.trim()}
                      className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-6 text-xs font-bold disabled:opacity-50"
                    >
                      <span>{lang === 'kk' ? 'Келесі қадам' : 'Далее'}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: COGNITIVE DISTORTION */}
              {cbtStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                    <ShieldCheck size={16} className="text-brand-500" />
                    <span>{lang === 'kk' ? '3-қадам: Бұл ойда қандай когнитивті қателік (ойлау қатесі) бар?' : 'Шаг 3: Какая когнитивная ловушка скрыта в этой мысли?'}</span>
                  </div>

                  <div className="space-y-2">
                    {distortions.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setCbtDistortion(lang === 'kk' ? d.labelKk : d.labelRu)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all ${
                          cbtDistortion === (lang === 'kk' ? d.labelKk : d.labelRu)
                            ? 'bg-brand-500/15 border-brand-500 text-brand-700 dark:text-brand-300 font-semibold'
                            : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-brand-500/40'
                        }`}
                      >
                        {lang === 'kk' ? d.labelKk : d.labelRu}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setCbtStep(2)}
                      className="btn-secondary !py-2.5 !px-4 text-xs font-semibold"
                    >
                      <ArrowLeft size={14} className="inline mr-1" />
                      <span>{lang === 'kk' ? 'Артқа' : 'Назад'}</span>
                    </button>
                    <button
                      onClick={() => setCbtStep(4)}
                      disabled={!cbtDistortion}
                      className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-6 text-xs font-bold disabled:opacity-50"
                    >
                      <span>{lang === 'kk' ? 'Келесі қадам' : 'Далее'}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: REFRAMED REALISTIC THOUGHT */}
              {cbtStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                    <Sparkles size={16} />
                    <span>{lang === 'kk' ? '4-қадам: Нақты фактілерге негізделген жаңа, сабырлы ой құрыңыз:' : 'Шаг 4: Сформулируйте реалистичную, поддерживающую мысль:'}</span>
                  </div>
                  <textarea
                    value={cbtReframed}
                    onChange={(e) => setCbtReframed(e.target.value)}
                    placeholder={lang === 'kk' ? 'Мысалы: «Мен дайындалдым. Қиын болса да, қолымнан келгенін жасаймын. Бір бақылау жұмысы менің қабілетімді толық анықтамайды»' : 'Например: «Я готовился. Даже если попадется сложный вопрос, я справлюсь с тем, что знаю. Одна оценка не определяет мою ценность»'}
                    className="input resize-none text-zinc-900 dark:text-zinc-100"
                    rows={3}
                  />
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setCbtStep(3)}
                      className="btn-secondary !py-2.5 !px-4 text-xs font-semibold"
                    >
                      <ArrowLeft size={14} className="inline mr-1" />
                      <span>{lang === 'kk' ? 'Артқа' : 'Назад'}</span>
                    </button>
                    <button
                      onClick={() => setCbtCompleted(true)}
                      disabled={!cbtReframed.trim()}
                      className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-6 text-xs font-bold disabled:opacity-50 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <CheckCircle2 size={15} />
                      <span>{lang === 'kk' ? 'Талдауды аяқтау' : 'Завершить разбор'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CBT Summary Card */
            <div className="space-y-6 animate-slide-up">
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-4">
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 size={20} />
                  <span>{lang === 'kk' ? 'Сәтті қайта құрылымдалған ой карточкасы' : 'Ваша карточка совладания с тревогой'}</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium block mb-0.5">{lang === 'kk' ? 'Жағдай:' : 'Ситуация:'}</span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{cbtSituation}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium block mb-0.5">{lang === 'kk' ? 'Бастапқы үрейлі ой:' : 'Исходная пугающая мысль:'}</span>
                    <span className="text-rose-600 dark:text-rose-400 line-through font-medium">{cbtThought}</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium block mb-0.5">{lang === 'kk' ? 'Жаңа сабырлы ұстаным:' : 'Новое реалистичное убеждение:'}</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold text-sm leading-relaxed block bg-white/80 dark:bg-zinc-800/80 p-3.5 rounded-xl border border-emerald-500/30 shadow-sm">
                      «{cbtReframed}»
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={resetCBT}
                  className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-6 text-xs font-semibold"
                >
                  <RotateCcw size={15} />
                  <span>{lang === 'kk' ? 'Жаңа ойды талдау' : 'Разобрать другую мысль'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

