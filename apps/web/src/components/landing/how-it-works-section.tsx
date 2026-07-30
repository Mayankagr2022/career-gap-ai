'use client';

import { motion } from 'framer-motion';

const HOW_IT_WORKS = [
  { step: '01', title: 'Upload Resume', desc: 'Securely upload your current PDF resume. We parse your skills instantly.' },
  { step: '02', title: 'Add Target Role', desc: 'Paste the job description of your dream role so our AI knows your goal.' },
  { step: '03', title: 'AI Analysis', desc: 'Gemini AI cross-references your profile against the job requirements.' },
  { step: '04', title: 'Bridge the Gap', desc: 'Review your personalized match score, missing skills, and ATS recommendations.' },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-12 md:py-20 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-display text-4xl font-bold md:text-5xl">
            From resume to roadmap in{' '}
            <span className="gradient-text">minutes</span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              viewport={{ once: true }}
              className="relative"
            >
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="absolute left-full top-6 hidden w-8 border-t border-dashed border-brand-500/30 lg:block" />
              )}
              <div className="glass-card p-6">
                <div className="mb-4 font-display text-3xl font-bold gradient-text">{step.step}</div>
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
