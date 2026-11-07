import 'dotenv/config';

// Force DATABASE_URL to TEST_DATABASE_URL to isolate tests completely from development data
const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://campusbite:campusbite_test_pw@localhost:5434/campusbite_test?schema=public';

process.env.DATABASE_URL = testDbUrl;
process.env.NODE_ENV = 'test';

// Fail-safe assertion: guarantee tests never connect to development database (port 5433 / campusbite_dev)
if (!process.env.DATABASE_URL.includes(':5434') && !process.env.DATABASE_URL.includes('campusbite_test')) {
  throw new Error(
    `[CRITICAL SAFETY ERROR] Tests must run against isolated test database (port 5434). Attempted to use: ${process.env.DATABASE_URL}`,
  );
}
