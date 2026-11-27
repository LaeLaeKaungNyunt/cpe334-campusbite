import { defineConfig } from '@playwright/test';

const testDatabase = process.env.TEST_DATABASE_URL;
const database = testDatabase && URL.canParse(testDatabase) ? new URL(testDatabase) : null;
if (!database || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
    !/(^|[_-])test($|[_-])/i.test(database.pathname.slice(1))) {
  throw new Error('Set TEST_DATABASE_URL to a local, seeded PostgreSQL test database.');
}

const baseURL = 'http://127.0.0.1:4178';
export default defineConfig({
  testDir: 'e2e',
  testMatch: 'menuAdmin.spec.ts',
  outputDir: '.cache/playwright/f05',
  workers: 1,
  use: { baseURL },
  webServer: {
    command: 'node -e "import(\'./backend/dist/app.js\').then(({ app }) => app.listen(4178, \'127.0.0.1\'))"',
    url: `${baseURL}/api/ready`,
    env: { DATABASE_URL: testDatabase!, NODE_ENV: 'production' },
    reuseExistingServer: false,
  },
});
