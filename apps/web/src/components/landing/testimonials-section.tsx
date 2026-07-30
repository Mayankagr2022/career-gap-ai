'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Frontend Dev → Senior Next.js Engineer',
    avatar: 'SC',
    content:
      'CareerGap AI pointed out exactly which state management libraries and testing frameworks I was missing from my resume. The ATS suggestions were a game changer.',
    score: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Data Analyst → Data Engineer',
    avatar: 'MJ',
    content:
      'I knew I had a skill gap, but I didn\'t know where to start. The AI analysis broke down the exact cloud technologies I needed to learn to get past the resume screening.',
    score: 5,
  },
  {
    name: 'Priya Patel',
    role: 'Product Manager → VP of Product',
    avatar: 'PP',
    content:
      "Seeing my match score go from a 45% to an 85% just by reframing my existing experience based on the AI's suggestions helped me land my dream role.",
    score: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-12 md:py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-display text-4xl font-bold md:text-5xl">
            Real people,{' '}
            <span className="gradient-text">real results</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-6"
            >
              <div className="mb-4 flex gap-1">
                {Array.from({ length: t.score }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">"{t.content}"</p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
