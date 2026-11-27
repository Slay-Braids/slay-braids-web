import { defineConfig, devices } from "@playwright/test";
// The same e2e suites, run against the deployed Vercel preview (not committed; session cookie from the share link).
// SHARE_STATE: cookies from a Vercel share link (protected previews); unset for the public production domain.
const state = process.env.SHARE_STATE || undefined;
export default defineConfig({
  testDir: "../../tests/e2e",
  timeout: 120_000,
  retries: 0,
  workers: 2,
  use: {
    baseURL: process.env.DEPLOYED_URL,
    trace: "off",
    extraHTTPHeaders: process.env.SKIP_TOOLBAR ? { "x-vercel-skip-toolbar": "1" } : undefined,
    storageState: state,
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: state } },
    { name: "mobile", use: { ...devices["Pixel 7"], storageState: state } },
  ],
});
