import { PrismaClient, Role, AuthProvider, SkillCategory, SkillTrend } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9+#]/g, '');

interface SeedSkill {
  name: string;
  category?: SkillCategory;
  demandScore: number;
  trend: SkillTrend;
  averageSalary: number;
  jobCount: number;
  topCompanies: string[];
  related: string[];
  aliases?: string[];
}

const T = SkillTrend;
const C = SkillCategory;

const SKILLS: SeedSkill[] = [
  { name: 'TypeScript', demandScore: 9.2, trend: T.RISING, averageSalary: 145000, jobCount: 85000, topCompanies: ['Google', 'Microsoft', 'Meta', 'Amazon'], related: ['JavaScript', 'React', 'Node.js', 'Angular'], aliases: ['TS'] },
  { name: 'JavaScript', demandScore: 9.4, trend: T.STABLE, averageSalary: 135000, jobCount: 190000, topCompanies: ['Google', 'Meta', 'Netflix', 'Shopify'], related: ['TypeScript', 'React', 'Node.js'], aliases: ['JS', 'ECMAScript', 'ES6'] },
  { name: 'React', demandScore: 9.5, trend: T.RISING, averageSalary: 140000, jobCount: 120000, topCompanies: ['Meta', 'Netflix', 'Airbnb', 'Stripe'], related: ['TypeScript', 'Next.js', 'Redux', 'GraphQL'], aliases: ['React.js', 'ReactJS'] },
  { name: 'Python', demandScore: 9.8, trend: T.RISING, averageSalary: 155000, jobCount: 200000, topCompanies: ['Google', 'Apple', 'OpenAI', 'DeepMind'], related: ['Machine Learning', 'TensorFlow', 'PyTorch', 'Django'] },
  { name: 'Kubernetes', category: C.TOOL, demandScore: 8.7, trend: T.RISING, averageSalary: 160000, jobCount: 65000, topCompanies: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Red Hat'], related: ['Docker', 'Terraform', 'CI/CD'], aliases: ['K8s'] },
  { name: 'AWS', category: C.TOOL, demandScore: 9.4, trend: T.STABLE, averageSalary: 158000, jobCount: 180000, topCompanies: ['Amazon', 'Deloitte', 'Accenture', 'JPMorgan'], related: ['Terraform', 'Kubernetes', 'Docker'], aliases: ['Amazon Web Services'] },
  { name: 'Machine Learning', category: C.DOMAIN, demandScore: 9.6, trend: T.RISING, averageSalary: 175000, jobCount: 95000, topCompanies: ['OpenAI', 'Google', 'Anthropic', 'Nvidia'], related: ['Python', 'TensorFlow', 'PyTorch', 'Data Engineering'], aliases: ['ML'] },
  { name: 'GraphQL', demandScore: 7.8, trend: T.STABLE, averageSalary: 135000, jobCount: 35000, topCompanies: ['Meta', 'GitHub', 'Shopify', 'Twitter'], related: ['REST API', 'Node.js', 'TypeScript', 'React'] },
  { name: 'Go', demandScore: 8.4, trend: T.RISING, averageSalary: 162000, jobCount: 45000, topCompanies: ['Google', 'Uber', 'Cloudflare', 'Docker'], related: ['Rust', 'Kubernetes', 'Microservices'], aliases: ['Golang'] },
  { name: 'Rust', demandScore: 8.1, trend: T.RISING, averageSalary: 168000, jobCount: 20000, topCompanies: ['Mozilla', 'Microsoft', 'Cloudflare', 'AWS'], related: ['Go', 'C++', 'WebAssembly'] },
  { name: 'C++', demandScore: 8.0, trend: T.STABLE, averageSalary: 150000, jobCount: 70000, topCompanies: ['Nvidia', 'Microsoft', 'Google', 'Apple'], related: ['Rust', 'Go'], aliases: ['cpp'] },
  { name: 'LLM Engineering', category: C.DOMAIN, demandScore: 9.9, trend: T.RISING, averageSalary: 185000, jobCount: 25000, topCompanies: ['OpenAI', 'Anthropic', 'Google', 'Cohere'], related: ['Python', 'Machine Learning', 'RAG'], aliases: ['LLMs', 'Large Language Models'] },
  { name: 'RAG', category: C.DOMAIN, demandScore: 8.8, trend: T.RISING, averageSalary: 178000, jobCount: 14000, topCompanies: ['OpenAI', 'Anthropic', 'Cohere', 'Pinecone'], related: ['LLM Engineering', 'Python', 'PostgreSQL'], aliases: ['Retrieval Augmented Generation'] },
  { name: 'Docker', category: C.TOOL, demandScore: 9.0, trend: T.STABLE, averageSalary: 148000, jobCount: 130000, topCompanies: ['AWS', 'Google', 'Microsoft', 'Stripe'], related: ['Kubernetes', 'CI/CD', 'DevOps', 'Terraform'] },
  { name: 'Next.js', demandScore: 8.9, trend: T.RISING, averageSalary: 138000, jobCount: 55000, topCompanies: ['Vercel', 'Shopify', 'Loom', 'HashiCorp'], related: ['React', 'TypeScript', 'Node.js', 'TailwindCSS'], aliases: ['NextJS'] },
  { name: 'PostgreSQL', category: C.TOOL, demandScore: 8.6, trend: T.STABLE, averageSalary: 140000, jobCount: 90000, topCompanies: ['Stripe', 'Heroku', 'Supabase', 'Neon'], related: ['SQL', 'Redis', 'Prisma'], aliases: ['Postgres'] },
  { name: 'SQL', demandScore: 9.1, trend: T.STABLE, averageSalary: 125000, jobCount: 210000, topCompanies: ['Amazon', 'Microsoft', 'Oracle', 'Snowflake'], related: ['PostgreSQL', 'Data Engineering'] },
  { name: 'Node.js', demandScore: 8.8, trend: T.STABLE, averageSalary: 132000, jobCount: 110000, topCompanies: ['Netflix', 'LinkedIn', 'PayPal', 'Uber'], related: ['TypeScript', 'NestJS', 'GraphQL', 'JavaScript'], aliases: ['NodeJS'] },
  { name: 'NestJS', demandScore: 7.9, trend: T.RISING, averageSalary: 135000, jobCount: 18000, topCompanies: ['Adidas', 'Roche', 'Capgemini'], related: ['Node.js', 'TypeScript'] },
  { name: 'TensorFlow', demandScore: 8.5, trend: T.STABLE, averageSalary: 165000, jobCount: 40000, topCompanies: ['Google', 'Nvidia', 'Intel', 'IBM'], related: ['Python', 'Machine Learning', 'PyTorch'] },
  { name: 'PyTorch', demandScore: 9.1, trend: T.RISING, averageSalary: 170000, jobCount: 42000, topCompanies: ['Meta', 'OpenAI', 'Waymo', 'Nvidia'], related: ['Python', 'Machine Learning', 'TensorFlow'] },
  { name: 'Terraform', category: C.TOOL, demandScore: 8.3, trend: T.RISING, averageSalary: 155000, jobCount: 52000, topCompanies: ['HashiCorp', 'AWS', 'Google Cloud', 'Deloitte'], related: ['Kubernetes', 'AWS', 'CI/CD'] },
  { name: 'Redis', category: C.TOOL, demandScore: 8.2, trend: T.STABLE, averageSalary: 142000, jobCount: 60000, topCompanies: ['Redis Labs', 'Cloudflare', 'Snapchat', 'Twitter'], related: ['PostgreSQL', 'Node.js'] },
  { name: 'Data Engineering', category: C.DOMAIN, demandScore: 9.0, trend: T.RISING, averageSalary: 160000, jobCount: 70000, topCompanies: ['Snowflake', 'Databricks', 'dbt Labs'], related: ['Python', 'SQL', 'Kafka'] },
  { name: 'Figma', category: C.TOOL, demandScore: 7.9, trend: T.RISING, averageSalary: 118000, jobCount: 38000, topCompanies: ['Figma', 'Adobe', 'Airbnb', 'Google'], related: ['UI/UX', 'Design Systems'] },
  { name: 'DevOps', category: C.DOMAIN, demandScore: 9.3, trend: T.RISING, averageSalary: 162000, jobCount: 150000, topCompanies: ['Amazon', 'Microsoft', 'IBM', 'GitLab'], related: ['Kubernetes', 'CI/CD', 'Terraform', 'Docker'] },
  { name: 'CI/CD', category: C.TOOL, demandScore: 8.6, trend: T.STABLE, averageSalary: 150000, jobCount: 80000, topCompanies: ['GitLab', 'GitHub', 'CircleCI'], related: ['DevOps', 'Docker', 'Kubernetes'], aliases: ['CICD'] },
  { name: 'Java', demandScore: 8.7, trend: T.STABLE, averageSalary: 138000, jobCount: 185000, topCompanies: ['Goldman Sachs', 'Amazon', 'Oracle', 'SAP'], related: ['Spring Boot', 'Microservices', 'Kafka'] },
  { name: 'Spring Boot', demandScore: 8.4, trend: T.STABLE, averageSalary: 142000, jobCount: 95000, topCompanies: ['VMware', 'Goldman Sachs', 'Netflix'], related: ['Java', 'Microservices', 'REST API'], aliases: ['Spring'] },
  { name: 'Kafka', category: C.TOOL, demandScore: 8.6, trend: T.RISING, averageSalary: 158000, jobCount: 48000, topCompanies: ['LinkedIn', 'Confluent', 'Uber', 'Twitter'], related: ['Data Engineering', 'Java'], aliases: ['Apache Kafka'] },
  { name: 'Microservices', category: C.DOMAIN, demandScore: 8.5, trend: T.STABLE, averageSalary: 150000, jobCount: 100000, topCompanies: ['Netflix', 'Uber', 'Amazon'], related: ['Docker', 'Kubernetes', 'REST API'] },
  { name: 'REST API', category: C.DOMAIN, demandScore: 8.7, trend: T.STABLE, averageSalary: 130000, jobCount: 160000, topCompanies: ['Stripe', 'Twilio', 'Amazon'], related: ['GraphQL', 'Node.js', 'Microservices'], aliases: ['RESTful APIs', 'REST'] },
  { name: 'Solidity', demandScore: 7.2, trend: T.DECLINING, averageSalary: 145000, jobCount: 12000, topCompanies: ['Coinbase', 'Binance', 'ConsenSys', 'OpenSea'], related: ['JavaScript'] },
  { name: 'Communication', category: C.SOFT, demandScore: 9.0, trend: T.STABLE, averageSalary: 0, jobCount: 300000, topCompanies: [], related: ['Leadership', 'Teamwork'] },
  { name: 'Leadership', category: C.SOFT, demandScore: 8.8, trend: T.STABLE, averageSalary: 0, jobCount: 250000, topCompanies: [], related: ['Communication', 'Teamwork'] },
  { name: 'Teamwork', category: C.SOFT, demandScore: 8.5, trend: T.STABLE, averageSalary: 0, jobCount: 280000, topCompanies: [], related: ['Communication', 'Leadership'], aliases: ['Collaboration'] },
];

async function main() {
  console.log('🌱 Seeding database (schema v2)...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = [
    { email: 'admin@careergap.ai', name: 'Admin User', password: 'Admin@123', role: Role.ADMIN },
    { email: 'demo@careergap.ai', name: 'Demo User', password: 'Demo@123', role: Role.USER },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: await bcrypt.hash(u.password, 12),
        role: u.role,
        provider: AuthProvider.LOCAL,
        isEmailVerified: true,
      },
    });
  }
  console.log(`✅ Users: ${users.map((u) => u.email).join(', ')}`);

  // ── Skills catalog ─────────────────────────────────────────────────────────
  const skillIds = new Map<string, string>(); // slug -> id

  const ensureSkill = async (name: string, category: SkillCategory = C.TECHNICAL) => {
    const slug = slugOf(name);
    const known = skillIds.get(slug);
    if (known) return known;
    const skill = await prisma.skill.upsert({
      where: { slug },
      update: {},
      create: { slug, name, category },
    });
    skillIds.set(slug, skill.id);
    return skill.id;
  };

  // Seed the skills themselves first (with their declared category) ...
  for (const s of SKILLS) {
    const slug = slugOf(s.name);
    const skill = await prisma.skill.upsert({
      where: { slug },
      update: { category: s.category ?? C.TECHNICAL },
      create: { slug, name: s.name, category: s.category ?? C.TECHNICAL },
    });
    skillIds.set(slug, skill.id);
  }

  // ... then aliases, relations (creating any related-only skills on demand) and market stats
  let relations = 0;
  for (const s of SKILLS) {
    const skillId = skillIds.get(slugOf(s.name))!;

    for (const alias of s.aliases ?? []) {
      const aliasSlug = slugOf(alias);
      if (aliasSlug === slugOf(s.name)) continue; // already the canonical slug
      await prisma.skillAlias.upsert({
        where: { alias: aliasSlug },
        update: { skillId },
        create: { alias: aliasSlug, skillId },
      });
    }

    for (const rel of s.related) {
      const relatedSkillId = await ensureSkill(rel);
      await prisma.skillRelation.upsert({
        where: { skillId_relatedSkillId: { skillId, relatedSkillId } },
        update: {},
        create: { skillId, relatedSkillId },
      });
      relations++;
    }

    const stat = {
      demandScore: s.demandScore,
      trend: s.trend,
      averageSalary: s.averageSalary || null,
      jobCount: s.jobCount,
      topCompanies: s.topCompanies,
      source: 'seed',
    };
    await prisma.skillMarketStat.upsert({
      where: { skillId },
      update: { ...stat, lastUpdated: new Date() },
      create: { skillId, ...stat },
    });
  }

  // First snapshot per skill (only if there is no history yet) so trend charts have a baseline
  const withHistory = new Set(
    (await prisma.skillMarketSnapshot.findMany({ select: { skillId: true }, distinct: ['skillId'] })).map(
      (r) => r.skillId,
    ),
  );
  const snapshots = SKILLS.filter((s) => !withHistory.has(skillIds.get(slugOf(s.name))!)).map((s) => ({
    skillId: skillIds.get(slugOf(s.name))!,
    demandScore: s.demandScore,
    averageSalary: s.averageSalary || null,
    jobCount: s.jobCount,
  }));
  if (snapshots.length) await prisma.skillMarketSnapshot.createMany({ data: snapshots });

  console.log(
    `✅ Skills: ${skillIds.size} in catalog, ${SKILLS.length} with market stats, ${relations} relations, ${snapshots.length} new snapshots`,
  );
  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
