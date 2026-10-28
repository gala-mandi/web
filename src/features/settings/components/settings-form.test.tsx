import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { AxiosResponse } from "axios";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authKeys } from "@/features/auth/hooks";
import type { User } from "@/features/auth/types";
import { api } from "@/lib/api";
import { httpError, ok } from "@/test/fake-api";
import { resetStores } from "@/test/render-panel";
import { settingsText } from "../text";
import { settingsServer, shopSettings } from "../test-data";
import {
  discardButton,
  loaded,
  renderSettings,
  saveButton,
} from "./test-utils";

const defaultAdapter = api.defaults.adapter;

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

const preview = () => screen.getByTestId("parchi-preview");

describe("SettingsForm", () => {
  let server: ReturnType<typeof settingsServer>;

  beforeEach(() => {
    server = settingsServer();
    api.defaults.adapter = server.adapter;
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    resetStores();
    // Sonner replays toasts still on screen to the next test's Toaster.
    toast.dismiss();
  });

  describe("saving", () => {
    it("keeps Save and Discard off until something changes", async () => {
      renderSettings();
      await loaded();

      expect(saveButton()).toBeDisabled();
      expect(discardButton()).toBeDisabled();
      expect(screen.queryByText(settingsText.unsaved)).toBeNull();

      type("Commission", "3");

      expect(saveButton()).toBeEnabled();
      expect(discardButton()).toBeEnabled();
      expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
        settingsText.unsaved,
      );

      // Typed back to what was saved: nothing to save.
      type("Commission", "2.50");
      expect(saveButton()).toBeDisabled();
    });

    it("sends only the changed fields and shows the values the server stored", async () => {
      renderSettings();
      await loaded();

      type("Commission", "2.5");
      type("Phone", "+92 301 1234567");
      type("City", "");
      type("Name on parchi", "  Aslam Traders ");
      fireEvent.click(saveButton());

      expect(await screen.findByText(settingsText.saved)).toBeVisible();
      const patches = server.seen("PATCH", "/settings");
      expect(patches).toHaveLength(1);
      expect(patches[0].data).toEqual({
        defaultCommissionPct: "2.5",
        phone: "03011234567",
        city: null,
        displayName: "Aslam Traders",
      });

      // The form now shows what the server saved, and has nothing to save.
      await waitFor(() =>
        expect(screen.getByLabelText("Commission")).toHaveValue("2.50"),
      );
      expect(screen.getByLabelText("Phone")).toHaveValue("03011234567");
      expect(screen.getByLabelText("City")).toHaveValue("");
      expect(screen.getByLabelText("Name on parchi")).toHaveValue(
        "Aslam Traders",
      );
      expect(saveButton()).toBeDisabled();
      expect(screen.queryByText(settingsText.unsaved)).toBeNull();
    });

    it("saves a new commission as the owner", async () => {
      renderSettings();
      await loaded();

      type("Commission", "3.25");
      fireEvent.click(saveButton());

      await screen.findByText(settingsText.saved);
      expect(server.seen("PATCH", "/settings")[0].data).toEqual({
        defaultCommissionPct: "3.25",
      });
      expect(server.settings.defaultCommissionPct).toBe("3.25");
      expect(screen.getByLabelText("Commission")).toHaveValue("3.25");
    });

    it("sends a changed unit from the select", async () => {
      renderSettings();
      await loaded();

      fireEvent.keyDown(
        screen.getByRole("combobox", { name: "Default unit" }),
        {
          key: "Enter",
        },
      );
      fireEvent.click(
        await screen.findByRole("option", { name: "Kilogram (kg)" }),
      );
      fireEvent.click(saveButton());

      await screen.findByText(settingsText.saved);
      expect(server.seen("PATCH", "/settings")[0].data).toEqual({
        defaultUnit: "kg",
      });
    });

    it("refetches /auth/me after a save, so the header shows the new name", async () => {
      const { client } = renderSettings();
      await loaded();
      await waitFor(() =>
        expect(screen.getByTestId("header-shop")).toHaveTextContent(
          "Demo Mandi",
        ),
      );
      const before = server.seen("GET", "/auth/me").length;

      type("Shop name", "Aslam & Sons");
      fireEvent.click(saveButton());

      await screen.findByText(settingsText.saved);
      expect(server.seen("GET", "/auth/me")).toHaveLength(before + 1);
      // `/auth/me` came back before the save finished.
      const me = server.requests.findLastIndex((r) => r.url === "/auth/me");
      const patch = server.requests.findIndex((r) => r.method === "PATCH");
      expect(me).toBeGreaterThan(patch);
      expect(screen.getByTestId("header-shop")).toHaveTextContent(
        "Aslam & Sons",
      );
      expect(client.getQueryData<User>(authKeys.me())?.tenant?.name).toBe(
        "Aslam & Sons",
      );
    });

    it("sends nothing when the browser finds a mistake", async () => {
      renderSettings();
      await loaded();

      type("Commission", "101");
      type("Kg in one maund", "0");
      fireEvent.click(saveButton());

      expect(
        await screen.findByText(settingsText.errors.percent),
      ).toBeVisible();
      expect(screen.getByText(settingsText.errors.maundKg)).toBeVisible();
      expect(screen.getByLabelText("Commission")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(server.seen("PATCH", "/settings")).toHaveLength(0);
    });

    it("sends only one request on a double submit", async () => {
      let answer: () => void = () => undefined;
      server.onPatch = (config) =>
        new Promise<AxiosResponse>((resolve) => {
          answer = () =>
            resolve(ok(config, shopSettings({ defaultCommissionPct: "3.00" })));
        });
      renderSettings();
      await loaded();
      type("Commission", "3");

      const button = saveButton();
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.submit(button.closest("form")!);

      await waitFor(() => expect(saveButton()).toHaveTextContent("Saving…"));
      expect(saveButton()).toBeDisabled();
      expect(discardButton()).toBeDisabled();
      await act(async () => answer());

      expect(await screen.findByText(settingsText.saved)).toBeVisible();
      expect(server.seen("PATCH", "/settings")).toHaveLength(1);
    });
  });

  describe("server errors", () => {
    it("shows field errors from the server under their fields", async () => {
      server.onPatch = (config) => {
        throw httpError(config, 400, {
          message: "Validation failed",
          errors: [
            { field: "billPrefix", message: "This prefix is already in use" },
            {
              field: "defaultCommissionPct",
              message: "Commission can be at most 10%",
            },
          ],
        });
      };
      renderSettings();
      await loaded();

      type("Bill number prefix", "MND");
      type("Commission", "12");
      fireEvent.click(saveButton());

      expect(
        await screen.findByText("This prefix is already in use"),
      ).toBeVisible();
      expect(screen.getByText("Commission can be at most 10%")).toBeVisible();
      const prefix = screen.getByLabelText("Bill number prefix");
      expect(prefix).toHaveAttribute("aria-invalid", "true");
      expect(prefix).toHaveFocus();
      expect(prefix.getAttribute("aria-describedby")).toContain(
        "settings-billPrefix-error",
      );
      expect(screen.getByLabelText("Commission")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      // Nothing was saved: the edits stay and can be sent again.
      expect(screen.queryByText(settingsText.saved)).toBeNull();
      expect(screen.queryByText("Validation failed")).toBeNull();
      expect(prefix).toHaveValue("MND");
      expect(saveButton()).toBeEnabled();
    });

    it.each([
      [
        "a server message",
        (config: Parameters<typeof httpError>[0]) =>
          httpError(config, 409, {
            message: "Settings were changed elsewhere",
          }),
        "Settings were changed elsewhere",
      ],
      [
        "an error on an unknown field",
        (config: Parameters<typeof httpError>[0]) =>
          httpError(config, 400, {
            message: "logoUrl must be null",
            errors: [{ field: "logoUrl", message: "must be null" }],
          }),
        "logoUrl must be null",
      ],
      [
        "the network message",
        () => new Error("Network Error"),
        settingsText.errors.network,
      ],
    ])("shows %s above the form for other errors", async (_, error, text) => {
      server.onPatch = (config) => {
        throw error(config);
      };
      renderSettings();
      await loaded();

      type("Commission", "3");
      fireEvent.click(saveButton());

      expect(await screen.findByRole("alert")).toHaveTextContent(text);
      expect(screen.getByLabelText("Commission")).toHaveValue("3");
      expect(saveButton()).toBeEnabled();
    });
  });

  describe("discard", () => {
    it("puts back the saved values and the preview", async () => {
      renderSettings();
      await loaded();

      type("Shop name", "Another Shop");
      type("Footer text", "Shukriya");
      expect(within(preview()).getByTestId("preview-footer")).toHaveTextContent(
        "Shukriya",
      );

      fireEvent.click(discardButton());

      expect(screen.getByLabelText("Shop name")).toHaveValue("Demo Mandi");
      expect(screen.getByLabelText("Footer text")).toHaveValue("");
      expect(within(preview()).getByTestId("preview-title")).toHaveTextContent(
        "Demo Mandi",
      );
      expect(within(preview()).queryByTestId("preview-footer")).toBeNull();
      expect(saveButton()).toBeDisabled();
      expect(discardButton()).toBeDisabled();
      expect(server.seen("PATCH", "/settings")).toHaveLength(0);
    });

    it("goes back to the last saved values and clears a general error", async () => {
      renderSettings();
      await loaded();

      type("Commission", "3");
      fireEvent.click(saveButton());
      await screen.findByText(settingsText.saved);
      await waitFor(() =>
        expect(screen.getByLabelText("Commission")).toHaveValue("3.00"),
      );

      server.onPatch = (config) => {
        throw httpError(config, 500, { message: "Try later" });
      };
      type("Commission", "4");
      // After a submit, RHF re-validates on change (async) before it updates isDirty.
      await waitFor(() => expect(saveButton()).toBeEnabled());
      fireEvent.click(saveButton());
      expect(await screen.findByRole("alert")).toHaveTextContent("Try later");

      fireEvent.click(discardButton());

      expect(screen.getByLabelText("Commission")).toHaveValue("3.00");
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("parchi preview", () => {
    it("updates as you type", async () => {
      renderSettings();
      await loaded();
      const p = within(preview());

      expect(p.getByTestId("preview-title")).toHaveTextContent("Demo Mandi");
      expect(p.getByTestId("preview-address")).toHaveTextContent(
        "Shop 12, Grain Market, Okara",
      );
      expect(p.getByTestId("preview-phone")).toHaveTextContent(
        "Ph: 03000000002",
      );
      expect(p.getByTestId("preview-bill")).toHaveTextContent(/^0001$/);
      expect(p.queryByTestId("preview-footer")).toBeNull();

      type("Name on parchi", "Aslam Traders");
      expect(p.getByTestId("preview-title")).toHaveTextContent("Aslam Traders");

      // Empty parchi name: the shop name is printed, and suggested.
      type("Name on parchi", "  ");
      type("Shop name", "Haji Aslam & Sons");
      expect(p.getByTestId("preview-title")).toHaveTextContent(
        "Haji Aslam & Sons",
      );
      expect(screen.getByLabelText("Name on parchi")).toHaveAttribute(
        "placeholder",
        "Haji Aslam & Sons",
      );

      type("Address", "");
      expect(p.getByTestId("preview-address")).toHaveTextContent(/^Okara$/);
      type("City", "");
      expect(p.queryByTestId("preview-address")).toBeNull();

      type("Phone", "0301 1234567");
      expect(p.getByTestId("preview-phone")).toHaveTextContent(
        "Ph: 0301 1234567",
      );
      type("Phone", "");
      expect(p.queryByTestId("preview-phone")).toBeNull();

      type("Bill number prefix", "MND");
      expect(p.getByTestId("preview-bill")).toHaveTextContent("MND-0001");
      expect(screen.getByText("Next bill looks like MND-0001.")).toBeVisible();

      type("Footer text", "Shukriya\nBank: HBL 1234");
      expect(p.getByTestId("preview-footer")).toHaveTextContent(
        "Shukriya Bank: HBL 1234",
      );
    });

    it("shows the saved parchi settings when the page opens", async () => {
      server.settings = shopSettings({
        displayName: "Aslam Traders",
        billPrefix: "GM",
        parchiFooter: "Thank you",
      });
      renderSettings();
      await loaded();
      const p = within(preview());

      expect(p.getByTestId("preview-title")).toHaveTextContent("Aslam Traders");
      expect(p.getByTestId("preview-bill")).toHaveTextContent("GM-0001");
      expect(p.getByTestId("preview-footer")).toHaveTextContent("Thank you");
    });
  });

  describe("units", () => {
    it("shows a conversion with the shop's kg per maund", async () => {
      renderSettings();
      await loaded();

      expect(screen.getByText("Example: 1,000 kg = 25 mn")).toBeVisible();

      type("Kg in one maund", "37.324");
      expect(
        screen.getByText("Example: 1,000 kg = 26 mn 29.576 kg"),
      ).toBeVisible();

      type("Kg in one maund", "0");
      expect(screen.queryByText(/^Example: 1,000 kg/)).toBeNull();

      type("Kg in one maund", "40");
      expect(screen.getByText("Example: 1,000 kg = 25 mn")).toBeVisible();
    });
  });
});
