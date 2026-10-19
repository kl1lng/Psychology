import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/context/language-context';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/providers/theme-provider';

export const metadata: Metadata = {
  title: 'AISezim — Школьная психологическая платформа',
  description: 'Платформа психологической поддержки школьников. Анонимное тестирование, чат с психологом, эмоциональный дневник.',
  keywords: 'психология, школьники, тревожность, психолог, поддержка',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="bg-[#F9F8F6] dark:bg-black text-zinc-900 dark:text-gray-200 antialiased min-h-screen transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
