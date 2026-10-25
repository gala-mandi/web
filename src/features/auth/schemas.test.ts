import { describe, expect, it } from "vitest";
import {
  maskIdentifier,
  normalizeIdentifier,
  normalizePhone,
  passwordStrength,
} from "./schemas";

describe("auth schemas", () => {
  it.each([
    ["03001234567", "03001234567"],
    ["0300 1234567", "03001234567"],
    ["300 1234567", "03001234567"],
    ["+92 300 1234567", "03001234567"],
    ["0300-1234567", "03001234567"],
  ])("normalises the phone %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("rejects numbers that are not Pakistani mobiles", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("0421234567")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
  });

  it("keeps emails as typed and normalises phones", () => {
    expect(normalizeIdentifier(" owner@shop.pk ")).toBe("owner@shop.pk");
    expect(normalizeIdentifier("0300 1234567")).toBe("03001234567");
  });

  it("masks phones and emails", () => {
    expect(maskIdentifier("03001234567")).toBe("0300 •••• 567");
    expect(maskIdentifier("owner@shop.pk")).toBe("o•••@shop.pk");
  });

  it("rates password strength", () => {
    expect(passwordStrength("short")).toBe(0);
    expect(passwordStrength("abcdefgh")).toBe(1);
    expect(passwordStrength("Gandum2026")).toBe(3);
    expect(passwordStrength("Gandum2026!")).toBe(4);
  });
});
