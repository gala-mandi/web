import { render, screen } from "@testing-library/react";
import { useMe } from "@/features/auth/hooks";
import type { User } from "@/features/auth/types";
import { useSessionStore } from "@/stores/session";
import { owner } from "@/test/fake-api";
import { TestProviders, testQueryClient } from "@/test/render-panel";
import { SettingsPage } from "./settings-page";

/** Stands in for the panel header, which reads the shop from `/auth/me`. */
function HeaderProbe() {
  const me = useMe();
  return <p data-testid="header-shop">{me.data?.tenant?.name}</p>;
}

/** Test only: the Settings page as `user`, with the header's `/auth/me` query. */
export function renderSettings(user: User = owner) {
  useSessionStore.getState().setSession({ accessToken: "token-1", user });
  const client = testQueryClient();
  render(
    <TestProviders client={client}>
      <HeaderProbe />
      <SettingsPage />
    </TestProviders>,
  );
  return { client };
}

/** Waits for the form to load. */
export async function loaded() {
  return screen.findByRole("heading", { level: 1, name: "Settings" });
}

export const saveButton = () =>
  screen.getByRole("button", { name: /^(Save changes|Saving…)$/ });
export const discardButton = () =>
  screen.getByRole("button", { name: "Discard changes" });
