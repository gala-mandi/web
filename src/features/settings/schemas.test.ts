import { describe, expect, it } from "vitest";
import {
  sampleBillNumber,
  settingsSchema,
  type SettingsValues,
  toFormValues,
  toUpdateInput,
} from "./schemas";
import { settingsText } from "./text";
import { shopSettings } from "./test-data";

const e = settingsText.errors;
const valid = toFormValues(shopSettings());

/** The first error message for `field`, or undefined when it is valid. */
function errorOf(patch: Partial<SettingsValues>, field: keyof SettingsValues) {
  const result = settingsSchema.safeParse({ ...valid, ...patch });
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === field)?.message;
}

describe("settingsSchema", () => {
  it("accepts what the server sends", () => {
    expect(settingsSchema.safeParse(valid).success).toBe(true);
    expect(
      settingsSchema.safeParse(
        toFormValues(
          shopSettings({ email: "shop@example.pk", billPrefix: "MND" }),
        ),
      ).success,
    ).toBe(true);
  });

  it("needs a shop name of 2 to 120 characters", () => {
    expect(errorOf({ name: " A " }, "name")).toBe(e.nameRequired);
    expect(errorOf({ name: "x".repeat(121) }, "name")).toBe(e.tooLong(120));
    expect(errorOf({ name: "AB" }, "name")).toBeUndefined();
  });

  it("needs a Pakistani mobile number in any common spelling", () => {
    expect(errorOf({ phone: "" }, "phone")).toBe(e.phoneRequired);
    expect(errorOf({ phone: "12345" }, "phone")).toBe(e.phoneInvalid);
    expect(errorOf({ phone: "+92 301 1234567" }, "phone")).toBeUndefined();
    expect(errorOf({ phone: "0301-1234567" }, "phone")).toBeUndefined();
  });

  it("allows an empty email but not a bad one", () => {
    expect(errorOf({ email: "" }, "email")).toBeUndefined();
    expect(errorOf({ email: "not-an-email" }, "email")).toBe(e.emailInvalid);
  });

  it("limits the free-text fields", () => {
    expect(errorOf({ city: "x".repeat(81) }, "city")).toBe(e.tooLong(80));
    expect(errorOf({ address: "x".repeat(501) }, "address")).toBe(
      e.tooLong(500),
    );
    expect(errorOf({ displayName: "x".repeat(121) }, "displayName")).toBe(
      e.tooLong(120),
    );
    expect(errorOf({ parchiFooter: "x".repeat(500) }, "parchiFooter")).toBe(
      undefined,
    );
    expect(errorOf({ parchiFooter: "x".repeat(501) }, "parchiFooter")).toBe(
      e.tooLong(500),
    );
  });

  it.each(["0", "2.5", "2.50", "99.99", "100", "100.00", " 3 "])(
    "accepts the percentage %j",
    (value) => {
      expect(
        errorOf({ defaultCommissionPct: value }, "defaultCommissionPct"),
      ).toBeUndefined();
      expect(errorOf({ marketFeePct: value }, "marketFeePct")).toBeUndefined();
    },
  );

  it.each(["", "101", "100.01", "2.555", "-1", "abc", "1,5", "2."])(
    "rejects the percentage %j",
    (value) => {
      expect(
        errorOf({ defaultCommissionPct: value }, "defaultCommissionPct"),
      ).toBe(e.percent);
      expect(errorOf({ marketFeePct: value }, "marketFeePct")).toBe(e.percent);
    },
  );

  it("takes labour per bag in rupees with up to 2 decimals", () => {
    expect(errorOf({ labourPerBag: "15" }, "labourPerBag")).toBeUndefined();
    expect(errorOf({ labourPerBag: "15.5" }, "labourPerBag")).toBeUndefined();
    expect(errorOf({ labourPerBag: "15.555" }, "labourPerBag")).toBe(e.money);
    expect(errorOf({ labourPerBag: "-1" }, "labourPerBag")).toBe(e.money);
    expect(errorOf({ labourPerBag: "" }, "labourPerBag")).toBe(e.money);
  });

  it("takes kg per maund above 0 with up to 3 decimals", () => {
    for (const ok of ["40", "40.000", "37.324", "0.5"]) {
      expect(errorOf({ maundKg: ok }, "maundKg")).toBeUndefined();
    }
    for (const bad of ["0", "0.000", "", "1000", "40.0001", "-40", "forty"]) {
      expect(errorOf({ maundKg: bad }, "maundKg")).toBe(e.maundKg);
    }
  });

  it("only allows known units and languages", () => {
    expect(
      settingsSchema.safeParse({ ...valid, defaultUnit: "ton" }).success,
    ).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, language: "fr" }).success).toBe(
      false,
    );
  });

  it("checks the bill prefix", () => {
    for (const ok of ["", "MND", "GM-26", "26/27"]) {
      expect(errorOf({ billPrefix: ok }, "billPrefix")).toBeUndefined();
    }
    expect(errorOf({ billPrefix: "MN D" }, "billPrefix")).toBe(e.billPrefix);
    expect(errorOf({ billPrefix: "مندی" }, "billPrefix")).toBe(e.billPrefix);
    expect(errorOf({ billPrefix: "ABCDEFGHIJK" }, "billPrefix")).toBe(
      e.tooLong(10),
    );
  });

  it("takes an empty or ISO financial year start", () => {
    expect(
      errorOf({ financialYearStart: "" }, "financialYearStart"),
    ).toBeUndefined();
    expect(
      errorOf({ financialYearStart: "2026-07-01" }, "financialYearStart"),
    ).toBeUndefined();
    expect(
      errorOf({ financialYearStart: "2026-13-01" }, "financialYearStart"),
    ).toBe(e.date);
    expect(
      errorOf({ financialYearStart: "01/07/2026" }, "financialYearStart"),
    ).toBe(e.date);
  });
});

