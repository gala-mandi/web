import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: { NEXT_PUBLIC_API_URL: "http://localhost:4000" },
    // Component tests with user events can pass 5s on a busy CI runner.
    testTimeout: 15_000,
  },
});
