'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

const STATS = [
  { label: 'Resumes Analyzed', value: '50K+' },
  { label: 'Skill Gaps Identified', value: '2M+' },
  { label: 'Average Match Improvement', value: '43%' },
  { label: 'Success Rate', value: '94%' },
];

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 pt-20">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-2 text-sm text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Powered by Google Gemini AI • 50,000+ careers transformed</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 font-display text-6xl font-bold leading-tight tracking-tight md:text-7xl lg:text-8xl"
        >
          Stop Guessing. Start{' '}
          <span className="gradient-text">Matching.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
        >
          Upload your resume and a target job description. Let our advanced AI analyze your profile, identify exact skill gaps, and provide actionable tips to beat the ATS.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <Link href="/auth/register" className="btn-primary px-8 py-4 text-base">
            Start for Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="#how-it-works" className="btn-secondary px-8 py-4 text-base">
            See How it Works
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
        >
          {['No credit card required', 'Free analysis included', 'Cancel anytime'].map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>{item}</span>
            </div>
          ))}
        </motion.div>
        
        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 w-full max-w-4xl px-6"
        >
          <div className="glass-card px-8 py-5">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-3xl font-bold gradient-text">{stat.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