describe("toFormValues", () => {
  it("turns nulls into empty strings and keeps decimals as strings", () => {
    const values = toFormValues(
      shopSettings({
        email: null,
        address: null,
        city: null,
        displayName: null,
        parchiFooter: null,
        billPrefix: null,
        financialYearStart: null,
      }),
    );
    expect(values).toEqual({
      name: "Demo Mandi",
      phone: "03000000002",
      email: "",
      city: "",
      address: "",
      displayName: "",
      parchiFooter: "",
      defaultCommissionPct: "2.50",
      marketFeePct: "0.00",
      labourPerBag: "15.00",
      defaultUnit: "maund",
      maundKg: "40.000",
      language: "en",
      billPrefix: "",
      financialYearStart: "",
    });
    expect(values).not.toHaveProperty("logoUrl");
    expect(values).not.toHaveProperty("updatedAt");
  });
});

describe("toUpdateInput", () => {
  it("sends nothing when nothing changed", () => {
    expect(toUpdateInput(valid, {})).toEqual({});
    expect(toUpdateInput(valid, { name: false })).toEqual({});
  });

  it("sends only the changed fields, trimmed", () => {
    const values = {
      ...valid,
      defaultCommissionPct: " 3 ",
      displayName: "  Aslam Traders ",
      name: "Changed but not dirty",
    };
    expect(
      toUpdateInput(values, { defaultCommissionPct: true, displayName: true }),
    ).toEqual({ defaultCommissionPct: "3", displayName: "Aslam Traders" });
  });

  it("sends a cleared optional field as null", () => {
    const values: SettingsValues = {
      ...valid,
      email: "",
      city: "  ",
      address: "",
      displayName: "",
      parchiFooter: "",
      billPrefix: "",
      financialYearStart: "",
    };
    const dirty = {
      email: true,
      city: true,
      address: true,
      displayName: true,
      parchiFooter: true,
      billPrefix: true,
      financialYearStart: true,
    };
    expect(toUpdateInput(values, dirty)).toEqual({
      email: null,
      city: null,
      address: null,
      displayName: null,
      parchiFooter: null,
      billPrefix: null,
      financialYearStart: null,
    });
  });

  it("sends the phone in the local form", () => {
    expect(
      toUpdateInput({ ...valid, phone: "+92 301 1234567" }, { phone: true }),
    ).toEqual({ phone: "03011234567" });
    expect(
      toUpdateInput({ ...valid, phone: "0301-1234567" }, { phone: true }),
    ).toEqual({ phone: "03011234567" });
  });

  it("sends units, language and dates as they are", () => {
    expect(
      toUpdateInput(
        {
          ...valid,
          defaultUnit: "kg",
          language: "ur",
          maundKg: "37.324",
          financialYearStart: "2027-01-01",
        },
        {
          defaultUnit: true,
          language: true,
          maundKg: true,
          financialYearStart: true,
        },
      ),
    ).toEqual({
      defaultUnit: "kg",
      language: "ur",
      maundKg: "37.324",
      financialYearStart: "2027-01-01",
    });
  });
});

describe("sampleBillNumber", () => {
  it("puts the prefix before the first number", () => {
    expect(sampleBillNumber("MND")).toBe("MND-0001");
    expect(sampleBillNumber("  GM/26 ")).toBe("GM/26-0001");
  });

  it("shows just the number without a prefix", () => {
    expect(sampleBillNumber("")).toBe("0001");
    expect(sampleBillNumber("   ")).toBe("0001");
  });
});
