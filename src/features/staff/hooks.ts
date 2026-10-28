import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toApiError } from "@/lib/api-error";
import {
  acceptInvite,
  activateStaff,
  cancelInvitation,
  changeStaffRole,
  createInvitation,
  deactivateStaff,
  listInvitations,
  listStaff,
} from "./api";
import type { AcceptInviteInput, InviteInput, StaffRole } from "./types";

export const staffKeys = {
  all: ["staff"] as const,
  lists: () => [...staffKeys.all, "list"] as const,
  members: () => [...staffKeys.lists(), "members"] as const,
  invitations: () => [...staffKeys.lists(), "invitations"] as const,
};

/** 403/404 won't change on a retry. */
function retryUnlessClientError(failureCount: number, error: unknown) {
  const { status } = toApiError(error);
  if (status === 403 || status === 404) return false;
  return failureCount < 1;
}

/** `GET /staff`: everyone in the shop, active and inactive. */
export function useStaff() {
  return useQuery({
    queryKey: staffKeys.members(),
    queryFn: ({ signal }) => listStaff(signal),
    retry: retryUnlessClientError,
  });
}

/** `GET /staff/invitations`, newest first. */
export function useInvitations() {
  return useQuery({
    queryKey: staffKeys.invitations(),
    queryFn: ({ signal }) => listInvitations(signal),
    retry: retryUnlessClientError,
  });
}

function useInvalidateStaff() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
}

/**
 * `POST /staff/invitations` (invite or resend). The response holds an invite
 * link or a temporary password, so nothing of it goes into the query cache
 * and the mutation is dropped as soon as nothing observes it (`gcTime: 0`);
 * call `reset()` once it has been shown.
 */
export function useInviteStaff() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: (input: InviteInput) => createInvitation(input),
    gcTime: 0,
    onSuccess: () => invalidate(),
  });
}

/** `DELETE /staff/invitations/:id`. */
export function useCancelInvitation() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: (id: string) => cancelInvitation(id),
    onSuccess: () => invalidate(),
  });
}

/** `PATCH /staff/:id/role`. */
export function useChangeRole() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: StaffRole }) =>
      changeStaffRole(id, role),
    onSuccess: () => invalidate(),
  });
}

export type StaffStatusAction = "deactivate" | "activate";

/** `POST /staff/:id/deactivate` or `/activate`. */
export function useStaffStatus() {
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: StaffStatusAction }) =>
      action === "deactivate" ? deactivateStaff(id) : activateStaff(id),
    onSuccess: () => invalidate(),
  });
}

/** `POST /auth/accept-invite` (public). Never cached: it carries the token. */
export function useAcceptInvite() {
  return useMutation({
    mutationFn: (input: AcceptInviteInput) => acceptInvite(input),
    gcTime: 0,
  });
}
