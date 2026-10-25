import type { Metadata, Viewport } from 'next';
import { Manrope, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import NextTopLoader from 'nextjs-toploader';
import { Providers } from './providers';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
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

// Dark-only app: the browser chrome (address bar, overscroll) follows the page colour
export const viewport: Viewport = {
  themeColor: '#07050f',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <NextTopLoader
          color="#a78bfa"
          height={3}
          showSpinner={false}
          shadow="0 0 12px #a78bfa,0 0 6px #ec4899"
        />
        <Providers>
          {children}
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              style: {
                background: 'hsl(252, 28%, 8%)',
                border: '1px solid hsl(262, 60%, 30%)',
                color: 'hsl(240, 25%, 96%)',
                boxShadow: '0 12px 40px -10px hsl(262 90% 66% / 0.4)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
