import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitch } from "@/components/language-switch";
import { CommodityName } from "@/features/commodities/components/commodity-name";
import { TraderName } from "@/features/traders/components/trader-name";
import { useParchiPrefs } from "@/stores/parchi";
import { useSessionStore } from "@/stores/session";
import { owner } from "@/test/fake-api";
import { setTestLocale } from "@/test/intl";
import { testQueryClient } from "@/test/render-panel";
import { readCookie, wantedLocale } from "./client";
import { intlLocale, localizeDigits, URDU_DIGITS } from "./config";
import { LocaleSync } from "./locale-sync";
import {
  LAST_LOCALE_COOKIE,
  shopLocaleCookie,
  USER_COOKIE,
  userLocaleCookie,
} from "./resolve";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

const getSettings = vi.fn();
vi.mock("@/features/settings/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/settings/api")>()),
  getSettings: (...args: unknown[]) => getSettings(...args),
}));

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

function withQuery(ui: ReactElement) {
  return (
    <QueryClientProvider client={testQueryClient()}>{ui}</QueryClientProvider>
  );
}

beforeEach(() => {
  clearCookies();
  refresh.mockClear();
  getSettings.mockReset();
  useSessionStore.getState().clear();
  useParchiPrefs.setState({ lang: null });
});
afterEach(() => clearCookies());

describe("language switch", () => {
  it("shows English / اردو, each in its own script, the current one pressed", () => {
    render(<LanguageSwitch />);
    const group = screen.getByRole("group", { name: "Language" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const urdu = screen.getByRole("button", { name: "اردو" });
    expect(urdu).toHaveAttribute("lang", "ur");
    expect(urdu).toHaveAttribute("aria-pressed", "false");
  });

  it("on the sign-in screen saves the choice as this browser's language and re-renders", () => {
    useParchiPrefs.setState({ lang: "en" });
    render(<LanguageSwitch />);
    fireEvent.click(screen.getByRole("button", { name: "اردو" }));
    expect(readCookie(LAST_LOCALE_COOKIE)).toBe("ur");
    expect(wantedLocale()).toBe("ur");
    expect(refresh).toHaveBeenCalledTimes(1);
    // Prints follow the new language unless picked again on a parchi.
    expect(useParchiPrefs.getState().lang).toBeNull();
  });

  it("for a signed-in user saves it for that user on this browser", () => {
    useSessionStore.getState().setSession({ accessToken: "t", user: owner });
    render(<LanguageSwitch />);
    fireEvent.click(screen.getByRole("button", { name: "اردو" }));
    expect(readCookie(userLocaleCookie(owner.id))).toBe("ur");
    document.cookie = `${USER_COOKIE}=${owner.id}; path=/`;
    expect(wantedLocale()).toBe("ur");
  });

  it("does nothing more when the language is already in use", () => {
    render(<LanguageSwitch />);
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("LocaleSync", () => {
  it("remembers the user and re-renders once in the shop's default language", async () => {
    useSessionStore.getState().setSession({ accessToken: "t", user: owner });
    getSettings.mockResolvedValue({ language: "ur" });
    render(withQuery(<LocaleSync user={owner} />));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(readCookie(USER_COOKIE)).toBe(owner.id);
    expect(readCookie(shopLocaleCookie(owner.id))).toBe("ur");
    expect(readCookie(LAST_LOCALE_COOKIE)).toBe("ur");
  });

  it("keeps the user's own choice over the shop default", async () => {
    useSessionStore.getState().setSession({ accessToken: "t", user: owner });
    document.cookie = `${userLocaleCookie(owner.id)}=en; path=/`;
    getSettings.mockResolvedValue({ language: "ur" });
    render(withQuery(<LocaleSync user={owner} />));
    await waitFor(() =>
      expect(readCookie(shopLocaleCookie(owner.id))).toBe("ur"),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("digits", () => {
  it("Urdu uses Western digits by default, from one switch", () => {
    expect(URDU_DIGITS).toBe("latn");
    expect(intlLocale("ur")).toBe("ur-PK-u-nu-latn");
    expect(intlLocale("en")).toBe("en-PK");
    expect(localizeDigits("1,250.50", "ur")).toBe("1,250.50");
  });
});

describe("mixed English / Urdu names", () => {
  it("each name keeps its own direction and font", () => {
    render(
      <p>
        <TraderName name="Muhammad Aslam" /> · <TraderName name="محمد اسلم" />
      </p>,
    );
    const latin = screen.getByText("Muhammad Aslam");
    const urdu = screen.getByText("محمد اسلم");
    expect(latin.tagName).toBe("BDI");
    expect(latin).toHaveAttribute("dir", "auto");
    expect(latin).toHaveAttribute("lang", "en");
    expect(urdu).toHaveAttribute("dir", "auto");
    expect(urdu).toHaveAttribute("lang", "ur");
    expect(urdu).toHaveClass("font-urdu");
  });

  it("a commodity leads with its Urdu name on the Urdu interface", () => {
    setTestLocale("ur");
    const { container } = render(<CommodityName name="Gandum" nameUr="گندم" />);
    const names = container.querySelectorAll("bdi");
    expect(names[0]).toHaveTextContent("گندم");
    expect(names[1]).toHaveTextContent("Gandum");
  });

  it("a commodity leads with its English name on the English interface", () => {
    const { container } = render(<CommodityName name="Gandum" nameUr="گندم" />);
    expect(container.querySelectorAll("bdi")[0]).toHaveTextContent("Gandum");
  });
});
