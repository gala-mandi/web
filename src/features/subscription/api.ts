import { api } from "@/lib/api";
import type { ShopSubscription } from "./types";

export async function getSubscription(
  signal?: AbortSignal,
): Promise<ShopSubscription> {
  const { data } = await api.get<ShopSubscription>("/subscription", {
    signal,
  });
  return data;
}
