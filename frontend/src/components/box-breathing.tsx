'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Wind,
  Info,
} from 'lucide-react';

export type BreathPhase = 'INHALE' | 'HOLD_IN' | 'EXHALE' | 'HOLD_OUT';
export type BreathingLanguage = 'kk' | 'ru' | 'en';

interface BoxBreathingProps {
  /** Optional language override ('kk' | 'ru' | 'en') */
  initialLanguage?: BreathingLanguage;
  /** Optional callback fired when a 16s cycle is completed */
  onCycleComplete?: (completedCycles: number) => void;
  /** Optional custom class name */
  className?: string;
}

interface PhaseConfig {
  name: string;
  instruction: string;
  subHint: string;
  side: 'top' | 'right' | 'bottom' | 'left';
}

const TRANSLATIONS: Record<BreathingLanguage, {
  tag: string;
  title: string;
  subtitle: string;
  start: string;
  pause: string;
  reset: string;
  soundOn: string;
  soundOff: string;
  cyclesCompleted: string;
  tipsTitle: string;
  tip1: string;
  tip2: string;
  tip3: string;
  phases: Record<BreathPhase, PhaseConfig>;
}> = {
  kk: {
    tag: '4-4-4-4 ТЫНЫС АЛУ ТЕХНИКАСЫ',
    title: 'Квадраттық тыныс алу',
    subtitle: 'Жүйке жүйесін тыныштандырып, стресс пен үрейді басуға арналған ғылыми әдіс',
    start: 'Жаттығуды бастау',
    pause: 'Кідірту',
    reset: 'Қайта бастау',
    soundOn: 'Дыбысты өшіру',
    soundOff: 'Дыбысты қосу',
    cyclesCompleted: 'Аяқталған циклдар',
    tipsTitle: 'Тыныс алу ережелері',
    tip1: 'Ыңғайлы отырыңыз және арқаңызды тік ұстаңыз',
    tip2: 'Мұрынмен терең, ішпен тыныс алыңыз',
    tip3: 'Иығыңыз бен жақ бұлшықеттеріңізді босатыңыз',
    phases: {
      INHALE: {
        name: 'Тыныс алу',
        instruction: 'Мұрынмен терең тыныс ал',
        subHint: 'Өкпеңізді салқын таза ауаға баяу толтырыңыз',
        side: 'top',
      },
      HOLD_IN: {
        name: 'Ұстап тұру',
        instruction: 'Деміңізді ұстаңыз',
        subHint: 'Тыныштық пен оттегінің денеге таралуын сезініңіз',
        side: 'right',
      },
      EXHALE: {
        name: 'Дем шығару',
        instruction: 'Ақырын дем шығарыңыз',
        subHint: 'Барлық жиналған кернеу мен үрейді босатыңыз',
        side: 'bottom',
      },
      HOLD_OUT: {
        name: 'Ұстап тұру',
        instruction: 'Деміңізді ұстаңыз',
        subHint: 'Толықтай босаңсып, келесі тынысқа дайындалыңыз',
        side: 'left',
      },
    },
  },
  ru: {
    tag: 'ТЕХНИКА 4-4-4-4',
    title: 'Квадратное дыхание',
    subtitle: 'Научный метод для нормализации нервной системы и быстрого снятия тревоги',
    start: 'Начать практику',
    pause: 'Пауза',
    reset: 'Сначала',
    soundOn: 'Выключить звук',
    soundOff: 'Включить звук',
    cyclesCompleted: 'Завершено циклов',
    tipsTitle: 'Рекомендации к практике',
    tip1: 'Сядьте удобно, выпрямите спину и опустите плечи',
    tip2: 'Вдыхайте носом, направляя дыхание в живот',
    tip3: 'Отпустите челюсть и расслабьте мышцы лица',
    phases: {
      INHALE: {
        name: 'Вдох',
        instruction: 'Вдох через нос',
        subHint: 'Медленно и плавно наполняйте легкие воздухом',
        side: 'top',
      },
      HOLD_IN: {
        name: 'Задержка',
        instruction: 'Задержите дыхание',
        subHint: 'Сохраняйте покой, почувствуйте прилив сил',
        side: 'right',
      },
      EXHALE: {
        name: 'Выдох',
        instruction: 'Плавный выдох',
        subHint: 'Выдыхайте спокойно, отпуская все напряжение',
        side: 'bottom',
      },
      HOLD_OUT: {
        name: 'Задержка',
        instruction: 'Задержите дыхание',
        subHint: 'Полное расслабление перед новым вдохом',
        side: 'left',
      },
    },
  },
  en: {
    tag: '4-4-4-4 BOX BREATHING',
    title: 'Box Breathing Practice',
    subtitle: 'A clinically proven technique to reset your nervous system and reduce anxiety',
    start: 'Begin Exercise',
    pause: 'Pause',
    reset: 'Restart',
    soundOn: 'Mute sound',
    soundOff: 'Enable sound',
    cyclesCompleted: 'Completed cycles',
    tipsTitle: 'Breathing tips',
    tip1: 'Sit comfortably with a straight and relaxed posture',
    tip2: 'Inhale deeply through your nose into the abdomen',
    tip3: 'Release tension in your shoulders and jaw',
    phases: {
      INHALE: {
        name: 'Inhale',
        instruction: 'Deep inhale through nose',
        subHint: 'Fill your lungs slowly and smoothly with fresh air',
        side: 'top',
      },
      HOLD_IN: {
        name: 'Hold',
        instruction: 'Hold your breath',
        subHint: 'Rest in stillness and feel the oxygen nourish you',
        side: 'right',
      },
      EXHALE: {
        name: 'Exhale',
        instruction: 'Slow gentle exhale',
        subHint: 'Release all tension and stress out of your body',
        side: 'bottom',
      },
      HOLD_OUT: {
        name: 'Hold',
        instruction: 'Hold your breath',
        subHint: 'Complete stillness before the next fresh breath',
        side: 'left',
      },
    },
  },
};

