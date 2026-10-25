import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("accepts a valid API URL", () => {
    expect(parseEnv({ NEXT_PUBLIC_API_URL: "http://localhost:4000" })).toEqual({
      NEXT_PUBLIC_API_URL: "http://localhost:4000",
    });
  });

  it("fails with a clear message when the API URL is missing", () => {
    expect(() => parseEnv({})).toThrow(
      /Invalid environment variables:\n {2}- NEXT_PUBLIC_API_URL:/,
    );
  });

  it("fails when the API URL is not a URL", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_API_URL: "localhost" })).toThrow(
      /NEXT_PUBLIC_API_URL/,
    );
  });
});
