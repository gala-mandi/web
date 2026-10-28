import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpError } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import {
  activateStaff,
  changeStaffRole,
  deactivateStaff,
  listStaff,
} from "../api";
import { bilalOperator, nadeemManager, youOwner } from "../test-data";
import { StaffTable } from "./staff-table";

vi.mock("../api", () => ({
  listStaff: vi.fn(),
  changeStaffRole: vi.fn(),
  deactivateStaff: vi.fn(),
  activateStaff: vi.fn(),
}));

function renderTable() {
  render(
    <TestProviders>
      <StaffTable />
    </TestProviders>,
  );
}

async function rowOf(name: string) {
  const cell = await screen.findByText(name, { exact: true });
  return cell.closest("tr")!;
}

async function openActions(name: string) {
  const trigger = screen.getByRole("button", { name: `Actions for ${name}` });
  fireEvent.keyDown(trigger, { key: "Enter" });
  return screen.findByRole("menu");
}

describe("StaffTable", () => {
  beforeEach(() => {
    vi.mocked(listStaff).mockReset();
    vi.mocked(changeStaffRole).mockReset();
    vi.mocked(deactivateStaff).mockReset();
    vi.mocked(activateStaff).mockReset();
    vi.mocked(listStaff).mockResolvedValue([
      youOwner,
      nadeemManager,
      bilalOperator,
    ]);
  });

  it("lists name, phone, role, status and last login (Asia/Karachi)", async () => {
    renderTable();

    const table = await screen.findByRole("table", {
      name: "Staff of this shop",
    });
    await within(table).findByText("Bilal");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    expect(headers).toEqual([
      "Name",
      "Phone",
      "Role",
      "Status",
      "Last login",
      "Actions",
    ]);

    const me = await rowOf("Haji Aslam");
    expect(within(me).getByText("You")).toBeInTheDocument();
    expect(me).toHaveTextContent("03000000002");
    expect(me).toHaveTextContent("Owner");
    expect(me).toHaveTextContent("Active");
    // 10:30 UTC = 3:30 pm in Pakistan.
    expect(within(me).getByText(/27 Oct 2026.*3:30/i)).toBeInTheDocument();

    const bilal = await rowOf("Bilal");
    expect(within(bilal).queryByText("You")).toBeNull();
    expect(bilal).toHaveTextContent("Operator");
    expect(bilal).toHaveTextContent("Must change password");
    expect(bilal).toHaveTextContent("Never");

    const nadeem = await rowOf("Nadeem");
    expect(nadeem).toHaveTextContent("Manager");
    expect(nadeem).toHaveTextContent("Disabled");
  });

  it("never lets owners deactivate themselves", async () => {
    renderTable();
    await rowOf("Haji Aslam");

    const menu = await openActions("Haji Aslam");

    const item = within(menu).getByRole("menuitem", { name: /Deactivate/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent("You can’t deactivate yourself");
    fireEvent.click(item);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("changes a role after confirming in the dialog", async () => {
    vi.mocked(changeStaffRole).mockResolvedValue({
      ...bilalOperator,
      role: "manager",
    });
    renderTable();
    await rowOf("Bilal");

    const menu = await openActions("Bilal");
    fireEvent.click(
      within(menu).getByRole("menuitem", { name: "Change role" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Change role of Bilal",
    });
    expect(dialog).toHaveTextContent("New permissions apply within 15 minutes");
    const select = within(dialog).getByRole("combobox", { name: "Role" });
    expect(select).toHaveTextContent("Operator");
    fireEvent.keyDown(select, { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "Manager" }));
    vi.mocked(listStaff).mockResolvedValue([
      youOwner,
      nadeemManager,
      { ...bilalOperator, role: "manager" },
    ]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Save role" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(changeStaffRole).toHaveBeenCalledWith("u3", "manager");
    expect(await screen.findByText("Bilal is now Manager.")).toBeVisible();
    // The list is fetched again.
    await waitFor(() => expect(listStaff).toHaveBeenCalledTimes(2));
  });

  it("shows the last-owner error under the role field", async () => {
    vi.mocked(changeStaffRole).mockRejectedValue(
      httpError(undefined, 400, {
        message: "A shop needs at least one owner",
        errors: [{ field: "role", message: "A shop needs at least one owner" }],
      }),
    );
    renderTable();
    await rowOf("Haji Aslam");

    fireEvent.click(
      within(await openActions("Haji Aslam")).getByRole("menuitem", {
        name: "Change role",
      }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(within(dialog).getByRole("combobox"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "Manager" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save role" }));

    expect(
      await within(dialog).findByText("A shop needs at least one owner"),
    ).toBeVisible();
    expect(within(dialog).getByRole("combobox")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("deactivates only after the confirmation explains what happens", async () => {
    vi.mocked(deactivateStaff).mockResolvedValue({
      ...bilalOperator,
      isActive: false,
    });
    renderTable();
    await rowOf("Bilal");

    fireEvent.click(
      within(await openActions("Bilal")).getByRole("menuitem", {
        name: "Deactivate",
      }),
    );

    const confirm = await screen.findByRole("alertdialog", {
      name: "Deactivate Bilal?",
    });
    expect(confirm).toHaveTextContent(
      "They are signed out at once and can’t sign in until you activate them again.",
    );
    expect(deactivateStaff).not.toHaveBeenCalled();

    vi.mocked(listStaff).mockResolvedValue([
      youOwner,
      nadeemManager,
      { ...bilalOperator, isActive: false },
    ]);
    fireEvent.click(
      within(confirm).getByRole("button", { name: "Deactivate" }),
    );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(deactivateStaff).toHaveBeenCalledWith("u3");
    expect(await screen.findByText("Bilal is deactivated.")).toBeVisible();
    await waitFor(async () =>
      expect(await rowOf("Bilal")).toHaveTextContent("Disabled"),
    );
  });

  it("keeps the dialog open and shows a toast when the server refuses", async () => {
    vi.mocked(deactivateStaff).mockRejectedValue(
      httpError(undefined, 400, {
        message: "You can’t deactivate your own account",
        code: "CANNOT_DEACTIVATE_SELF",
      }),
    );
    renderTable();
    await rowOf("Bilal");
    fireEvent.click(
      within(await openActions("Bilal")).getByRole("menuitem", {
        name: "Deactivate",
      }),
    );
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(
      within(confirm).getByRole("button", { name: "Deactivate" }),
    );

    expect(
      await screen.findByText("You can’t deactivate your own account"),
    ).toBeVisible();
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });

  it("activates a disabled person", async () => {
    vi.mocked(activateStaff).mockResolvedValue({
      ...nadeemManager,
      isActive: true,
    });
    renderTable();
    await rowOf("Nadeem");

    fireEvent.click(
      within(await openActions("Nadeem")).getByRole("menuitem", {
        name: "Activate",
      }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "Activate Nadeem?",
    });
    fireEvent.click(within(confirm).getByRole("button", { name: "Activate" }));

    await waitFor(() => expect(activateStaff).toHaveBeenCalledWith("u2"));
    expect(await screen.findByText("Nadeem can sign in again.")).toBeVisible();
  });

  it("shows an error with retry, and 403 when the server refuses the list", async () => {
    vi.mocked(listStaff).mockRejectedValue(httpError(undefined, 500));
    const { unmount } = render(
      <TestProviders>
        <StaffTable />
      </TestProviders>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t load this list",
    );
    unmount();

    vi.mocked(listStaff).mockRejectedValue(httpError(undefined, 403));
    renderTable();
    expect(
      await screen.findByRole("heading", { name: "You don’t have access" }),
    ).toBeVisible();
  });

  it("shows the empty state", async () => {
    vi.mocked(listStaff).mockResolvedValue([]);
    renderTable();

    expect(await screen.findByText("No staff yet")).toBeVisible();
  });
});
