'use client';

import { motion } from 'framer-motion';
import { Upload, Target, TrendingUp, Zap, Map, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Upload,
    title: 'Instant Resume Parsing',
    description: 'Upload your PDF resume. Our system accurately extracts your skills, experience, and education history in seconds.',
    color: 'from-blue-500 to-cyan-400',
    span: 'lg:col-span-2',
  },
  {
    icon: Target,
    title: 'Precision Gap Analysis',
    description: 'Paste any job description and let Gemini AI instantly identify the exact skills you are missing to be a top candidate.',
    color: 'from-brand-500 to-fuchsia-400',
    span: '',
  },
  {
    icon: TrendingUp,
    title: 'Match Scoring',
    description: 'Get an immediate ATS compatibility score so you know exactly where you stand against the competition.',
    color: 'from-emerald-500 to-green-400',
    span: '',
  },
  {
    icon: Zap,
    title: 'Actionable ATS Tips',
    description: 'Receive specific, actionable recommendations on how to tweak your bullet points and keywords to beat the resume screening software.',
    color: 'from-amber-500 to-orange-400',
    span: 'lg:col-span-2',
  },
  {
    icon: Map,
    title: 'Skill Roadmaps',
    description: 'Discover exactly what technologies and frameworks you need to learn next to bridge your unique career gap.',
    color: 'from-rose-500 to-pink-400',
    span: '',
  },
  {
    icon: MessageSquare,
    title: 'AI Career Coach',
    description: 'Chat with your personal AI career coach 24/7. Get tailored advice on interview prep, salary negotiation, and career moves based on your unique profile.',
    color: 'from-sky-500 to-blue-400',
    span: 'lg:col-span-2',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center md:mb-16">
          <span className="eyebrow">Features</span>
          <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">
            Everything you need to <span className="gradient-text">level up</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Six AI-driven tools that work together to accelerate your career growth.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
              viewport={{ once: true, margin: '-60px' }}
              className={cn('glass-card-hover group relative overflow-hidden p-6 sm:p-7', feature.span)}
            >
              {/* Corner glow that follows the card's accent on hover */}
              <div className={cn('pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30', feature.color)} />
              <div className={cn('relative mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110', feature.color)}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="relative mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="relative text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
