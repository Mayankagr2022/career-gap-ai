/**
 * Re-split the skills stored on existing jobs into one skill per entry.
 *
 * Older jobs were saved with whatever the parser returned, including phrases such as
 * "Strong proficiency in Go (concurrency, channels)" or "Kubernetes experience". Those make poor skills for the
 * market stats and for ATS keyword matching. New jobs are split when they are saved; this fixes the earlier ones.
 *
 *   pnpm --filter @career-gap-ai/api build
 *   pnpm --filter @career-gap-ai/api jobs:normalize-skills -- --dry-run
 *   pnpm --filter @career-gap-ai/api jobs:normalize-skills
 *   pnpm --filter @career-gap-ai/api ats:backfill            # re-score analyses against the cleaned skills
 *
 * Skills left unused afterwards stay in the catalog; they just stop appearing in market stats.
 */
import { JobSkillImportance, PrismaClient } from '@prisma/client';
import { singleSkills } from '../common/scoring/ats-score';
import { SkillsService, skillSlug } from '../modules/skills/skills.service';

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();
const skills = new SkillsService(prisma as any);

async function main() {
  console.log(dryRun ? 'DRY RUN: nothing will be written' : 'Applying changes');
  const jobs = await prisma.job.findMany({
    where: { isActive: true },
    select: { id: true, title: true, skills: { select: { importance: true, skill: { select: { name: true, slug: true } } } } },
  });

  let changed = 0;
  for (const job of jobs) {
    const names = (importance: JobSkillImportance) => job.skills.filter((s) => s.importance === importance).map((s) => s.skill.name);
    const required = singleSkills(names(JobSkillImportance.REQUIRED));
    const preferred = singleSkills(names(JobSkillImportance.PREFERRED));

    // Same precedence as saving a job: a skill listed as both ends up REQUIRED
    const wanted = new Map<string, JobSkillImportance>();
    preferred.forEach((n) => wanted.set(skillSlug(n), JobSkillImportance.PREFERRED));
    required.forEach((n) => wanted.set(skillSlug(n), JobSkillImportance.REQUIRED));

    const current = new Map(job.skills.map((s) => [s.skill.slug, s.importance]));
    const same = wanted.size === current.size && [...wanted].every(([slug, imp]) => current.get(slug) === imp);
    if (same) continue;

    changed++;
    console.log(`  ${job.title.slice(0, 44).padEnd(44)} ${String(current.size).padStart(3)} skills -> ${wanted.size}`);
    if (dryRun) continue;

    const catalog = await skills.resolveMany([...required, ...preferred]);
    await prisma.$transaction([
      prisma.jobSkill.deleteMany({ where: { jobId: job.id } }),
      prisma.jobSkill.createMany({
        data: [...wanted.entries()]
          .filter(([slug]) => catalog.has(slug))
          .map(([slug, importance]) => ({ jobId: job.id, skillId: catalog.get(slug)!.id, importance })),
      }),
    ]);
  }
  console.log(`Jobs: ${changed} of ${jobs.length} ${dryRun ? 'would change' : 'updated'}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
