import { api } from "@/lib/api";
import type { Settings, UpdateSettingsInput } from "./types";

export async function getSettings(signal?: AbortSignal): Promise<Settings> {
  const { data } = await api.get<Settings>("/settings", { signal });
  return data;
}

export async function updateSettings(
  input: UpdateSettingsInput,
): Promise<Settings> {
  const { data } = await api.patch<Settings>("/settings", input);
  return data;
}

/** PNG or JPG up to 1 MB; the server checks the file's bytes again. */
export async function uploadLogo(file: File): Promise<Settings> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<Settings>("/settings/logo", form);
  return data;
}
