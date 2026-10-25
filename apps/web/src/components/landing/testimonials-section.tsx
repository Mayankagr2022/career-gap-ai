'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

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
      "I knew I had a skill gap, but I didn't know where to start. The AI analysis broke down the exact cloud technologies I needed to learn to get past the resume screening.",
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
    <section id="testimonials" className="scroll-mt-24 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center md:mb-16">
          <span className="eyebrow">Stories</span>
          <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">
            Real people, <span className="gradient-text">real results</span>
          </h2>
        </div>

        {/* Swipeable row on phones, three columns from tablet up */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 lg:gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className="glass-card-hover relative w-[85%] shrink-0 snap-center p-6 sm:w-auto"
            >
              <Quote className="absolute right-5 top-5 h-8 w-8 text-brand-400/20" />
              <div className="mb-4 flex gap-1">
                {Array.from({ length: t.score }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mb-6 text-sm leading-relaxed text-foreground/80">&ldquo;{t.content}&rdquo;</p>
              <div className="flex items-center gap-3 border-t border-white/[0.07] pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">
                  {t.avatar}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
