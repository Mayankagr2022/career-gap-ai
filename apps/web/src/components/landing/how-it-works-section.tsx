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
    <section id="how-it-works" className="scroll-mt-24 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center md:mb-16">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-5 font-display text-4xl font-bold md:text-5xl">
            From resume to roadmap in <span className="gradient-text">minutes</span>
          </h2>
        </div>

        <div className="relative">
          {/* Vertical rail on phones, horizontal rail on desktop */}
          <div className="absolute bottom-6 left-[1.65rem] top-6 w-px bg-gradient-to-b from-brand-500/60 via-violet-500/40 to-transparent lg:hidden" />
          <div className="absolute left-[12%] right-[12%] top-[1.65rem] hidden h-px bg-gradient-to-r from-brand-500/60 via-violet-500/50 to-cyan-400/50 lg:block" />

          <div className="grid gap-8 lg:grid-cols-4 lg:gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                viewport={{ once: true, margin: '-40px' }}
                className="relative flex gap-5 lg:flex-col lg:items-center lg:text-center"
              >
                <div className="relative z-10 flex h-[3.3rem] w-[3.3rem] shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-card font-display text-lg font-bold shadow-[0_0_30px_-4px_hsl(262_90%_66%/0.7)]">
                  <span className="gradient-text">{step.step}</span>
                </div>
                <div className="glass-card w-full flex-1 p-5 lg:mt-5">
                  <h3 className="mb-1.5 font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
