import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default user (Bian)
  const user = await prisma.user.upsert({
    where: { email: 'bian@ambis.tracker' },
    update: {},
    create: {
      email: 'bian@ambis.tracker',
      name: 'Bian',
    },
  });

  console.log('Seeded default user:', user);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
