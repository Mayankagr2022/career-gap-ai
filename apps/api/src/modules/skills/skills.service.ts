import { Injectable } from '@nestjs/common';
import { Skill, SkillCategory } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Normalised catalog key: "Next.js", "NextJS" and "next js" all become "nextjs". */
export function skillSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9+#]/g, '');
}

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve free-text skill names to catalog rows (matching by slug, then alias),
   * creating missing skills. Returns a map keyed by slug.
   */
  async resolveMany(
    names: string[],
    category: SkillCategory = SkillCategory.TECHNICAL,
  ): Promise<Map<string, Skill>> {
    const bySlug = new Map<string, string>(); // slug -> first-seen display name
    for (const raw of names ?? []) {
      const name = raw?.trim();
      const slug = name ? skillSlug(name) : '';
      if (slug && !bySlug.has(slug)) bySlug.set(slug, name);
    }
    const result = new Map<string, Skill>();
    if (bySlug.size === 0) return result;

    const slugs = [...bySlug.keys()];
    const found = await this.prisma.skill.findMany({ where: { slug: { in: slugs } } });
    found.forEach((s) => result.set(s.slug, s));

    const missing = slugs.filter((s) => !result.has(s));
    if (missing.length) {
      const aliases = await this.prisma.skillAlias.findMany({
        where: { alias: { in: missing } },
        include: { skill: true },
      });
      aliases.forEach((a) => result.set(a.alias, a.skill));
    }

    const toCreate = slugs.filter((s) => !result.has(s));
    if (toCreate.length) {
      await this.prisma.skill.createMany({
        data: toCreate.map((slug) => ({ slug, name: bySlug.get(slug)!, category })),
        skipDuplicates: true,
      });
      const created = await this.prisma.skill.findMany({ where: { slug: { in: toCreate } } });
      created.forEach((s) => result.set(s.slug, s));
    }
    return result;
  }
}
