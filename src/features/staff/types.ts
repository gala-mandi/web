/** Shapes of the staff management API (see the staff contract). */

/** Roles a shop user can have (no `super_admin`: that is platform-only). */
export type StaffRole = "owner" | "manager" | "operator";

/** Roles an invite can give; owners are never invited. */
export type InviteRole = Exclude<StaffRole, "owner">;

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: StaffRole;
  isActive: boolean;
  /** ISO, null when the person never signed in. */
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  /** The signed-in owner. */
  isYou: boolean;
}

export type InvitationStatus = "pending" | "accepted" | "cancelled" | "expired";

export interface Invitation {
  id: string;
  phone: string;
  role: InviteRole;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface ListResponse<T> {
  data: T[];
}

export type InviteMethod = "link" | "password";

export interface InviteInput {
  phone: string;
  role: InviteRole;
  method: InviteMethod;
  /** Required for `password`. */
  name?: string;
}

/**
 * The invite link or the temporary password in here is shown once and never
 * stored (not in the query cache, storage or the URL).
 */
export type InviteResult =
  | { method: "link"; invitation: Invitation; inviteUrl: string }
  | {
      method: "password";
      user: { id: string; name: string; phone: string; role: StaffRole };
      temporaryPassword: string;
    };

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
}

export interface AcceptInviteResult {
  phone: string;
  shopName: string;
}
