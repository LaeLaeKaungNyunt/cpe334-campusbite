import { defineConfig } from '@playwright/test';
import browserConfig from './playwright.f05.config';

export default defineConfig({
  ...browserConfig,
  testMatch: 'simulatedPayment.spec.ts',
  outputDir: '.cache/playwright/f08',
});
