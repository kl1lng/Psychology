'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface Props {
  src: string;
  onPlay?: () => void;
  onPause?: () => void;
}

export default function AudioPlayer({ src, onPlay, onPause }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const audio = new Audio(src);
    audio.volume = volume;
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => {
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    });
    audio.addEventListener('ended', () => {
      setPlaying(false);
      setProgress(0);
      onPause?.();
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      onPause?.();
    } else {
      audio.play();
      setPlaying(true);
      onPlay?.();
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }

  function formatTime(sec: number): string {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  const currentTime = audioRef.current ? audioRef.current.currentTime : 0;

  return (
    <div className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3 border border-surface-border">
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          playing ? 'bg-gradient-brand shadow-glow-brand' : 'bg-surface-muted hover:bg-brand-500/20'
        }`}
      >
        {playing
          ? <Pause size={16} className="text-white" />
          : <Play size={16} className={playing ? 'text-white' : 'text-gray-400'} fill={!playing ? '#9ca3af' : undefined} />
        }
      </button>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-gray-500 text-xs w-8">{formatTime(currentTime)}</span>
        <div
          className="flex-1 bg-surface-muted rounded-full h-1.5 cursor-pointer group"
          onClick={seek}
        >
          <div
            className="bg-gradient-brand h-1.5 rounded-full relative transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <span className="text-gray-500 text-xs w-8">{formatTime(duration)}</span>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-1.5">
        <button onClick={toggleMute} className="text-gray-500 hover:text-gray-300 transition-colors">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={handleVolume}
          className="w-16 h-1 accent-brand-500"
        />
      </div>
    </div>
  );
}
