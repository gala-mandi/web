import { api } from "@/lib/api";
import type {
  AcceptInviteInput,
  AcceptInviteResult,
  Invitation,
  InviteInput,
  InviteResult,
  ListResponse,
  StaffMember,
  StaffRole,
} from "./types";

export async function listStaff(signal?: AbortSignal): Promise<StaffMember[]> {
  const { data } = await api.get<ListResponse<StaffMember>>("/staff", {
    signal,
  });
  return data.data;
}

export async function changeStaffRole(
  id: string,
  role: StaffRole,
): Promise<StaffMember> {
  const { data } = await api.patch<StaffMember>(
    `/staff/${encodeURIComponent(id)}/role`,
    { role },
  );
  return data;
}

export async function deactivateStaff(id: string): Promise<StaffMember> {
  const { data } = await api.post<StaffMember>(
    `/staff/${encodeURIComponent(id)}/deactivate`,
  );
  return data;
}

export async function activateStaff(id: string): Promise<StaffMember> {
  const { data } = await api.post<StaffMember>(
    `/staff/${encodeURIComponent(id)}/activate`,
  );
  return data;
}

export async function listInvitations(
  signal?: AbortSignal,
): Promise<Invitation[]> {
  const { data } = await api.get<ListResponse<Invitation>>(
    "/staff/invitations",
    { signal },
  );
  return data.data;
}

/** Also "Resend": the server cancels the old pending invite for this phone. */
export async function createInvitation(
  input: InviteInput,
): Promise<InviteResult> {
  const { data } = await api.post<InviteResult>("/staff/invitations", input);
  return data;
}

export async function cancelInvitation(id: string): Promise<Invitation> {
  const { data } = await api.delete<Invitation>(
    `/staff/invitations/${encodeURIComponent(id)}`,
  );
  return data;
}

/** Public: the invited person sets their name and password. */
export async function acceptInvite(
  input: AcceptInviteInput,
): Promise<AcceptInviteResult> {
  const { data } = await api.post<AcceptInviteResult>(
    "/auth/accept-invite",
    input,
  );
  return data;
}
