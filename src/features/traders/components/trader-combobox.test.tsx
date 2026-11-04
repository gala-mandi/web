import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/features/auth/types";
import { useSessionStore } from "@/stores/session";
import { owner } from "@/test/fake-api";
import { TestProviders } from "@/test/render-panel";
import { createTrader, lookupTraders } from "../api";
import { lookupItem, trader, urduTrader } from "../test-data";
import type { TraderLookupItem, TraderType } from "../types";
import { TraderCombobox } from "./trader-combobox";

vi.mock("../api", () => ({ lookupTraders: vi.fn(), createTrader: vi.fn() }));

const aslam = lookupItem();
const bashir = lookupItem(
  trader({
    id: "33333333-3333-4333-8333-333333333333",
    name: "Bashir Ahmed",
    fatherName: null,
    phone: "03111111111",
    village: "Okara",
  }),
);

const onChange = vi.fn();

function Harness({ type }: { type?: TraderType }) {
  const [value, setValue] = useState<TraderLookupItem | null>(null);
  return (
    <>
      <label htmlFor="kissan">Kissan</label>
      <TraderCombobox
        id="kissan"
        type={type}
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    </>
  );
}

function setup({
  user = owner,
  type,
}: { user?: User; type?: TraderType } = {}) {
  useSessionStore.getState().setSession({ accessToken: "t", user });
  render(
    <TestProviders>
      <Harness type={type} />
    </TestProviders>,
  );
  const trigger = screen.getByRole("combobox", { name: "Kissan" });
  fireEvent.click(trigger);
  return {
    trigger,
    input: () => screen.getByRole("combobox", { name: "Search traders" }),
  };
}

const queries = () => vi.mocked(lookupTraders).mock.calls.map(([q]) => q);

describe("TraderCombobox", () => {
  beforeEach(() => {
    onChange.mockReset();
    vi.mocked(createTrader).mockReset();
    vi.mocked(lookupTraders)
      .mockReset()
      .mockImplementation(async ({ q }) =>
        [aslam, bashir].filter((t) =>
          t.name.toLowerCase().includes(q.toLowerCase()),
        ),
      );
  });

  afterEach(() => useSessionStore.getState().clear());

  it("shows active traders with father name, phone and village", async () => {
    setup();

    const list = await screen.findByRole("listbox");
    const option = await within(list).findByRole("option", {
      name: /Muhammad Aslam/,
    });
    expect(option).toHaveTextContent("s/o Muhammad Akram");
    expect(option).toHaveTextContent("03001234567");
    expect(option).toHaveTextContent("Chak 45");
    expect(option).toHaveTextContent("Kissan");
    expect(queries()).toEqual([{ q: "", limit: 10 }]);
  });

  it("asks the server once after typing stops", async () => {
    const { input } = setup();
    await screen.findByRole("option", { name: /Muhammad Aslam/ });

    for (const value of ["b", "ba", "bas", "bash"]) {
      fireEvent.change(input(), { target: { value } });
    }

    await waitFor(() => expect(lookupTraders).toHaveBeenCalledTimes(2));
    expect(queries()).toEqual([
      { q: "", limit: 10 },
      { q: "bash", limit: 10 },
    ]);
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: /Muhammad Aslam/ }),
      ).toBeNull(),
    );
    expect(screen.getByRole("option", { name: /Bashir Ahmed/ })).toBeVisible();
    // Nothing more after the pause.
    await new Promise((r) => setTimeout(r, 400));
    expect(lookupTraders).toHaveBeenCalledTimes(2);
  });

  it("only looks up the given type", async () => {
    setup({ type: "kissan" });

    await screen.findByRole("option", { name: /Muhammad Aslam/ });
    expect(queries()).toEqual([{ q: "", type: "kissan", limit: 10 }]);
  });

  it("picks a trader with the keyboard", async () => {
    const { trigger, input } = setup();
    await screen.findByRole("option", { name: /Bashir Ahmed/ });

    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(bashir);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(trigger).toHaveTextContent("Bashir Ahmed");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows Urdu names right to left", async () => {
    vi.mocked(lookupTraders).mockResolvedValue([lookupItem(urduTrader)]);
    setup();

    const name = await screen.findByText("محمد اسلم");
    expect(name).toHaveAttribute("dir", "auto");
    expect(name).toHaveClass("font-urdu");
  });

  it("adds a new trader from the empty state and picks it", async () => {
    const created = trader({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Ghulam Rasool",
      fatherName: null,
      phone: null,
      village: null,
    });
    vi.mocked(createTrader).mockResolvedValue(created);
    const { trigger, input } = setup({ type: "kissan" });
    await screen.findByRole("option", { name: /Muhammad Aslam/ });

    fireEvent.change(input(), { target: { value: "Ghulam Rasool" } });
    expect(
      await screen.findByText("No active trader matches “Ghulam Rasool”."),
    ).toBeVisible();
    const add = screen.getByRole("option", {
      name: "Add “Ghulam Rasool” as new trader",
    });
    fireEvent.click(add);

    const sheet = await screen.findByRole("dialog", { name: "Add trader" });
    expect(within(sheet).getByLabelText(/^Name/)).toHaveValue("Ghulam Rasool");
    expect(within(sheet).getByRole("radio", { name: /Kissan/ })).toBeChecked();
    fireEvent.click(within(sheet).getByRole("button", { name: "Add trader" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(lookupItem(created)),
    );
    expect(createTrader).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ghulam Rasool", type: "kissan" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveTextContent("Ghulam Rasool");
  });

  it("offers no quick add without trader.create", async () => {
    const { input } = setup({
      user: { ...owner, permissions: ["trader.view"] },
    });
    await screen.findByRole("option", { name: /Muhammad Aslam/ });

    fireEvent.change(input(), { target: { value: "zzz" } });

    expect(
      await screen.findByText("No active trader matches “zzz”."),
    ).toBeVisible();
    expect(screen.queryByRole("option", { name: /as new trader/ })).toBeNull();
  });

  it("shows an error with retry", async () => {
    // One automatic retry, then the error shows.
    vi.mocked(lookupTraders)
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockRejectedValueOnce(new Error("Network Error"));
    setup();

    expect(await screen.findByText("Couldn’t load traders.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("option", { name: /Muhammad Aslam/ }),
    ).toBeVisible();
  });
});
