import type { InvitationStatus, StaffRole } from "./types";

/**
 * Every user-facing string of the Staff page and the accept-invite screen.
 * Kept out of the components so an Urdu version can be added later.
 */

export const roleText = {
  owner: "Owner",
  manager: "Manager",
  operator: "Operator",
} as const satisfies Record<StaffRole, string>;

/** What each role may do, shown next to the role pickers. */
export const roleHint = {
  owner: "Everything, including staff and shop settings",
  manager: "Daily work and reports; no staff or settings",
  operator: "Rates, purchases, sales and payments only",
} as const satisfies Record<StaffRole, string>;

export const invitationStatusText = {
  pending: "Pending",
  accepted: "Accepted",
  cancelled: "Cancelled",
  expired: "Expired",
} as const satisfies Record<InvitationStatus, string>;

export const staffText = {
  tabs: {
    label: "Staff sections",
    staff: "Staff",
    invitations: "Pending invitations",
  },
  inviteButton: "Invite staff",
  table: {
    caption: "Staff of this shop",
    name: "Name",
    phone: "Phone",
    role: "Role",
    status: "Status",
    lastLogin: "Last login",
    actions: "Actions",
    you: "You",
    active: "Active",
    disabled: "Disabled",
    mustChangePassword: "Must change password",
    never: "Never",
    emptyTitle: "No staff yet",
    emptyBody: "Invite your managers and operators so they can sign in.",
  },
  actions: {
    menu: (name: string) => `Actions for ${name}`,
    changeRole: "Change role",
    deactivate: "Deactivate",
    activate: "Activate",
    cantDeactivateSelf: "You can’t deactivate yourself",
  },
  changeRole: {
    title: (name: string) => `Change role of ${name}`,
    description: "Pick what this person may do in your shop.",
    appliesSoon:
      "New permissions apply within 15 minutes, the next time their sign-in refreshes.",
    label: "Role",
    save: "Save role",
    saving: "Saving…",
    cancel: "Cancel",
    done: (name: string, role: string) => `${name} is now ${role}.`,
  },
  status: {
    deactivate: {
      title: (name: string) => `Deactivate ${name}?`,
      body: "They are signed out at once and can’t sign in until you activate them again. Entries they made stay in your records.",
      confirm: "Deactivate",
      pending: "Deactivating…",
      done: (name: string) => `${name} is deactivated.`,
    },
    activate: {
      title: (name: string) => `Activate ${name}?`,
      body: "They can sign in again with their phone and password.",
      confirm: "Activate",
      pending: "Activating…",
      done: (name: string) => `${name} can sign in again.`,
    },
    cancel: "Cancel",
  },
  invitations: {
    caption: "Invitations sent from this shop",
    phone: "Phone",
    role: "Role",
    status: "Status",
    expires: "Expires",
    sent: "Sent",
    actions: "Actions",
    cancel: "Cancel",
    resend: "Resend",
    resending: "Sending…",
    emptyTitle: "No invitations",
    emptyBody: "Invite staff by link or with a temporary password.",
    cancelDialog: {
      title: (phone: string) => `Cancel the invite to ${phone}?`,
      body: "The link stops working at once. You can send a new invite later.",
      confirm: "Cancel invite",
      pending: "Cancelling…",
      keep: "Keep invite",
      done: "Invite cancelled.",
    },
    resent: "New invite link created.",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    network: "Can’t reach the server. Check your internet and try again.",
  },
} as const;

export const inviteText = {
  title: "Invite staff",
  description:
    "Add a manager or operator. Send them a link to set their own password, or give them a temporary one.",
  phone: "Phone number",
  phonePlaceholder: "0300 1234567",
  role: "Role",
  method: "How will they sign in?",
  methods: {
    link: {
      label: "Send invite link",
      hint: "They open the link, add their name and choose a password.",
    },
    password: {
      label: "Set a temporary password",
      hint: "You give them a password; they change it at first sign-in.",
    },
  },
  name: "Full name",
  namePlaceholder: "e.g. Muhammad Bilal",
  submit: "Send invite",
  submitPassword: "Create account",
  submitting: "Sending…",
  cancel: "Cancel",
  errors: {
    phoneRequired: "Enter a phone number",
    phoneInvalid: "Enter a mobile number like 0300 1234567",
    roleRequired: "Pick a role",
    nameRequired: "Enter their name",
    nameTooLong: "Use 120 characters or fewer",
    phoneTaken: "This phone already has an account",
  },
} as const;

export const oneTimeText = {
  linkTitle: "Invite link ready",
  linkBody: (phone: string) =>
    `Send this link to ${phone}. It works once and expires in 48 hours.`,
  linkLabel: "Invite link",
  passwordTitle: "Account created",
  passwordBody: (name: string, phone: string) =>
    `${name} can sign in with ${phone} and this temporary password, then choose their own.`,
  passwordLabel: "Temporary password",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Couldn’t copy. Select the text and copy it yourself.",
  whatsapp: "Share on WhatsApp",
  whatsappMessage: (url: string) =>
    `You’re invited to join our shop on Galla Mandi. Open this link to set your password: ${url}`,
  warning:
    "This is shown only once. Copy it now: you can’t see it again after closing.",
  done: "Done",
} as const;

export const acceptText = {
  title: "You’re invited to join",
  ur: "آپ کو منڈی ٹیم میں شامل ہونے کی دعوت دی گئی ہے",
  body: "Your shop owner invited you to Galla Mandi. Add your name and choose a password to join.",
  name: "Your full name",
  namePlaceholder: "e.g. Muhammad Bilal",
  passwordLabel: "Create a password",
  submit: "Join shop",
  submitUr: "شامل ہوں",
  submitting: "Joining…",
  footer: "This invite works once. Not you?",
  ignore: "Ignore it",
  success: {
    title: (shop: string) => `You’re in, ${shop}`,
    body: "Your account is ready. Sign in with your phone number and the password you just chose.",
    ur: "آپ کا اکاؤنٹ تیار ہے",
    signIn: "Continue to sign in",
    signInUr: "سائن ان کریں",
  },
  failed: {
    title: "This invite can’t be used",
    phoneTakenTitle: "You already have an account",
    askOwner:
      "Ask your shop owner to send you a new invite from Staff › Invite staff.",
    toSignIn: "Go to sign in",
  },
  errors: {
    nameRequired: "Enter your name",
    nameTooLong: "Use 120 characters or fewer",
    missingToken:
      "This invite link is incomplete. Open the link from your message again.",
    INVITE_INVALID: "This invite link isn’t valid.",
    INVITE_USED: "This invite has already been used.",
    INVITE_CANCELLED: "This invite was cancelled by the shop owner.",
    INVITE_EXPIRED: "This invite has expired.",
    phoneTaken: "This phone already has an account — sign in instead.",
    tooMany: "Too many tries. Wait a minute and try again.",
  },
} as const;

/** Error codes the accept-invite endpoint returns for a dead invite. */
export const inviteErrorCodes = [
  "INVITE_INVALID",
  "INVITE_USED",
  "INVITE_CANCELLED",
  "INVITE_EXPIRED",
] as const;
export type InviteErrorCode = (typeof inviteErrorCodes)[number];
