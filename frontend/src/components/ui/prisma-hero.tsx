"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight, LayoutDashboard, Globe } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";

interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({ text, className = "", showAsterisk = false, style }: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block relative"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

export const PrismaHero = () => {
  const { lang, setLang, t } = useLanguage();
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoLoaded(true);
          })
          .catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          });
      }
    }
  }, [isMounted]);

  if (!isMounted || isLoading) {
    return null;
  }

  const isPsychologist = role === 'psychologist';
  const dashboardLink = isPsychologist ? "/dashboard" : "/tests";

  const navItems = isPsychologist
    ? [
        { name: t.sidebar.dashboard, href: "/dashboard" },
        { name: t.sidebar.dialogs, href: "/chats" },
        { name: t.sidebar.archive, href: "/archive" },
        { name: t.sidebar.managePodcasts, href: "/podcasts/upload" },
      ]
    : [
        { name: t.hero.about, href: "#about" },
        { name: t.hero.tests, href: "/tests" },
        { name: t.hero.mood, href: "/mood" },
        { name: t.hero.podcasts, href: "/podcasts" },
        { name: t.hero.chat, href: "/chat" },
      ];

  return (
    <section className="h-screen w-full p-2 md:p-4 bg-black">
      <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem] bg-zinc-950">
        {/* Luminous Ambient Glow Background (Active immediately & during video load) */}
        <div className="absolute inset-0 bg-[#050608] overflow-hidden pointer-events-none">
          <div
            className="absolute -top-[25%] -left-[15%] w-[65vw] h-[65vw] rounded-full bg-gradient-to-br from-indigo-900/40 via-purple-900/25 to-transparent blur-[120px] animate-pulse"
            style={{ animationDuration: '7s' }}
          />
          <div
            className="absolute -bottom-[20%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tl from-emerald-950/40 via-teal-900/25 to-transparent blur-[140px] animate-pulse"
            style={{ animationDuration: '9s' }}
          />
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-purple-600/15 blur-[100px]" />
        </div>

        {/* Hero Background Video */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
          onCanPlay={() => setVideoLoaded(true)}
          onPlaying={() => setVideoLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100" : "opacity-80"
          }`}
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4" type="video/mp4" />
        </video>

        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.4] mix-blend-overlay" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />


        <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2 w-full max-w-sm md:max-w-none flex flex-col items-center gap-2">
          {/* Desktop Navbar */}
          <div className="hidden md:flex items-center gap-3 rounded-b-2xl bg-zinc-950/95 px-4 py-2 sm:gap-6 md:gap-8 md:rounded-b-3xl md:px-8 border-b border-x border-white/10">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-[11px] font-medium transition-colors sm:text-xs md:text-sm text-[#E1E0CC]/70 hover:text-[#E1E0CC]"
              >
                {item.name}
              </Link>
            ))}

            {/* Language Switcher Desktop */}
            <span className="w-px h-3 bg-white/20 ml-2" />
            <div className="flex items-center gap-1.5 ml-2 text-xs font-semibold text-[#E1E0CC]/70">
              <button
                onClick={() => setLang('ru')}
                className={`transition-colors ${lang === 'ru' ? 'text-white' : 'hover:text-[#E1E0CC]'}`}
              >
                РУС
              </button>
              <span>|</span>
              <button
                onClick={() => setLang('kk')}
                className={`transition-colors ${lang === 'kk' ? 'text-white' : 'hover:text-[#E1E0CC]'}`}
              >
                ҚАЗ
              </button>
            </div>
          </div>

          {/* Mobile Navbar */}
          <div className="flex md:hidden items-center gap-4 rounded-b-2xl bg-zinc-950/95 px-5 py-2.5 border-b border-x border-white/10">
            <Link href={isPsychologist ? "/dashboard" : "/tests"} className="text-xs font-semibold text-[#E1E0CC]/80 hover:text-[#E1E0CC]">
              {isPsychologist ? t.sidebar.dashboard : t.hero.tests}
            </Link>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <Link href={isAuthenticated ? dashboardLink : "/login"} className="text-xs font-semibold text-[#E1E0CC]/80 hover:text-[#E1E0CC]">
              {isAuthenticated ? t.hero.toCabinet : (lang === 'kk' ? 'Кіру' : 'Войти')}
            </Link>
            <span className="w-px h-3 bg-white/20" />
            <button
              onClick={() => setLang(lang === 'ru' ? 'kk' : 'ru')}
              className="text-[11px] font-bold text-[#E1E0CC] flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full"
            >
              <Globe size={10} />
              {lang === 'ru' ? 'РУС' : 'ҚАЗ'}
            </button>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-12 sm:pb-16 md:pb-12">
          <div className="grid grid-cols-12 items-end gap-4">
            <div className="col-span-12 lg:col-span-6 z-10">
              <h1
                className="font-medium leading-[0.85] tracking-[-0.07em] text-[13vw] sm:text-[11vw] md:text-[9vw] lg:text-[7vw]"
                style={{ color: "#E1E0CC" }}
              >
                <WordsPullUp text="AISezim" showAsterisk />
              </h1>
            </div>

            <div className="col-span-12 flex flex-col gap-5 pb-4 lg:col-span-6 lg:pb-8 z-10">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-xs text-[#E1E0CC]/80 sm:text-sm md:text-base leading-relaxed"
              >
                {t.hero.desc}
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3"
              >
                {isAuthenticated ? (
                  <Link href={dashboardLink}>
                    <button className="group inline-flex items-center gap-3 rounded-full bg-[#E1E0CC] py-1.5 pl-5 pr-1.5 text-sm font-semibold text-black transition-all hover:gap-4 sm:text-base">
                      {t.hero.toCabinet}
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-105">
                        <LayoutDashboard className="h-4 w-4 text-[#E1E0CC]" />
                      </span>
                    </button>
                  </Link>
                ) : (
                  <Link href="/login">
                    <button className="group inline-flex items-center gap-3 rounded-full bg-[#E1E0CC] py-1.5 pl-5 pr-1.5 text-sm font-semibold text-black transition-all hover:gap-4 sm:text-base">
                      {t.hero.startTesting}
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-105">
                        <ArrowRight className="h-4 w-4 text-[#E1E0CC]" />
                      </span>
                    </button>
                  </Link>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
