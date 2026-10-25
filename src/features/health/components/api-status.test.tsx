import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHealth } from "../api";
import { ApiStatus } from "./api-status";

vi.mock("../api", () => ({ getHealth: vi.fn() }));

function renderWithQuery() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

describe("ApiStatus", () => {
  beforeEach(() => {
    vi.mocked(getHealth).mockReset();
  });

  it("shows connected when the API is healthy", async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: "ok", database: "up" });

    renderWithQuery();

    expect(await screen.findByText("API connected")).toBeInTheDocument();
  });

  it("shows unreachable when the request fails", async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error("Network Error"));

    renderWithQuery();

    expect(await screen.findByText("API unreachable")).toBeInTheDocument();
  });

  it("shows a checking state while loading", () => {
    vi.mocked(getHealth).mockReturnValue(new Promise(() => undefined));

    renderWithQuery();

    expect(screen.getByRole("status")).toHaveTextContent("Checking API");
  });
});
