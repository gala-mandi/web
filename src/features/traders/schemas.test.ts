import { describe, expect, it } from "vitest";
import { readBalance } from "./balance";
import {
  emptyTraderValues,
  toCreateInput,
  toTraderFormValues,
  toUpdateInput,
  traderFormSchema as makeTraderFormSchema,
  type TraderFormValues,
} from "./schemas";
import { testTranslator } from "@/test/intl";
import { trader } from "./test-data";

const traderFormSchema = makeTraderFormSchema(testTranslator("traders"));

function valid(overrides: Partial<TraderFormValues> = {}) {
  return { ...emptyTraderValues(), name: "Aslam", ...overrides };
}

function errorsOf(values: TraderFormValues): Record<string, string> {
  const result = traderFormSchema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((i) => [String(i.path[0]), i.message]),
  );
}

describe("traderFormSchema", () => {
  it("needs only the type and a name of 2..120 characters", () => {
    expect(errorsOf(valid())).toEqual({});
    expect(errorsOf(valid({ name: " A " }))).toEqual({
      name: "Enter the name (at least 2 characters)",
    });
    expect(errorsOf(valid({ name: "x".repeat(121) }))).toEqual({
      name: "Use at most 120 characters",
    });
    // Urdu names are fine.
    expect(errorsOf(valid({ name: "محمد اسلم" }))).toEqual({});
  });

  it("checks the phone like the server (7+ digits)", () => {
    for (const phone of ["0300 1234567", "+92 300-1234567", "0421234567"]) {
      expect(errorsOf(valid({ phone }))).toEqual({});
    }
    for (const phone of ["12345", "+------", "phone", "0300_1234567"]) {
      expect(errorsOf(valid({ phone }))).toEqual({
        phone: "Enter a valid phone number",
      });
    }
  });

  it("checks the CNIC with or without dashes", () => {
    expect(errorsOf(valid({ cnic: "35202-1234567-1" }))).toEqual({});
    expect(errorsOf(valid({ cnic: "3520212345671" }))).toEqual({});
    expect(errorsOf(valid({ cnic: "35202-123-1" }))).toEqual({
      cnic: "Enter the CNIC as 12345-1234567-1",
    });
  });

  it("takes rupees with up to 2 decimals as text", () => {
    expect(
      errorsOf(valid({ openingBalance: "50000.5", creditLimit: "100000" })),
    ).toEqual({});
    const money = "Enter an amount in rupees (up to 2 decimals)";
    expect(errorsOf(valid({ openingBalance: "1.234" }))).toEqual({
      openingBalance: money,
    });
    expect(errorsOf(valid({ creditLimit: "-5" }))).toEqual({
      creditLimit: money,
    });
    expect(errorsOf(valid({ openingBalance: "1,000" }))).toEqual({
      openingBalance: money,
    });
    expect(errorsOf(valid({ creditLimit: "1".repeat(13) }))).toEqual({
      creditLimit: money,
    });
  });

  it("limits the text fields", () => {
    expect(
      errorsOf(
        valid({
          fatherName: "x".repeat(121),
          village: "x".repeat(81),
          address: "x".repeat(501),
          notes: "x".repeat(1001),
        }),
      ),
    ).toEqual({
      fatherName: "Use at most 120 characters",
      village: "Use at most 80 characters",
      address: "Use at most 500 characters",
      notes: "Use at most 1,000 characters",
    });
  });
});

describe("toCreateInput", () => {
  it("trims, sends empty fields as null and no opening balance as 0", () => {
    expect(
      toCreateInput(
        valid({
          type: "beopari",
          name: "  Aslam ",
          phone: " 0300 1234567 ",
          village: "   ",
        }),
      ),
    ).toEqual({
      type: "beopari",
      name: "Aslam",
      fatherName: null,
      phone: "0300 1234567",
      cnic: null,
      village: null,
      address: null,
      openingBalance: "0",
      openingBalanceType: "debit",
      creditLimit: null,
      notes: null,
    });
  });

  it("prefills the name and type", () => {
    expect(
      emptyTraderValues({ name: " Bashir ", type: "arhti" }),
    ).toMatchObject({ name: "Bashir", type: "arhti" });
  });
});

describe("toUpdateInput", () => {
  it("sends only the changed fields, with cleared ones as null", () => {
    const values = {
      ...toTraderFormValues(trader()),
      phone: "",
      village: "Chak 46",
      openingBalance: "",
      isActive: false,
    };
    expect(
      toUpdateInput(values, {
        phone: true,
        village: true,
        openingBalance: true,
        isActive: true,
      }),
    ).toEqual({
      phone: null,
      village: "Chak 46",
      openingBalance: "0",
      isActive: false,
    });
    expect(toUpdateInput(values, {})).toEqual({});
  });

  it("reads a server trader into the form with nulls as empty text", () => {
    expect(toTraderFormValues(trader({ creditLimit: null }))).toMatchObject({
      address: "",
      creditLimit: "",
      openingBalance: "50000.00",
      isActive: true,
    });
  });
});

describe("readBalance", () => {
  it("says who owes whom without touching the amount", () => {
    expect(readBalance("50000.00")).toEqual({
      kind: "receivable",
      amount: "50000.00",
    });
    expect(readBalance("-1200.50")).toEqual({
      kind: "payable",
      amount: "1200.50",
    });
    expect(readBalance("0.00")).toEqual({ kind: "settled", amount: "0.00" });
    expect(readBalance("-0.00").kind).toBe("settled");
  });
});
