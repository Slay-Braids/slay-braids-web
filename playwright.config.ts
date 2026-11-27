import { defineConfig, devices } from "@playwright/test";

// Runs against the static export (`out/`), i.e. the real production build.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "off",
    // Headless WebGL = SwiftShader (CPU). Behaviour tests only; real-device numbers come separately.
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  webServer: {
    command: "npx serve out -l 4173 --no-clipboard",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
