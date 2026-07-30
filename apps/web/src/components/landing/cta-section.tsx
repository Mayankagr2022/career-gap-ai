'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Brain, ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-12 md:py-20 px-6">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card relative overflow-hidden p-8 sm:p-12 md:p-16"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-violet-500/5 to-transparent" />
          <div className="relative">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h2 className="mb-4 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
              Ready to bridge your gap?
            </h2>
            <p className="mb-8 text-base text-muted-foreground sm:text-lg">
              Join 50,000+ professionals who are actively closing their skill gaps and landing their dream roles.
            </p>
            <Link href="/auth/register" className="btn-primary px-6 py-4 text-base sm:px-10 inline-flex">
              Start Your Free Analysis
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
