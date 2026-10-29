import { fireEvent, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { httpError } from "@/test/fake-api";
import { resetStores } from "@/test/render-panel";
import { settingsText } from "../text";
import { fakeFile, LOGO_URL, settingsServer, shopSettings } from "../test-data";
import { loaded, renderSettings } from "./test-utils";

const t = settingsText.logo;
const MB = 1024 * 1024;
const defaultAdapter = api.defaults.adapter;

/** Picks files with the hidden file input, as the file dialog does. */
function choose(...files: File[]) {
  fireEvent.change(screen.getByTestId("logo-input"), { target: { files } });
}

/** Drops files on the drop zone. */
function drop(...files: File[]) {
  fireEvent.drop(screen.getByTestId("logo-dropzone"), {
    dataTransfer: {
      files,
      types: ["Files"],
      items: files.map((file) => ({
        kind: "file",
        type: file.type,
        getAsFile: () => file,
      })),
    },
  });
}

/** Both logos on the page: next to the drop zone and on the parchi preview. */
const logos = () => screen.queryAllByTestId("shop-logo");

describe("LogoUpload", () => {
  let server: ReturnType<typeof settingsServer>;

  beforeEach(() => {
    server = settingsServer();
    api.defaults.adapter = server.adapter;
  });

  afterEach(() => {
    api.defaults.adapter = defaultAdapter;
    resetStores();
    toast.dismiss();
  });

  it.each([
    ["a PNG", "logo.png", "image/png"],
    ["a JPG", "logo.jpg", "image/jpeg"],
  ])("uploads %s as multipart `file` and shows it", async (_, name, type) => {
    renderSettings();
    await loaded();
    expect(logos()).toHaveLength(0);
    const meBefore = server.seen("GET", "/auth/me").length;
    const file = fakeFile(name, type, 300_000);

    choose(file);

    expect(await screen.findByText(t.uploaded)).toBeVisible();
    const uploads = server.seen("POST", "/settings/logo");
    expect(uploads).toHaveLength(1);
    const body = uploads[0].data;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBe(file);
    // Both the drop zone's logo and the preview show the new one.
    await waitFor(() => expect(logos()).toHaveLength(2));
    for (const img of logos()) expect(img).toHaveAttribute("src", LOGO_URL);
    expect(screen.getByRole("button", { name: t.remove })).toBeVisible();
    expect(server.seen("GET", "/auth/me")).toHaveLength(meBefore + 1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("uploads a dropped image", async () => {
    renderSettings();
    await loaded();

    drop(fakeFile("logo.png", "image/png"));

    expect(await screen.findByText(t.uploaded)).toBeVisible();
    expect(server.seen("POST", "/settings/logo")).toHaveLength(1);
  });

  it("accepts exactly 1 MB", async () => {
    renderSettings();
    await loaded();

    choose(fakeFile("logo.png", "image/png", MB));

    expect(await screen.findByText(t.uploaded)).toBeVisible();
  });

  it.each([
    [
      "a 5 MB image",
      () => fakeFile("big.png", "image/png", 5 * MB),
      t.tooLarge,
    ],
    [
      "1 MB + 1 byte",
      () => fakeFile("big.jpg", "image/jpeg", MB + 1),
      t.tooLarge,
    ],
    ["a PDF", () => fakeFile("logo.pdf", "application/pdf"), t.wrongType],
    ["an SVG", () => fakeFile("logo.svg", "image/svg+xml"), t.wrongType],
  ])("rejects %s in the browser and uploads nothing", async (_, file, text) => {
    renderSettings();
    await loaded();

    choose(file());

    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(screen.getByTestId("logo-dropzone")).toHaveAttribute(
      "aria-describedby",
      "logo-rules logo-error",
    );
    expect(server.seen("POST", "/settings/logo")).toHaveLength(0);
  });

  it("asks for one image when several are dropped", async () => {
    renderSettings();
    await loaded();

    drop(fakeFile("a.png", "image/png"), fakeFile("b.png", "image/png"));

    expect(await screen.findByRole("alert")).toHaveTextContent(t.oneFile);
    expect(server.seen("POST", "/settings/logo")).toHaveLength(0);
  });

  it("clears the error once a good file is chosen", async () => {
    renderSettings();
    await loaded();

    choose(fakeFile("logo.pdf", "application/pdf"));
    expect(await screen.findByRole("alert")).toHaveTextContent(t.wrongType);

    choose(fakeFile("logo.png", "image/png"));

    expect(await screen.findByText(t.uploaded)).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    [
      413,
      { code: "FILE_TOO_LARGE", message: "The logo must be 1 MB or smaller" },
    ],
    [
      400,
      {
        code: "INVALID_FILE_TYPE",
        message: "The file is not a PNG or JPG image",
      },
    ],
  ])("shows the server's %s message", async (status, body) => {
    server.onLogo = (config) => {
      throw httpError(config, status, body);
    };
    renderSettings();
    await loaded();

    choose(fakeFile("logo.png", "image/png"));

    expect(await screen.findByRole("alert")).toHaveTextContent(body.message);
    expect(server.seen("POST", "/settings/logo")).toHaveLength(1);
    expect(logos()).toHaveLength(0);
    expect(screen.queryByText(t.uploaded)).toBeNull();
  });

  it("shows the network message when the upload never reaches the server", async () => {
    server.onLogo = () => {
      throw new Error("Network Error");
    };
    renderSettings();
    await loaded();

    choose(fakeFile("logo.png", "image/png"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      settingsText.errors.network,
    );
  });

  describe("remove", () => {
    it("is offered only when there is a logo", async () => {
      renderSettings();
      await loaded();

      expect(screen.queryByRole("button", { name: t.remove })).toBeNull();
    });

    it("sends logoUrl: null and shows the initials again", async () => {
      server.settings = shopSettings({ logoUrl: LOGO_URL });
      renderSettings();
      await loaded();
      expect(logos()).toHaveLength(2);

      fireEvent.click(screen.getByRole("button", { name: t.remove }));

      expect(await screen.findByText(t.removed)).toBeVisible();
      const patches = server.seen("PATCH", "/settings");
      expect(patches).toHaveLength(1);
      expect(patches[0].data).toEqual({ logoUrl: null });
      await waitFor(() => expect(logos()).toHaveLength(0));
      expect(screen.getAllByTestId("shop-initials")).toHaveLength(2);
      expect(screen.queryByRole("button", { name: t.remove })).toBeNull();
      // The form's own edits are not touched.
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeDisabled();
    });

    it("keeps the logo and shows why when removing fails", async () => {
      server.settings = shopSettings({ logoUrl: LOGO_URL });
      server.onPatch = (config) => {
        throw httpError(config, 500, { message: "Could not remove the logo" });
      };
      renderSettings();
      await loaded();

      fireEvent.click(screen.getByRole("button", { name: t.remove }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not remove the logo",
      );
      expect(logos()).toHaveLength(2);
      expect(screen.getByRole("button", { name: t.remove })).toBeEnabled();
    });
  });
});
