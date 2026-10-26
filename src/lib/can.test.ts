import { afterEach, describe, expect, it } from "vitest";
import { useSessionStore } from "@/stores/session";
import { owner } from "@/test/fake-api";
import { rolePermissions } from "@/test/permissions";
import { can, hasPermission, PERMISSIONS } from "./can";

const manager = { permissions: [...rolePermissions.manager] };
const operator = { permissions: [...rolePermissions.operator] };

describe("hasPermission", () => {
  it("lets the owner do everything in the shop", () => {
    const user = { permissions: [...rolePermissions.owner] };
    expect(hasPermission(user, "staff.manage")).toBe(true);
    expect(hasPermission(user, "settings.manage")).toBe(true);
    expect(hasPermission(user, "purchase.delete")).toBe(true);
  });

  it("keeps staff, settings and delete from the manager", () => {
    expect(hasPermission(manager, "staff.manage")).toBe(false);
    expect(hasPermission(manager, "settings.manage")).toBe(false);
    expect(hasPermission(manager, "purchase.delete")).toBe(false);
    expect(hasPermission(manager, "report.view")).toBe(true);
    expect(hasPermission(manager, "trader.manage")).toBe(true);
  });

  it("limits the operator to daily work", () => {
    expect(hasPermission(operator, "purchase.create")).toBe(true);
    expect(hasPermission(operator, "trader.view")).toBe(true);
    expect(hasPermission(operator, "trader.manage")).toBe(false);
    expect(hasPermission(operator, "purchase.edit")).toBe(false);
    expect(hasPermission(operator, "purchase.delete")).toBe(false);
    expect(hasPermission(operator, "ledger.view")).toBe(false);
    expect(hasPermission(operator, "report.view")).toBe(false);
  });

  it("allows nothing without a user or permissions", () => {
    expect(hasPermission(null, "dashboard.view")).toBe(false);
    expect(hasPermission(undefined, "dashboard.view")).toBe(false);
    expect(hasPermission({ permissions: [] }, "dashboard.view")).toBe(false);
    // An older server that doesn't send the field yet.
    const legacy = {} as { permissions: never[] };
    expect(hasPermission(legacy, "dashboard.view")).toBe(false);
  });

  it("knows only the server's permission names", () => {
    for (const list of Object.values(rolePermissions)) {
      for (const p of list) expect(PERMISSIONS).toContain(p);
    }
  });
});

describe("can", () => {
  afterEach(() => useSessionStore.getState().clear());

  it("checks the signed-in user's permissions from the session", () => {
    expect(can("purchase.delete")).toBe(false);

    useSessionStore.getState().setSession({ accessToken: "t", user: owner });
    expect(can("purchase.delete")).toBe(true);

    useSessionStore.getState().setUser({
      ...owner,
      role: "operator",
      permissions: [...rolePermissions.operator],
    });
    expect(can("purchase.delete")).toBe(false);
    expect(can("purchase.create")).toBe(true);
  });
});
