import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    env: { GOLDLEAF_OFFER_DATABASE_URL: "", GOLDLEAF_PORTAL_DATABASE_URL: "", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "", RESEND_API_KEY: "" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
