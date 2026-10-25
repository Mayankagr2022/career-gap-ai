'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, Target, TrendingUp } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

const POINTS = [
  { icon: Target, title: 'Pinpoint skill gaps', text: 'See exactly what a role needs that your resume does not show.' },
  { icon: TrendingUp, title: 'Beat the ATS', text: 'Get a match score and keyword fixes before you apply.' },
  { icon: Sparkles, title: 'Your AI career coach', text: 'Roadmaps and interview prep tailored to your profile.' },
];

/**
 * Shared frame for every sign-in style page: a brand showcase panel on large screens,
 * and a compact centred card on tablets and phones.
 */
export function AuthShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
      {/* Showcase panel (desktop) */}
      <aside className="relative hidden overflow-hidden border-r border-white/[0.07] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

        <BrandLogo size="lg" className="relative" />

        <div className="relative max-w-lg">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-4xl font-bold leading-tight xl:text-5xl"
          >
            Close the gap between <span className="gradient-text">where you are</span> and where you want to be.
          </motion.h2>

          <ul className="mt-10 space-y-4">
            {POINTS.map((p, i) => (
              <motion.li
                key={p.title}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.12, duration: 0.5 }}
                className="glass-card flex items-start gap-4 p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow">
                  <p.icon className="h-5 w-5 text-white" />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="text-sm text-muted-foreground">{p.text}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Your resume stays private and is never shared.
        </p>
      </aside>

      {/* Form column */}
      <main className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={`relative w-full ${wide ? 'max-w-lg' : 'max-w-md'}`}
        >
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo size="lg" />
          </div>

          <div className="glow-border rounded-[1.75rem]">
            <div className="glass-card rounded-[1.75rem] p-6 sm:p-8">{children}</div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
