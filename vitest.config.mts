import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Every component test renders inside the next-intl provider.
    alias: [
      {
        find: /^@testing-library\/react$/,
        replacement: fileURLToPath(
          new URL("./src/test/rtl.tsx", import.meta.url),
        ),
      },
    ],
  },
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
