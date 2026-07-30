import type { Metadata } from 'next';
import { Inter, Outfit, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import NextTopLoader from 'nextjs-toploader';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CareerGap AI — AI-Powered Career Analysis & Roadmap',
    template: '%s | CareerGap AI',
  },
  description:
    'Analyze your resume against job descriptions, identify skill gaps, get AI-powered project and certification recommendations, and build your career roadmap.',
  keywords: [
    'career gap analysis',
    'resume analyzer',
    'skill gap',
    'career roadmap',
    'AI career coach',
    'ATS optimizer',
    'job matching',
  ],
  authors: [{ name: 'CareerGap AI' }],
  creator: 'CareerGap AI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://careergap.ai',
    title: 'CareerGap AI — AI-Powered Career Analysis & Roadmap',
    description: 'Bridge the gap between where you are and where you want to be.',
    siteName: 'CareerGap AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CareerGap AI',
    description: 'AI-Powered Career Analysis & Roadmap Platform',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <NextTopLoader color="#8b5cf6" showSpinner={false} />
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'hsl(220, 25%, 9%)',
                border: '1px solid hsl(220, 20%, 15%)',
                color: 'hsl(220, 10%, 95%)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
