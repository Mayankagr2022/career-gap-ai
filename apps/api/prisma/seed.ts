import { PrismaClient, Role, AuthProvider, RecommendationType, DifficultyLevel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@careergap.ai' },
    update: {},
    create: {
      email: 'admin@careergap.ai',
      name: 'Admin User',
      password: adminPassword,
      role: Role.ADMIN,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  // Create demo user
  const demoPassword = await bcrypt.hash('Demo@123', 12);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@careergap.ai' },
    update: {},
    create: {
      email: 'demo@careergap.ai',
      name: 'Demo User',
      password: demoPassword,
      role: Role.USER,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
    },
  });
  console.log(`✅ Created demo user: ${demo.email}`);

  // Seed skill market data
  const skills = [
    {
      skill: 'TypeScript',
      demandScore: 9.2,
      trend: 'RISING',
      averageSalary: 145000,
      jobCount: 85000,
      topCompanies: ['Google', 'Microsoft', 'Meta', 'Amazon'],
      relatedSkills: ['JavaScript', 'React', 'Node.js', 'Angular'],
    },
    {
      skill: 'React',
      demandScore: 9.5,
      trend: 'RISING',
      averageSalary: 140000,
      jobCount: 120000,
      topCompanies: ['Meta', 'Netflix', 'Airbnb', 'Stripe'],
      relatedSkills: ['TypeScript', 'Next.js', 'Redux', 'GraphQL'],
    },
    {
      skill: 'Python',
      demandScore: 9.8,
      trend: 'RISING',
      averageSalary: 155000,
      jobCount: 200000,
      topCompanies: ['Google', 'Apple', 'OpenAI', 'DeepMind'],
      relatedSkills: ['Machine Learning', 'TensorFlow', 'PyTorch', 'Django'],
    },
    {
      skill: 'Kubernetes',
      demandScore: 8.7,
      trend: 'RISING',
      averageSalary: 160000,
      jobCount: 65000,
      topCompanies: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Red Hat'],
      relatedSkills: ['Docker', 'Terraform', 'Helm', 'CI/CD'],
    },
    {
      skill: 'AWS',
      demandScore: 9.4,
      trend: 'STABLE',
      averageSalary: 158000,
      jobCount: 180000,
      topCompanies: ['Amazon', 'Deloitte', 'Accenture', 'JPMorgan'],
      relatedSkills: ['Terraform', 'Kubernetes', 'Lambda', 'S3'],
    },
    {
      skill: 'Machine Learning',
      demandScore: 9.6,
      trend: 'RISING',
      averageSalary: 175000,
      jobCount: 95000,
      topCompanies: ['OpenAI', 'Google', 'Anthropic', 'Nvidia'],
      relatedSkills: ['Python', 'TensorFlow', 'PyTorch', 'Data Science'],
    },
    {
      skill: 'GraphQL',
      demandScore: 7.8,
      trend: 'STABLE',
      averageSalary: 135000,
      jobCount: 35000,
      topCompanies: ['Meta', 'GitHub', 'Shopify', 'Twitter'],
      relatedSkills: ['REST API', 'Apollo', 'Node.js', 'TypeScript'],
    },
    {
      skill: 'Go',
      demandScore: 8.4,
      trend: 'RISING',
      averageSalary: 162000,
      jobCount: 45000,
      topCompanies: ['Google', 'Uber', 'Cloudflare', 'Docker'],
      relatedSkills: ['Rust', 'Kubernetes', 'gRPC', 'Microservices'],
    },
    {
      skill: 'Rust',
      demandScore: 8.1,
      trend: 'RISING',
      averageSalary: 168000,
      jobCount: 20000,
      topCompanies: ['Mozilla', 'Microsoft', 'Cloudflare', 'AWS'],
      relatedSkills: ['Go', 'C++', 'Systems Programming', 'WebAssembly'],
    },
    {
      skill: 'LLM Engineering',
      demandScore: 9.9,
      trend: 'RISING',
      averageSalary: 185000,
      jobCount: 25000,
      topCompanies: ['OpenAI', 'Anthropic', 'Google', 'Cohere'],
      relatedSkills: ['Python', 'Machine Learning', 'LangChain', 'RAG'],
    },
  ];

  const additionalSkills = [
    { skill: 'Docker', demandScore: 9.0, trend: 'STABLE', averageSalary: 148000, jobCount: 130000, topCompanies: ['AWS', 'Google', 'Microsoft', 'Stripe'], relatedSkills: ['Kubernetes', 'CI/CD', 'DevOps', 'Terraform'] },
    { skill: 'Next.js', demandScore: 8.9, trend: 'RISING', averageSalary: 138000, jobCount: 55000, topCompanies: ['Vercel', 'Shopify', 'Loom', 'HashiCorp'], relatedSkills: ['React', 'TypeScript', 'Node.js', 'TailwindCSS'] },
    { skill: 'PostgreSQL', demandScore: 8.6, trend: 'STABLE', averageSalary: 140000, jobCount: 90000, topCompanies: ['Stripe', 'Heroku', 'Supabase', 'Neon'], relatedSkills: ['SQL', 'Redis', 'MongoDB', 'Prisma'] },
    { skill: 'Node.js', demandScore: 8.8, trend: 'STABLE', averageSalary: 132000, jobCount: 110000, topCompanies: ['Netflix', 'LinkedIn', 'PayPal', 'Uber'], relatedSkills: ['TypeScript', 'Express', 'NestJS', 'GraphQL'] },
    { skill: 'TensorFlow', demandScore: 8.5, trend: 'STABLE', averageSalary: 165000, jobCount: 40000, topCompanies: ['Google', 'Nvidia', 'Intel', 'IBM'], relatedSkills: ['Python', 'Machine Learning', 'PyTorch', 'Keras'] },
    { skill: 'PyTorch', demandScore: 9.1, trend: 'RISING', averageSalary: 170000, jobCount: 42000, topCompanies: ['Meta', 'OpenAI', 'Waymo', 'Nvidia'], relatedSkills: ['Python', 'Machine Learning', 'TensorFlow', 'CUDA'] },
    { skill: 'Terraform', demandScore: 8.3, trend: 'RISING', averageSalary: 155000, jobCount: 52000, topCompanies: ['HashiCorp', 'AWS', 'Google Cloud', 'Deloitte'], relatedSkills: ['Kubernetes', 'AWS', 'CI/CD', 'Ansible'] },
    { skill: 'Redis', demandScore: 8.2, trend: 'STABLE', averageSalary: 142000, jobCount: 60000, topCompanies: ['Redis Labs', 'Cloudflare', 'Snapchat', 'Twitter'], relatedSkills: ['PostgreSQL', 'MongoDB', 'Node.js', 'Caching'] },
    { skill: 'Data Engineering', demandScore: 9.0, trend: 'RISING', averageSalary: 160000, jobCount: 70000, topCompanies: ['Snowflake', 'Databricks', 'Airflow', 'dbt Labs'], relatedSkills: ['Python', 'Spark', 'SQL', 'Airflow'] },
    { skill: 'Figma', demandScore: 7.9, trend: 'RISING', averageSalary: 118000, jobCount: 38000, topCompanies: ['Figma', 'Adobe', 'Airbnb', 'Google'], relatedSkills: ['UI/UX', 'Design Systems', 'Prototyping', 'CSS'] },
    { skill: 'DevOps', demandScore: 9.3, trend: 'RISING', averageSalary: 162000, jobCount: 150000, topCompanies: ['Amazon', 'Microsoft', 'IBM', 'GitLab'], relatedSkills: ['Kubernetes', 'CI/CD', 'Terraform', 'Linux'] },
    { skill: 'Java', demandScore: 8.7, trend: 'STABLE', averageSalary: 138000, jobCount: 185000, topCompanies: ['Goldman Sachs', 'Amazon', 'Oracle', 'SAP'], relatedSkills: ['Spring Boot', 'Microservices', 'Kafka', 'Maven'] },
    { skill: 'Spring Boot', demandScore: 8.4, trend: 'STABLE', averageSalary: 142000, jobCount: 95000, topCompanies: ['VMware', 'Goldman Sachs', 'Pivotal', 'Netflix'], relatedSkills: ['Java', 'Microservices', 'REST API', 'Kubernetes'] },
    { skill: 'Kafka', demandScore: 8.6, trend: 'RISING', averageSalary: 158000, jobCount: 48000, topCompanies: ['LinkedIn', 'Confluent', 'Uber', 'Twitter'], relatedSkills: ['Data Engineering', 'Spark', 'Java', 'Redis'] },
    { skill: 'Solidity', demandScore: 7.2, trend: 'DECLINING', averageSalary: 145000, jobCount: 12000, topCompanies: ['Coinbase', 'Binance', 'ConsenSys', 'OpenSea'], relatedSkills: ['Ethereum', 'Web3', 'JavaScript', 'Smart Contracts'] },
  ];

  const allSkills = [...skills, ...additionalSkills];
  for (const skill of allSkills) {
    await prisma.skillMarketData.upsert({
      where: { skill: skill.skill },
      update: skill,
      create: skill,
    });
  }
  console.log(`✅ Seeded ${allSkills.length} skill market data records`);

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
