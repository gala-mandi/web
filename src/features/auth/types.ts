/** Shapes returned by the server auth API (see the auth contract). */

export type Role = "super_admin" | "owner" | "manager" | "operator";

export type TenantStatus = "trial" | "active" | "suspended" | "cancelled";

export interface Tenant {
  id: string;
  name: string;
  logoUrl: string | null;
  status: TenantStatus;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  /** null for super_admin */
  tenantId: string | null;
  mustChangePassword: boolean;
  tenant: Tenant | null;
}

export interface Session {
  accessToken: string;
  /** seconds */
  expiresIn: number;
  user: User;
}

export interface LoginInput {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export type OtpChannel = "whatsapp" | "sms";

export interface ForgotPasswordInput {
  phone: string;
  channel: OtpChannel;
}

export interface ForgotPasswordResult {
  message: string;
  /** seconds until the code expires */
  expiresIn: number;
  /** seconds until a new code can be requested */
  resendIn: number;
}

export interface ResetPasswordInput {
  phone: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface RevokedSessionsResult {
  revokedSessions: number;
}
