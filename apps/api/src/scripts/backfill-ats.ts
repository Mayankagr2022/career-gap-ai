/**
 * Recompute ATS scores with the deterministic scorer (src/common/scoring/ats-score.ts).
 *
 *   pnpm --filter @career-gap-ai/api build
 *   pnpm --filter @career-gap-ai/api ats:backfill -- --dry-run   # show what would change
 *   pnpm --filter @career-gap-ai/api ats:backfill                # apply
 *
 * Resumes get the format/completeness score. Completed analyses get the combined format + keyword score,
 * an `atsBreakdown` in rawAnalysis, and their KEYWORD_MISSING suggestions rebuilt from the same calculation.
 * Safe to re-run: results depend only on stored data.
 */
import { AnalysisStatus, AtsIssueType, IssueSeverity, JobSkillImportance, Prisma, PrismaClient, ResumeStatus } from '@prisma/client';
import { buildKeywordSuggestions, computeAnalysisAts, scoreResumeStructure } from '../common/scoring/ats-score';

const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

async function backfillResumes() {
  const resumes = await prisma.resume.findMany({
    where: { status: ResumeStatus.ANALYZED, parsedData: { not: Prisma.DbNull } },
    select: { id: true, originalName: true, parsedData: true, rawText: true, atsScore: true },
  });

  let changed = 0;
  for (const r of resumes) {
    const next = scoreResumeStructure(r.parsedData as any, r.rawText).score;
    if (r.atsScore === next) continue;
    changed++;
    console.log(`  resume   ${r.originalName.slice(0, 40).padEnd(40)} ${String(r.atsScore ?? '-').padStart(4)} -> ${next}`);
    if (!dryRun) await prisma.resume.update({ where: { id: r.id }, data: { atsScore: next } });
  }
  console.log(`Resumes: ${changed} of ${resumes.length} ${dryRun ? 'would change' : 'updated'}`);
}

async function backfillAnalyses() {
  const analyses = await prisma.analysis.findMany({
    where: { status: AnalysisStatus.COMPLETED },
    include: {
      resume: { select: { parsedData: true, rawText: true } },
      job: { select: { title: true, skills: { include: { skill: { select: { name: true } } } } } },
    },
  });

  let changed = 0;
  for (const a of analyses) {
    if (!a.resume.parsedData) continue;
    const required = a.job.skills.filter((s) => s.importance === JobSkillImportance.REQUIRED).map((s) => s.skill.name);
    const preferred = a.job.skills.filter((s) => s.importance === JobSkillImportance.PREFERRED).map((s) => s.skill.name);
    const ats = computeAnalysisAts(a.resume.parsedData as any, a.resume.rawText, required, preferred);

    changed++;
    console.log(
      `  analysis ${a.job.title.slice(0, 40).padEnd(40)} ${String(a.atsScore ?? '-').padStart(4)} -> ${ats.score}` +
        `  (format ${ats.structure}, keywords ${ats.keyword ?? 'n/a'})`,
    );
    if (dryRun) continue;

    await prisma.$transaction([
      prisma.analysis.update({
        where: { id: a.id },
        data: {
          atsScore: ats.score,
          rawAnalysis: { ...((a.rawAnalysis as object | null) ?? {}), atsBreakdown: ats } as any,
        },
      }),
      prisma.analysisAtsSuggestion.deleteMany({ where: { analysisId: a.id, type: AtsIssueType.KEYWORD_MISSING } }),
      prisma.analysisAtsSuggestion.createMany({
        data: buildKeywordSuggestions(ats).map((s) => ({
          analysisId: a.id,
          type: AtsIssueType.KEYWORD_MISSING,
          severity: s.severity as IssueSeverity,
          message: s.message,
          suggestion: s.suggestion,
        })),
      }),
    ]);
  }
  console.log(`Analyses: ${changed} of ${analyses.length} ${dryRun ? 'would be rescored' : 'rescored'}`);
}

async function main() {
  console.log(dryRun ? 'DRY RUN: nothing will be written' : 'Applying changes');
  await backfillResumes();
  await backfillAnalyses();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
