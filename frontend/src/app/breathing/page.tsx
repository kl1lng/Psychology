'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Shield, Heart } from 'lucide-react';
import { BoxBreathing } from '@/components/box-breathing';

export default function BreathingPage() {
  return (
    <main className="min-h-screen bg-[#FAF8F5] text-stone-700 flex flex-col justify-between p-4 sm:p-8 lg:p-12 selection:bg-[#D5E6DF] selection:text-[#2D473E]">
      {/* Top Navigation */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors px-3 py-1.5 rounded-full hover:bg-stone-200/50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>AISezim Басты бетке қайту</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-[#4D6559] font-semibold bg-[#EAE6DD]/70 px-3 py-1.5 rounded-full border border-[#DED8CC]">
          <Heart className="w-3.5 h-3.5 text-[#5B8272]" />
          <span>AISezim Релаксация</span>
        </div>
      </header>

      {/* Main Box Breathing Interactive Component */}
      <section className="my-auto py-6 sm:py-10">
        <BoxBreathing initialLanguage="kk" />
      </section>

      {/* Footer Info */}
      <footer className="max-w-xl mx-auto text-center space-y-2 py-4">
        <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
          <Shield className="w-3.5 h-3.5 text-[#739B8A]" />
          <span>Психологиялық қолдау және антистресс практикасы • AISezim</span>
        </div>
      </footer>
    </main>
  );
}
