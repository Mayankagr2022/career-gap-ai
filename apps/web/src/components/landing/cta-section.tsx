'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Brain, ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="glow-border relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/60 p-8 text-center backdrop-blur-xl sm:p-14 md:p-20"
        >
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-6 flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-glow-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h2 className="mb-4 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
              Ready to bridge <span className="gradient-text">your gap?</span>
            </h2>
            <p className="mx-auto mb-9 max-w-xl text-base text-muted-foreground sm:text-lg">
              Join 50,000+ professionals who are actively closing their skill gaps and landing their dream roles.
            </p>
            <Link href="/auth/register" className="btn-primary inline-flex px-8 py-4 text-base sm:px-10">
              Start Your Free Analysis
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
