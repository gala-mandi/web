import { api } from "@/lib/api";

export interface Health {
  status: "ok";
  database: "up";
}

export async function getHealth(): Promise<Health> {
  const { data } = await api.get<Health>("/health");
  return data;
}
