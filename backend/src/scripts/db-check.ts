import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

async function main() {
  try {
    console.log('[db:check] Connecting to PostgreSQL database via Prisma...');
    // Verify basic connectivity
    await prisma.$queryRaw`SELECT 1`;

    const userCount = await prisma.user.count();
    const menuItemCount = await prisma.menuItem.count();

    console.log('[db:check] Connection successful.');
    console.log(`[db:check] Database status: Users in DB = ${userCount}, MenuItems in DB = ${menuItemCount}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[db:check] Database connection verification failed:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
