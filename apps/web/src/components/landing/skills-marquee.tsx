const SKILLS = [
  'React', 'TypeScript', 'Python', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'GraphQL',
  'Node.js', 'System Design', 'Machine Learning', 'CI/CD', 'Terraform', 'Next.js', 'Go', 'Figma',
];

/** Endless strip of skills the analyzer recognises. The list is duplicated so the loop is seamless. */
export function SkillsMarquee() {
  const row = [...SKILLS, ...SKILLS];
  return (
    <section aria-label="Skills we analyze" className="relative overflow-hidden border-y border-white/[0.06] bg-white/[0.015] py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
      <div className="marquee gap-3">
        {row.map((s, i) => (
          <span
            key={`${s}-${i}`}
            className="mx-1.5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm text-foreground/80"
          >
            <i className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-brand-400 to-violet-500" />
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}
