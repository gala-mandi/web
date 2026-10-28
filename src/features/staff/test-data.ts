import type { Invitation, StaffMember } from "./types";

/** Test data only. */
export function staffMember(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: "u1",
    name: "Haji Aslam",
    phone: "03000000002",
    email: null,
    role: "owner",
    isActive: true,
    lastLoginAt: "2026-10-27T10:30:00.000Z",
    mustChangePassword: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    isYou: true,
    ...overrides,
  };
}

export const youOwner = staffMember();

export const bilalOperator = staffMember({
  id: "u3",
  name: "Bilal",
  phone: "03000000004",
  role: "operator",
  lastLoginAt: null,
  mustChangePassword: true,
  isYou: false,
});

export const nadeemManager = staffMember({
  id: "u2",
  name: "Nadeem",
  phone: "03000000003",
  role: "manager",
  isActive: false,
  isYou: false,
});

const day = 86_400_000;

/** ISO time `days` from now (negative = in the past). */
export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * day).toISOString();
}

export function invitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: "i1",
    phone: "03011234567",
    role: "operator",
    status: "pending",
    invitedBy: "u1",
    expiresAt: daysFromNow(2),
    createdAt: daysFromNow(0),
    ...overrides,
  };
}

export const inviteUrl = "http://localhost:3000/accept-invite?token=tok-123";
