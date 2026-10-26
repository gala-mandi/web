import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpError } from "@/test/fake-api";
import { forgotPassword, resetPassword } from "../api";
import { ForgotPasswordFlow } from "./forgot-password-flow";

vi.mock("../api", () => ({ forgotPassword: vi.fn(), resetPassword: vi.fn() }));

async function goToCodeStep() {
  render(<ForgotPasswordFlow />);
  fireEvent.change(screen.getByLabelText("Phone number"), {
    target: { value: "300 1234567" },
  });
  fireEvent.click(screen.getByRole("button", { name: /send code/i }));
  await screen.findByRole("heading", { name: "Enter the 6-digit code" });
}

function typeCode(code: string) {
  fireEvent.paste(screen.getByLabelText("Digit 1 of 6"), {
    clipboardData: { getData: () => code },
  });
}

function setPassword(value: string) {
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value },
  });
}

describe("ForgotPasswordFlow", () => {
  beforeEach(() => {
    vi.mocked(forgotPassword).mockReset();
    vi.mocked(resetPassword).mockReset();
    vi.mocked(forgotPassword).mockResolvedValue({
      message: "sent",
      expiresIn: 600,
      resendIn: 60,
    });
  });

  it("validates the phone number before sending", async () => {
    render(<ForgotPasswordFlow />);
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send code/i }));

    expect(
      await screen.findByText("Enter a mobile number like 300 1234567"),
    ).toBeInTheDocument();
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it("sends the code, keeps it, resets the password and shows the devices signed out", async () => {
    vi.mocked(resetPassword).mockResolvedValue({ revokedSessions: 3 });
    await goToCodeStep();
    expect(forgotPassword).toHaveBeenCalledWith({
      phone: "03001234567",
      channel: "whatsapp",
    });

    typeCode("482915");
    fireEvent.click(screen.getByRole("button", { name: /verify code/i }));
    await screen.findByRole("heading", { name: "Set a new password" });
    setPassword("Gandum2026");
    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));

    expect(
      await screen.findByRole("heading", { name: "Password changed" }),
    ).toBeInTheDocument();
    expect(resetPassword).toHaveBeenCalledWith({
      phone: "03001234567",
      code: "482915",
      newPassword: "Gandum2026",
    });
    expect(
      screen.getByText(/We signed you out of 3 devices/),
    ).toBeInTheDocument();
  });

  it("asks for all 6 digits", async () => {
    await goToCodeStep();
    typeCode("123");
    fireEvent.click(screen.getByRole("button", { name: /verify code/i }));

    expect(await screen.findByText("Enter all 6 digits")).toBeInTheDocument();
  });

  it("goes back to the code step with the error on INVALID_OTP", async () => {
    vi.mocked(resetPassword).mockRejectedValue(
      httpError(undefined, 400, {
        code: "INVALID_OTP",
        message: "Invalid or expired code",
        errors: [{ field: "code", message: "Invalid or expired code" }],
      }),
    );
    await goToCodeStep();
    typeCode("000000");
    fireEvent.click(screen.getByRole("button", { name: /verify code/i }));
    await screen.findByRole("heading", { name: "Set a new password" });
    setPassword("Gandum2026");
    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));

    expect(
      await screen.findByRole("heading", { name: "Enter the 6-digit code" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Invalid or expired code")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Digit 1 of 6")).toHaveValue(""),
    );
  });

  it("checks that both passwords match", async () => {
    await goToCodeStep();
    typeCode("482915");
    fireEvent.click(screen.getByRole("button", { name: /verify code/i }));
    await screen.findByRole("heading", { name: "Set a new password" });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "Gandum2026" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "Gandum2027" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));

    expect(
      await screen.findByText("Passwords don’t match"),
    ).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
