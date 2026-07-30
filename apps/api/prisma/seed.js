"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    // Create admin user
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    // const adminPassword = 'Admin@123'
    const admin = await prisma.user.upsert({
        where: { email: 'admin@careergap.ai' },
        update: {},
        create: {
            email: 'admin@careergap.ai',
            name: 'Admin User',
            password: adminPassword,
            role: client_1.Role.ADMIN,
            provider: client_1.AuthProvider.LOCAL,
            isEmailVerified: true,
        },
    });
    console.log(`✅ Created admin user: ${admin.email}`);
    // Create demo user
    const demoPassword = await bcrypt.hash('Demo@123', 12);
    // const demoPassword = 'Demo@123'
    const demo = await prisma.user.upsert({
        where: { email: 'demo@careergap.ai' },
        update: {},
        create: {
            email: 'demo@careergap.ai',
            name: 'Demo User',
            password: demoPassword,
            role: client_1.Role.USER,
            provider: client_1.AuthProvider.LOCAL,
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
    for (const skill of skills) {
        await prisma.skillMarketData.upsert({
            where: { skill: skill.skill },
            update: skill,
            create: skill,
        });
    }
    console.log(`✅ Seeded ${skills.length} skill market data records`);
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
//# sourceMappingURL=seed.js.map