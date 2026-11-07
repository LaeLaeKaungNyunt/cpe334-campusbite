import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'DemoPassword123!';

// Stable UUIDs for synthetic seed records (valid RFC 4122 hex digits)
export const SEED_IDS = {
  customerA: '11111111-1111-1111-1111-111111111111',
  customerB: '22222222-2222-2222-2222-222222222222',
  operator: '33333333-3333-3333-3333-333333333333',
  icedLatte: 'a1111111-1111-1111-1111-111111111111',
  chickenSandwich: 'a2222222-2222-2222-2222-222222222222',
  croissant: 'a3333333-3333-3333-3333-333333333333',
  seasonalMatcha: 'a4444444-4444-4444-4444-444444444444',
};

async function main() {
  console.log('[seed] Starting database seed...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, salt);

  // 1. Synthetic Accounts (passwords hashed, never plaintext)
  const users = [
    {
      id: SEED_IDS.customerA,
      email: 'customer1@campusbite.test',
      passwordHash,
      role: UserRole.CUSTOMER,
    },
    {
      id: SEED_IDS.customerB,
      email: 'customer2@campusbite.test',
      passwordHash,
      role: UserRole.CUSTOMER,
    },
    {
      id: SEED_IDS.operator,
      email: 'operator@campusbite.test',
      passwordHash,
      role: UserRole.OPERATOR,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash: user.passwordHash,
        role: user.role,
      },
      create: user,
    });
    console.log(`[seed] Seeded user: ${user.email} (${user.role})`);
  }

  // 2. Menu Items
  // Note: Two lattes (2 * 6500 = 13000) + one sandwich (8500) totals 21500 satang (฿215.00)
  const menuItems = [
    {
      id: SEED_IDS.icedLatte,
      name: 'Iced Latte',
      description: 'Freshly brewed espresso poured over cold milk and ice',
      priceSatang: 6500,
      stockQuantity: 10,
      isActive: true,
    },
    {
      id: SEED_IDS.chickenSandwich,
      name: 'Chicken Sandwich',
      description: 'Grilled chicken breast on toasted artisan bread with lettuce',
      priceSatang: 8500,
      stockQuantity: 5,
      isActive: true,
    },
    {
      id: SEED_IDS.croissant,
      name: 'Croissant',
      description: 'Flaky golden butter croissant baked fresh daily (sold out)',
      priceSatang: 4500,
      stockQuantity: 0,
      isActive: true,
    },
    {
      id: SEED_IDS.seasonalMatcha,
      name: 'Seasonal Matcha Latte',
      description: 'Ceremonial grade green tea with steamed milk (currently inactive)',
      priceSatang: 7500,
      stockQuantity: 15,
      isActive: false,
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        description: item.description,
        priceSatang: item.priceSatang,
        stockQuantity: item.stockQuantity,
        isActive: item.isActive,
      },
      create: item,
    });
    console.log(
      `[seed] Seeded menu item: ${item.name} (${item.priceSatang} satang, stock: ${item.stockQuantity}, active: ${item.isActive})`,
    );
  }

  console.log('[seed] Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
