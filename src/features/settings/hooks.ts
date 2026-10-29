import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { refreshShopInfo } from "@/features/panel/hooks";
import { toApiError } from "@/lib/api-error";
import { getSettings, updateSettings, uploadLogo } from "./api";
import type { Settings, UpdateSettingsInput } from "./types";

export const settingsKeys = {
  all: ["settings"] as const,
  detail: () => [...settingsKeys.all, "detail"] as const,
};

/** 403 won't change on a retry. */
function retryUnlessClientError(failureCount: number, error: unknown) {
  const { status } = toApiError(error);
  if (status === 403 || status === 404) return false;
  return failureCount < 1;
}

/** `GET /settings` (owner only). */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: ({ signal }) => getSettings(signal),
    retry: retryUnlessClientError,
  });
}

/**
 * Stores the server's answer and refreshes `/auth/me`, so the header shows a
 * new shop name or logo at once.
 */
function useOnSaved() {
  const queryClient = useQueryClient();
  return async (settings: Settings) => {
    queryClient.setQueryData(settingsKeys.detail(), settings);
    await refreshShopInfo(queryClient);
  };
}

/** `PATCH /settings` with only the changed fields. */
export function useUpdateSettings() {
  const onSaved = useOnSaved();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => updateSettings(input),
    onSuccess: onSaved,
  });
}

/** `POST /settings/logo`. */
export function useUploadLogo() {
  const onSaved = useOnSaved();
  return useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: onSaved,
  });
}
