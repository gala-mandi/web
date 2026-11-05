import { describe, expect, it } from "vitest";
import {
  commodityFormSchema,
  type CommodityFormValues,
  emptyCommodityValues,
  toCommodityFormValues,
  toCreateInput,
  toUpdateInput,
} from "./schemas";
import { commodity, kapas } from "./test-data";

function valid(overrides: Partial<CommodityFormValues> = {}) {
  return { ...emptyCommodityValues(), name: "Gandum", ...overrides };
}

function errorsOf(values: CommodityFormValues): Record<string, string> {
  const result = commodityFormSchema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((i) => [String(i.path[0]), i.message]),
  );
}

describe("commodityFormSchema", () => {
  it("needs only a name of 2..80 characters", () => {
    expect(errorsOf(valid())).toEqual({});
    expect(errorsOf(valid({ name: "  " }))).toEqual({
      name: "Enter the name (at least 2 characters)",
    });
    expect(errorsOf(valid({ name: "x".repeat(81) }))).toEqual({
      name: "Use at most 80 characters",
    });
    expect(errorsOf(valid({ nameUr: "گ".repeat(81) }))).toEqual({
      nameUr: "Use at most 80 characters",
    });
    expect(errorsOf(valid({ category: "x".repeat(41) }))).toEqual({
      category: "Use at most 40 characters",
    });
    // Urdu is fine in either name.
    expect(errorsOf(valid({ name: "گندم", nameUr: "گندم" }))).toEqual({});
  });

  it("takes a bag weight above 0 with up to 3 decimals", () => {
    for (const bagWeightKg of ["", "100", "37.324", "0.5", "99999.999"]) {
      expect(errorsOf(valid({ bagWeightKg }))).toEqual({});
    }
    for (const bagWeightKg of ["0", "0.000", "00"]) {
      expect(errorsOf(valid({ bagWeightKg }))).toEqual({
        bagWeightKg: "Bag weight must be more than 0",
      });
    }
    for (const bagWeightKg of ["100.1234", "-5", "abc", "100000", "1,000"]) {
      expect(errorsOf(valid({ bagWeightKg }))).toEqual({
        bagWeightKg: "Enter the bag weight in kg (up to 3 decimals)",
      });
    }
  });

  it("takes percentages from 0 to 100 with up to 2 decimals", () => {
    for (const pct of ["", "0", "2.5", "2.50", "99.99", "100", "100.00"]) {
      expect(
        errorsOf(valid({ commissionPct: pct, marketFeePct: pct })),
      ).toEqual({});
    }
    const message = "Enter a percentage from 0 to 100 (up to 2 decimals)";
    for (const pct of ["100.01", "101", "2.555", "-1", "2%", "abc"]) {
      expect(errorsOf(valid({ commissionPct: pct }))).toEqual({
        commissionPct: message,
      });
      expect(errorsOf(valid({ marketFeePct: pct }))).toEqual({
        marketFeePct: message,
      });
    }
  });

  it("takes labour per bag in rupees with up to 2 decimals", () => {
    for (const labourPerBag of ["", "0", "15", "15.5", "999999999999.99"]) {
      expect(errorsOf(valid({ labourPerBag }))).toEqual({});
    }
    for (const labourPerBag of ["15.555", "-1", "Rs 15", "1,000"]) {
      expect(errorsOf(valid({ labourPerBag }))).toEqual({
        labourPerBag: "Enter an amount in rupees (up to 2 decimals)",
      });
    }
  });
});

describe("commodity form ↔ API", () => {
  it("sends every field on create, empty ones as null", () => {
    expect(
      toCreateInput(
        valid({
          name: "  Gandum ",
          nameUr: " گندم ",
          defaultUnit: "bag",
          bagWeightKg: "100",
          marketFeePct: "0.5",
        }),
      ),
    ).toEqual({
      name: "Gandum",
      nameUr: "گندم",
      category: null,
      defaultUnit: "bag",
      bagWeightKg: "100",
      commissionPct: null,
      marketFeePct: "0.5",
      labourPerBag: null,
    });
  });

  it("fills the form from a commodity, null as empty", () => {
    expect(toCommodityFormValues(commodity())).toEqual({
      name: "Gandum",
      nameUr: "گندم",
      category: "grain",
      defaultUnit: "bag",
      bagWeightKg: "100.000",
      commissionPct: "",
      marketFeePct: "",
      labourPerBag: "",
      isActive: true,
    });
  });

  it("sends only the changed fields on edit; a cleared override goes as null", () => {
    const values = {
      ...toCommodityFormValues(kapas),
      commissionPct: "",
      labourPerBag: "18",
      isActive: true,
    };
    expect(
      toUpdateInput(values, {
        commissionPct: true,
        labourPerBag: true,
        isActive: true,
      }),
    ).toEqual({ commissionPct: null, labourPerBag: "18", isActive: true });
    expect(toUpdateInput(values, {})).toEqual({});
  });
});
