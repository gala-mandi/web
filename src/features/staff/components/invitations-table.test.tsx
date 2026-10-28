import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpError } from "@/test/fake-api";
import { TestProviders, testQueryClient } from "@/test/render-panel";
import { cancelInvitation, createInvitation, listInvitations } from "../api";
import { formatDate } from "@/lib/format";
import { daysFromNow, invitation } from "../test-data";
import { InvitationsTable } from "./invitations-table";

vi.mock("../api", () => ({
  listInvitations: vi.fn(),
  cancelInvitation: vi.fn(),
  createInvitation: vi.fn(),
}));

const pending = invitation();
const expired = invitation({
  id: "i2",
  phone: "03029998888",
  role: "manager",
  status: "expired",
  expiresAt: daysFromNow(-8),
});
const accepted = invitation({
  id: "i3",
  phone: "03037776666",
  status: "accepted",
});
const cancelled = invitation({
  id: "i4",
  phone: "03045554444",
  status: "cancelled",
});

function renderTable() {
  const client = testQueryClient();
  render(
    <TestProviders client={client}>
      <InvitationsTable />
    </TestProviders>,
  );
  return client;
}

async function rowOf(phone: string) {
  return (await screen.findByText(phone)).closest("tr")!;
}

describe("InvitationsTable", () => {
  beforeEach(() => {
    vi.mocked(listInvitations).mockReset();
    vi.mocked(cancelInvitation).mockReset();
    vi.mocked(createInvitation).mockReset();
    vi.mocked(listInvitations).mockResolvedValue([
      pending,
      expired,
      accepted,
      cancelled,
    ]);
  });

  it("shows each invitation with status, expiry and the allowed actions", async () => {
    renderTable();

    const p = await rowOf(pending.phone);
    expect(p).toHaveTextContent("Pending");
    expect(p).toHaveTextContent("Operator");
    expect(within(p).getByText(/^in \d+ (days?|hours?)$/)).toBeInTheDocument();
    expect(p).toHaveTextContent(formatDate(pending.expiresAt));
    expect(within(p).getByRole("button", { name: /^Resend/ })).toBeVisible();
    expect(within(p).getByRole("button", { name: /^Cancel/ })).toBeVisible();

    const e = await rowOf(expired.phone);
    expect(e).toHaveTextContent("Expired");
    expect(within(e).getByText(/ago$/)).toBeInTheDocument();
    expect(within(e).getByRole("button", { name: /^Resend/ })).toBeVisible();
    expect(within(e).queryByRole("button", { name: /^Cancel/ })).toBeNull();

    for (const done of [accepted, cancelled]) {
      const row = await rowOf(done.phone);
      expect(within(row).queryByRole("button")).toBeNull();
    }
    expect(await rowOf(accepted.phone)).toHaveTextContent("Accepted");
    expect(await rowOf(cancelled.phone)).toHaveTextContent("Cancelled");
  });

  it("cancels a pending invite after confirming", async () => {
    vi.mocked(cancelInvitation).mockResolvedValue({
      ...pending,
      status: "cancelled",
    });
    renderTable();
    const row = await rowOf(pending.phone);

    fireEvent.click(within(row).getByRole("button", { name: /^Cancel/ }));
    const confirm = await screen.findByRole("alertdialog", {
      name: `Cancel the invite to ${pending.phone}?`,
    });
    expect(cancelInvitation).not.toHaveBeenCalled();
    vi.mocked(listInvitations).mockResolvedValue([
      { ...pending, status: "cancelled" },
    ]);
    fireEvent.click(
      within(confirm).getByRole("button", { name: "Cancel invite" }),
    );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(cancelInvitation).toHaveBeenCalledWith("i1");
    expect(await screen.findByText("Invite cancelled.")).toBeVisible();
    await waitFor(async () =>
      expect(await rowOf(pending.phone)).toHaveTextContent("Cancelled"),
    );
  });

  it("keeps the invite when the confirmation is dismissed", async () => {
    renderTable();
    const row = await rowOf(pending.phone);

    fireEvent.click(within(row).getByRole("button", { name: /^Cancel/ }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Keep invite",
      }),
    );

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(cancelInvitation).not.toHaveBeenCalled();
  });

  it("resends with the same phone and role and shows the new link once", async () => {
    const newUrl = "http://localhost:3000/accept-invite?token=new-456";
    vi.mocked(createInvitation).mockResolvedValue({
      method: "link",
      invitation: { ...expired, id: "i9", status: "pending" },
      inviteUrl: newUrl,
    });
    const client = renderTable();
    const row = await rowOf(expired.phone);

    fireEvent.click(within(row).getByRole("button", { name: /^Resend/ }));

    const result = await screen.findByRole("alertdialog", {
      name: "Invite link ready",
    });
    expect(createInvitation).toHaveBeenCalledWith({
      phone: expired.phone,
      role: "manager",
      method: "link",
    });
    expect(within(result).getByLabelText("Invite link")).toHaveValue(newUrl);
    await waitFor(() => expect(listInvitations).toHaveBeenCalledTimes(2));

    fireEvent.click(within(result).getByRole("button", { name: "Done" }));

    await waitFor(() => expect(screen.queryByDisplayValue(newUrl)).toBeNull());
    expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain(
      "new-456",
    );
    await waitFor(() =>
      expect(client.getMutationCache().getAll()).toHaveLength(0),
    );
  });

  it("shows a toast when resending fails", async () => {
    vi.mocked(createInvitation).mockRejectedValue(
      httpError(undefined, 409, {
        message: "This phone already has an account",
        code: "PHONE_TAKEN",
      }),
    );
    renderTable();
    const row = await rowOf(pending.phone);

    fireEvent.click(within(row).getByRole("button", { name: /^Resend/ }));

    expect(
      await screen.findByText("This phone already has an account"),
    ).toBeVisible();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("shows the empty state", async () => {
    vi.mocked(listInvitations).mockResolvedValue([]);
    renderTable();

    expect(await screen.findByText("No invitations")).toBeVisible();
  });
});
