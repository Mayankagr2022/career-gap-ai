'use client';

import { motion } from 'framer-motion';
import { Upload, Target, TrendingUp, Zap, Map, MessageSquare } from 'lucide-react';

const FEATURES = [
  {
    icon: Upload,
    title: 'Instant Resume Parsing',
    description: 'Upload your PDF resume. Our system accurately extracts your skills, experience, and education history in seconds.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    icon: Target,
    title: 'Precision Gap Analysis',
    description: 'Paste any job description and let Gemini AI instantly identify the exact skills you are missing to be a top candidate.',
    color: 'from-violet-500 to-purple-400',
  },
  {
    icon: TrendingUp,
    title: 'Match Scoring',
    description: 'Get an immediate ATS compatibility score so you know exactly where you stand against the competition.',
    color: 'from-emerald-500 to-green-400',
  },
  {
    icon: Zap,
    title: 'Actionable ATS Tips',
    description: 'Receive specific, actionable recommendations on how to tweak your bullet points and keywords to beat the resume screening software.',
    color: 'from-amber-500 to-orange-400',
  },
  {
    icon: Map,
    title: 'Skill Roadmaps',
    description: 'Discover exactly what technologies and frameworks you need to learn next to bridge your unique career gap.',
    color: 'from-rose-500 to-pink-400',
  },
  {
    icon: MessageSquare,
    title: 'AI Career Coach',
    description: 'Chat with your personal AI career coach 24/7. Get tailored advice on interview prep, salary negotiation, and career moves based on your unique profile.',
    color: 'from-sky-500 to-blue-400',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-12 md:py-20 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-display text-4xl font-bold md:text-5xl">
            Everything you need to{' '}
            <span className="gradient-text">level up</span>
          </h2>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Six powerful AI-driven tools that work together to accelerate your career growth.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass-card-hover p-6"
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color}`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
