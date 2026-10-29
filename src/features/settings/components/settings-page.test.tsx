import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { httpError, manager, ok, operator } from "@/test/fake-api";
import { resetStores } from "@/test/render-panel";
import { settingsServer, shopSettings } from "../test-data";
import { loaded, renderSettings } from "./test-utils";

const defaultAdapter = api.defaults.adapter;

describe("SettingsPage", () => {
  let server: ReturnType<typeof settingsServer>;

  beforeEach(() => {
    server = settingsServer();
    api.defaults.adapter = server.adapter;
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    resetStores();
  });

  it("shows a skeleton while loading, then every section and the preview", async () => {
    let answer: () => void = () => undefined;
    server.onGet = (config) =>
      new Promise<AxiosResponse>((resolve) => {
        answer = () => resolve(ok(config, shopSettings()));
      });
    renderSettings();

    expect(screen.getByTestId("page-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();

    await waitFor(() =>
      expect(server.seen("GET", "/settings")).toHaveLength(1),
    );
    await act(async () => answer());

    expect(await loaded()).toBeVisible();
    expect(screen.queryByTestId("page-skeleton")).toBeNull();
    for (const title of [
      "Shop profile",
      "Parchi",
      "Charges & commission",
      "Units",
      "Numbering",
      "Parchi preview",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name: title }),
      ).toBeVisible();
    }
    expect(screen.getByLabelText("Shop name")).toHaveValue("Demo Mandi");
    expect(screen.getByLabelText("Commission")).toHaveValue("2.50");
    expect(screen.getByLabelText("Kg in one maund")).toHaveValue("40.000");
    expect(screen.getByLabelText("Financial year starts on")).toHaveValue(
      "2026-07-01",
    );
    expect(
      screen.getByRole("combobox", { name: "Default unit" }),
    ).toHaveTextContent("Maund (mn)");
    expect(
      screen.getByRole("combobox", { name: "Language" }),
    ).toHaveTextContent("English");
  });

  it.each([
    ["manager", manager],
    ["operator", operator],
  ])("shows 403 to a %s and asks the server for nothing", (_, user) => {
    renderSettings(user);

    expect(
      screen.getByRole("heading", { level: 1, name: "You don’t have access" }),
    ).toBeVisible();
    expect(screen.getByText("403")).toBeVisible();
    expect(screen.queryByLabelText("Shop name")).toBeNull();
    expect(server.seen("GET", "/settings")).toHaveLength(0);
  });

  it("shows 403 when the server refuses, without retrying", async () => {
    server.onGet = (config) => {
      throw httpError(config, 403, { message: "Forbidden" });
    };
    renderSettings();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "You don’t have access",
      }),
    ).toBeVisible();
    expect(server.seen("GET", "/settings")).toHaveLength(1);
  });

  it("shows an error with a retry that loads the page", async () => {
    server.onGet = (config) => {
      throw httpError(config, 500, { message: "Internal server error" });
    };
    renderSettings();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(screen.queryByLabelText("Shop name")).toBeNull();
    const failed = server.seen("GET", "/settings").length;

    server.onGet = undefined;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await loaded()).toBeVisible();
    expect(screen.getByLabelText("Shop name")).toHaveValue("Demo Mandi");
    expect(server.seen("GET", "/settings")).toHaveLength(failed + 1);
  });
});
