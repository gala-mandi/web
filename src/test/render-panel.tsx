import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { User } from "@/features/auth/types";
import { PanelShell } from "@/features/panel/components/panel-shell";
import { makeQueryClient } from "@/lib/query-client";
import { useSessionStore } from "@/stores/session";
import { useUiStore } from "@/stores/ui";
import { owner } from "./fake-api";

export function testQueryClient(): QueryClient {
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

/** Everything `Providers` gives the app, with a fresh query client. */
export function TestProviders({
  children,
  client = testQueryClient(),
}: {
  children: ReactNode;
  client?: QueryClient;
}) {
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

/** Renders the panel shell as a signed-in user. */
export function renderPanel(children: ReactNode = "page", user: User = owner) {
  useSessionStore.getState().setSession({ accessToken: "token-1", user });
  const client = testQueryClient();
  const result = render(
    <TestProviders client={client}>
      <PanelShell>{children}</PanelShell>
    </TestProviders>,
  );
  return { ...result, client };
}

export function resetStores(): void {
  useSessionStore.getState().clear();
  useUiStore.setState({ sidebarOpen: true, paletteOpen: false });
  localStorage.clear();
}
