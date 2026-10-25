const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roadmaps = await prisma.roadmap.findMany();
  console.log(JSON.stringify(roadmaps, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
