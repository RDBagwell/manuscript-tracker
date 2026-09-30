import { defineConfig, devices } from '@playwright/test'

// Node globals without pulling in @types/node for one env read.
declare const process: { env: Record<string, string | undefined> }

/**
 * Demo walkthrough capture, not a regression suite: drives a running,
 * seeded stack and writes screenshots plus a video to docs/screenshots/.
 *
 *   make dev-setup && make fresh        # from the repo root
 *   npx playwright install chromium     # once
 *   npm run demo:capture                # from frontend/
 *
 * DEMO_BASE_URL points it elsewhere (default http://localhost, the
 * nginx front door of the dev stack).
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 180_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.DEMO_BASE_URL ?? 'http://localhost',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    // Paced so the recording is watchable rather than a blur.
    launchOptions: { slowMo: 150 },
  },
})
