'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle2, ShieldCheck, TrendingUp, Zap } from 'lucide-react';

const STATS = [
  { label: 'Resumes Analyzed', value: '50K+' },
  { label: 'Skill Gaps Identified', value: '2M+' },
  { label: 'Average Match Improvement', value: '43%' },
  { label: 'Success Rate', value: '94%' },
];

const SKILL_BARS = [
  { name: 'System Design', pct: 82, color: 'from-brand-500 to-violet-500' },
  { name: 'TypeScript', pct: 94, color: 'from-brand-500 to-cyan-400' },
  { name: 'Kubernetes', pct: 38, color: 'from-violet-500 to-amber-400' },
];

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

/** Fake product preview: a match-score ring with skill bars and floating chips. Purely decorative. */
function ProductPreview() {
  const score = 87;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-md [perspective:1200px]"
      aria-hidden
    >
      {/* Glow behind the card */}
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-500/40 via-violet-500/25 to-cyan-400/25 blur-3xl" />

      <div className="glass-card glow-border relative p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <i className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <i className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </span>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
            Analysis complete
          </span>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <defs>
                <linearGradient id="hero-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="55%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={RING_R} fill="none" stroke="hsl(252 20% 18%)" strokeWidth="9" />
              <motion.circle
                cx="60" cy="60" r={RING_R} fill="none" stroke="url(#hero-ring)" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={RING_C}
                initial={{ strokeDashoffset: RING_C }}
                animate={{ strokeDashoffset: RING_C * (1 - score / 100) }}
                transition={{ duration: 1.8, delay: 0.9, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold">{score}%</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Match</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {SKILL_BARS.map((s, i) => (
              <div key={s.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-foreground/90">{s.name}</span>
                  <span className="text-muted-foreground">{s.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 1.2, delay: 1 + i * 0.15, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.07] pt-4">
          {['Docker', 'GraphQL', 'CI/CD', 'AWS'].map((t) => (
            <span key={t} className="skill-tag">+ {t}</span>
          ))}
        </div>
      </div>

      {/* Floating chips */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="glass-card absolute -left-3 -top-6 hidden items-center gap-2 rounded-2xl px-3 py-2 sm:flex lg:-left-10"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300"><ShieldCheck className="h-4 w-4" /></span>
        <span className="text-xs"><b className="block font-semibold">ATS-ready</b><span className="text-muted-foreground">92 / 100</span></span>
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        className="glass-card absolute -right-3 bottom-8 hidden items-center gap-2 rounded-2xl px-3 py-2 sm:flex lg:-right-8"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-200"><TrendingUp className="h-4 w-4" /></span>
        <span className="text-xs"><b className="block font-semibold">+43%</b><span className="text-muted-foreground">after fixes</span></span>
      </motion.div>
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <section className="relative px-4 pb-16 pt-32 sm:px-6 sm:pt-36 lg:pb-24 lg:pt-40">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div className="text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="eyebrow normal-case tracking-normal">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Google Gemini AI
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Stop guessing.
            <br />
            Start <span className="gradient-text">matching.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0"
          >
            Upload your resume and a target job description. Our AI pinpoints your exact skill gaps, scores your ATS
            compatibility, and builds the roadmap to close them.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
          >
            <Link href="/auth/register" className="btn-primary px-8 py-4 text-base">
              Start for Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#how-it-works" className="btn-secondary px-8 py-4 text-base">
              <Zap className="h-4 w-4 text-brand-300" />
              See How it Works
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start"
          >
            {['No credit card required', 'Free analysis included', 'Cancel anytime'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <ProductPreview />
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.7 }}
        className="relative mx-auto mt-16 w-full max-w-5xl lg:mt-24"
      >
        <div className="glass-card grid grid-cols-2 gap-y-6 px-4 py-6 sm:px-8 md:grid-cols-4 md:divide-x md:divide-white/[0.07]">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-2 text-center">
              <div className="font-display text-3xl font-bold gradient-text sm:text-4xl">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
