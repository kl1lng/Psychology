'use client';

import { useEffect, useRef } from 'react';

/**
 * useConfettiSound — plays congratulation.mp3 and optional canvas confetti.
 * Call trigger() after a successful assessment submission.
 */
export function useConfettiSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function trigger() {
    // ── Play audio ────────────────────────────────────────────────────────
    try {
      const audio = new Audio('/sounds/congratulation.mp3');
      audio.volume = 0.7;
      audioRef.current = audio;
      audio.play().catch(() => {
        // Autoplay blocked — that's fine
      });
    } catch {}

    // ── Canvas confetti ───────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      pointer-events: none; z-index: 9999;
    `;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d')!;
    const particles: Particle[] = [];
    const colors = ['#3b6ef0', '#e83b92', '#22c55e', '#f59e0b', '#f97316', '#ffffff'];

    class Particle {
      x: number; y: number; vx: number; vy: number;
      color: string; size: number; rotation: number; rotSpeed: number; alpha: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = -10;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = Math.random() * 4 + 2;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = Math.random() * 8 + 4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.2;
        this.alpha = 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.rotation += this.rotSpeed;
        if (this.y > canvas.height * 0.7) this.alpha -= 0.02;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 2);
        ctx.restore();
      }
    }

    for (let i = 0; i < 120; i++) {
      setTimeout(() => particles.push(new Particle()), i * 20);
    }

    let raf: number;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.update();
        p.draw(ctx);
        if (p.alpha <= 0) particles.splice(i, 1);
      });
      if (particles.length > 0) {
        raf = requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }
    animate();

    setTimeout(() => {
      cancelAnimationFrame(raf);
      canvas.remove();
    }, 5000);
  }

  return { trigger };
}

// Convenience component wrapper
export default function ConfettiSound() {
  return null; // Purely a hook-based module
}
