import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Messages per language from `src/i18n/request.ts` (no locale in the URL).
const withNextIntl = createNextIntlPlugin({
  experimental: { createMessagesDeclaration: "./messages/en.json" },
});

export default withNextIntl(nextConfig);
