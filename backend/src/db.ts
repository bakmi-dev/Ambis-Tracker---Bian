import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing in environment variables!");
}

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