const PHASE_SEQUENCE: BreathPhase[] = ['INHALE', 'HOLD_IN', 'EXHALE', 'HOLD_OUT'];

export function BoxBreathing({
  initialLanguage = 'kk',
  onCycleComplete,
  className = '',
}: BoxBreathingProps) {
  const [lang, setLang] = useState<BreathingLanguage>(initialLanguage);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [phase, setPhase] = useState<BreathPhase>('INHALE');
  const [secondsLeft, setSecondsLeft] = useState<number>(4);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const t = TRANSLATIONS[lang];
  const currentPhaseConfig = t.phases[phase];

  // Gentle acoustic chime generator via Web Audio API (warm singing bowl chime)
  const playChime = useCallback((phaseType: BreathPhase) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Harmonic frequency matching the therapeutic phase
      const baseFreq = phaseType === 'INHALE' ? 432 : phaseType === 'HOLD_IN' ? 528 : phaseType === 'EXHALE' ? 396 : 480;
      const now = ctx.currentTime;

      // Primary oscillator (pure sine)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 2.5);

      // Warm harmonic overtone (subtle octave higher)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.exponentialRampToValueAtTime(0.04, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 1.9);
    } catch {
      // Audio context silently ignored if unavailable in browser environment
    }
  }, [soundEnabled]);

  // Main 4-second Countdown & Phase Transition Loop
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Play chime on practice start or phase start
    playChime(phase);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Phase finished (reached 0) -> Transition to next phase
        setPhase((currentPhase) => {
          const currentIndex = PHASE_SEQUENCE.indexOf(currentPhase);
          const nextIndex = (currentIndex + 1) % PHASE_SEQUENCE.length;
          const nextPhase = PHASE_SEQUENCE[nextIndex];

          // Trigger sound for next phase
          playChime(nextPhase);

          // Cycle complete when looping back to INHALE
          if (nextIndex === 0) {
            setCompletedCycles((cycles) => {
              const updated = cycles + 1;
              if (onCycleComplete) onCycleComplete(updated);
              return updated;
            });
          }

          return nextPhase;
        });

        return 4;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, phase, playChime, onCycleComplete]);

  // Controls Handlers
  const handleToggleActive = () => {
    setIsActive((prev) => !prev);
  };

  const handleReset = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('INHALE');
    setSecondsLeft(4);
    setCompletedCycles(0);
  };

  // Determine Visual State for Central Rounded Square
  // Inhale: Expands to 1.45 scale over 4s
  // Hold 1: Stays expanded (1.45)
  // Exhale: Contracts to 1.0 scale over 4s
  // Hold 2: Stays contracted (1.0)
  const isExpanded = phase === 'INHALE' || phase === 'HOLD_IN';
  const targetScale = !isActive ? 1.0 : isExpanded ? 1.4 : 1.0;

  // Soft glowing drop-shadow calculations
  const glowShadow = !isActive
    ? '0 12px 36px -8px rgba(142, 168, 157, 0.18), 0 2px 8px rgba(0, 0, 0, 0.03)'
    : isExpanded
    ? '0 28px 64px -10px rgba(120, 164, 149, 0.42), 0 0 45px 12px rgba(189, 215, 204, 0.45)'
    : '0 12px 32px -8px rgba(142, 168, 157, 0.16), 0 0 16px 2px rgba(189, 215, 204, 0.18)';

  // Square background tint
  const shapeBg = !isActive
    ? '#EAF1ED'
    : phase === 'INHALE' || phase === 'HOLD_IN'
    ? '#DCEBE4'
    : '#EAF1ED';

  return (
    <div
      className={`w-full max-w-2xl mx-auto rounded-[2.5rem] bg-[#F9F8F6] border border-[#EBE7DF] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-stone-700 font-sans select-none ${className}`}
    >
      {/* ─── Top Header & Controls Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
        {/* Practice Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFECE6] border border-[#E3DED4] text-xs font-semibold tracking-wider text-[#4D6559]">
          <Wind className="w-3.5 h-3.5 text-[#5B8272]" />
          <span>{t.tag}</span>
        </div>

        {/* Language & Sound Options */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Language Switcher */}
          <div className="inline-flex items-center rounded-full bg-[#EFECE6] p-1 border border-[#E3DED4]">
            {(['kk', 'ru', 'en'] as BreathingLanguage[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  lang === l
                    ? 'bg-white text-[#2D473E] shadow-sm font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title={`Switch to ${l.toUpperCase()}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-2 rounded-full bg-[#EFECE6] hover:bg-[#E7E2D8] border border-[#E3DED4] text-[#4D6559] transition-colors"
            title={soundEnabled ? t.soundOn : t.soundOff}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#4C8372]" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-400" />
            )}
          </button>
        </div>
      </div>

      {/* ─── Main Guidance Text ─── */}
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#2D473E] tracking-tight transition-all duration-300">
          {isActive ? currentPhaseConfig.instruction : t.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed min-h-[1.5rem] font-normal transition-all duration-300">
          {isActive ? currentPhaseConfig.subHint : t.subtitle}
        </p>
      </div>

      {/* ─── Center Visual: Box Breathing Arena ─── */}
      <div className="relative flex items-center justify-center py-10 sm:py-14 my-2">
        {/* Soft Ambient Radial Halo (Aura) */}
        <motion.div
          animate={{
            scale: isActive && isExpanded ? 1.5 : 1.0,
            opacity: isActive ? (isExpanded ? 0.65 : 0.25) : 0.2,
          }}
          transition={{ duration: 4, ease: 'easeInOut' }}
          className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-[#A6C8B9]/40 via-[#C1DCD0]/35 to-[#DFECE6]/20 blur-3xl pointer-events-none"
        />

        {/* Outer Reference Box Perimeter Track */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-[3rem] border border-[#D5E1DA]/80 flex items-center justify-center p-4">
          {/* Edge Step Indicators (Top: Inhale, Right: Hold, Bottom: Exhale, Left: Hold) */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top Side (Inhale) */}
            <div
              className={`absolute top-0 left-8 right-8 h-1 rounded-full transition-all duration-700 ${
                isActive && phase === 'INHALE'
                  ? 'bg-[#5B8B79] shadow-[0_0_10px_#5B8B79]'
                  : 'bg-stone-200/60'
              }`}
            />
            {/* Right Side (Hold In) */}
            <div
              className={`absolute right-0 top-8 bottom-8 w-1 rounded-full transition-all duration-700 ${
                isActive && phase === 'HOLD_IN'
                  ? 'bg-[#5B8B79] shadow-[0_0_10px_#5B8B79]'
                  : 'bg-stone-200/60'
              }`}
            />
            {/* Bottom Side (Exhale) */}
            <div
              className={`absolute bottom-0 left-8 right-8 h-1 rounded-full transition-all duration-700 ${
                isActive && phase === 'EXHALE'
                  ? 'bg-[#5B8B79] shadow-[0_0_10px_#5B8B79]'
                  : 'bg-stone-200/60'
              }`}
            />
            {/* Left Side (Hold Out) */}
            <div
              className={`absolute left-0 top-8 bottom-8 w-1 rounded-full transition-all duration-700 ${
                isActive && phase === 'HOLD_OUT'
                  ? 'bg-[#5B8B79] shadow-[0_0_10px_#5B8B79]'
                  : 'bg-stone-200/60'
              }`}
            />
          </div>

          {/* ─── The Core Visual Element: "The Lungs" (Soft Rounded Square) ─── */}
          <motion.div
            animate={{
              scale: targetScale,
              backgroundColor: shapeBg,
              boxShadow: glowShadow,
            }}
            transition={{
              duration: isActive ? 4 : 0.8,
              ease: 'easeInOut',
            }}
            className="w-44 h-44 sm:w-52 sm:h-52 rounded-[2.5rem] sm:rounded-[3rem] border border-[#BDD7CC] flex flex-col items-center justify-center relative overflow-hidden z-10"
          >
            {/* Soft inner texture gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-black/[0.02] pointer-events-none" />

            {/* Central Countdown Number */}
            <div className="relative flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isActive ? `${phase}-${secondsLeft}` : 'idle'}
                  initial={{ opacity: 0, scale: 0.85, y: -2 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.15, y: 2 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="text-5xl sm:text-6xl font-light text-[#233B32] font-sans tracking-tight"
                >
                  {isActive ? secondsLeft : '4'}
                </motion.div>
              </AnimatePresence>

              {/* Sub-label inside shape */}
              <motion.span
                key={isActive ? currentPhaseConfig.name : 'ready'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="mt-1 text-xs font-medium text-[#4D6C5F] tracking-wide"
              >
                {isActive ? currentPhaseConfig.name : (lang === 'kk' ? 'Дайынсыз ба?' : lang === 'ru' ? 'Готовы?' : 'Ready?')}
              </motion.span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Control Actions (Start / Pause & Reset) ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-4">
        {/* Main Start / Pause Button */}
        <button
          onClick={handleToggleActive}
          className="w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-teal-600/10 hover:bg-teal-600/20 active:bg-teal-600/25 text-teal-800 border border-teal-600/20 font-medium text-sm sm:text-base transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98]"
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4 text-teal-800" />
              <span>{t.pause}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-teal-800 fill-teal-800/30" />
              <span>{t.start}</span>
            </>
          )}
        </button>

        {/* Reset Button (visible when active or after cycles completed) */}
        {(isActive || completedCycles > 0) && (
          <button
            onClick={handleReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-[#EFECE6] hover:bg-[#E6E1D6] active:bg-[#DCD6C9] text-stone-700 border border-[#E0DBD0] font-medium text-sm transition-all duration-200 active:scale-[0.98]"
            title={t.reset}
          >
            <RotateCcw className="w-4 h-4 text-stone-600" />
            <span>{t.reset}</span>
          </button>
        )}
      </div>

      {/* ─── Footer Details: Completed Cycles & Calming Tips ─── */}
      <div className="mt-8 pt-6 border-t border-[#EBE7DF]/80 space-y-4">
        {/* Completed Cycles Pill */}
        {completedCycles > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 text-xs font-semibold text-[#2D5A4A] bg-[#E8F3EE] border border-[#CDE3D8] rounded-2xl py-2 px-4 w-fit mx-auto"
          >
            <Sparkles className="w-4 h-4 text-[#3E856C]" />
            <span>
              {t.cyclesCompleted}: {completedCycles}
            </span>
          </motion.div>
        )}

        {/* Mindful Tips */}
        <div className="bg-[#F3F0EA]/70 rounded-2xl p-3.5 sm:p-4 text-xs text-slate-600 border border-[#E7E2D8]/80">
          <div className="flex items-center gap-1.5 font-semibold text-[#375247] mb-2">
            <Info className="w-3.5 h-3.5 text-[#4D7B69]" />
            <span>{t.tipsTitle}:</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-stone-600">
            <li className="flex items-start gap-1.5">
              <span className="text-[#5B8B79] font-bold">•</span>
              <span>{t.tip1}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#5B8B79] font-bold">•</span>
              <span>{t.tip2}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#5B8B79] font-bold">•</span>
              <span>{t.tip3}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default BoxBreathing;
