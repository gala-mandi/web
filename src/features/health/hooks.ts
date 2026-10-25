import { useQuery } from "@tanstack/react-query";
import { getHealth } from "./api";

export const healthKeys = {
  all: ["health"] as const,
};

export function useHealth() {
  return useQuery({ queryKey: healthKeys.all, queryFn: getHealth });
}
