'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrismaHero } from '@/components/ui/prisma-hero';
import { useAuth } from '@/context/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { role, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (role === 'teacher') {
        router.replace('/teacher/dashboard');
      } else if (role === 'psychologist') {
        router.replace('/dashboard');
      }
    }
  }, [role, isLoading, router]);

  return (
    <main className="min-h-screen bg-[#F9F8F6] dark:bg-black transition-colors duration-300">
      <PrismaHero />
    </main>
  );
}
