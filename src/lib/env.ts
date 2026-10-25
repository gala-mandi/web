import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

/** Throws one error listing every missing or wrong variable. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const lines = result.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(
    `Invalid environment variables:\n${lines.join("\n")}\nCheck your .env.local file against .env.example.`,
  );
}

// NEXT_PUBLIC_* values are inlined at build time, so each one is read by name.
export const env = parseEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
