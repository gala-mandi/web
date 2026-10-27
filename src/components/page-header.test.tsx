import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("shows the title as the page heading and the description", () => {
    render(<PageHeader title="Traders" description="Every trader" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Traders" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Every trader")).toBeInTheDocument();
    expect(screen.queryByTestId("page-header-actions")).toBeNull();
  });

  it("shows the actions", () => {
    render(
      <PageHeader title="Traders" actions={<button>Add trader</button>} />,
    );

    expect(screen.getByTestId("page-header-actions")).toContainElement(
      screen.getByRole("button", { name: "Add trader" }),
    );
  });
});
