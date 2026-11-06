import { describe, expect, it } from "vitest";
import { kgToMaund, maundToKg } from "./units";

describe("maundToKg", () => {
  it("multiplies by 40 kg and keeps 3 decimals", () => {
    expect(maundToKg("25")).toBe("1000.000");
    expect(maundToKg("25.25")).toBe("1010.000");
    expect(maundToKg("0.1")).toBe("4.000");
    expect(maundToKg("12.375")).toBe("495.000");
  });

  it("has no float drift", () => {
    // 0.1 + 0.2 style traps: 1.15 × 40 is 46 exactly.
    expect(maundToKg("1.15")).toBe("46.000");
    expect(maundToKg("0.000025")).toBe("0.001");
  });

  it("returns null for anything that isn't a plain number", () => {
    expect(maundToKg("")).toBeNull();
    expect(maundToKg("12 mn")).toBeNull();
    expect(maundToKg("-1")).toBeNull();
  });
});

describe("kgToMaund", () => {
  it("divides by 40 kg exactly", () => {
    expect(kgToMaund("1000")).toBe("25");
    expect(kgToMaund("1010")).toBe("25.25");
    expect(kgToMaund("1015.5")).toBe("25.3875");
  });

  it("round-trips back to the same kg", () => {
    for (const [kg, stored] of [
      ["1015.5", "1015.500"],
      ["0.001", "0.001"],
      ["999.999", "999.999"],
    ]) {
      expect(maundToKg(kgToMaund(kg) ?? "")).toBe(stored);
    }
  });

  it("returns null for a bad weight", () => {
    expect(kgToMaund("abc")).toBeNull();
  });
});
