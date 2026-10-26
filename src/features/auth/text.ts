/**
 * Every user-facing string of the auth screens. Kept out of the components so
 * an Urdu version can be added later. `ur` lines are the Urdu sub-lines shown
 * in the designs.
 */

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const brandText = {
  name: "Galla Mandi",
  nameUr: "غلہ منڈی",
  headline: "Run your mandi like a modern business.",
  headlineUr: "اپنی منڈی کا پورا حساب ایک جگہ",
  intro:
    "Farmer khata, grain trading, pesticide sales and double-entry books in one calm workspace.",
  chips: [
    "Udhar + grain khata",
    "Automatic deductions",
    "Double-entry reports",
  ],
  ratesTitle: "Today’s mandi rates",
  ratesTitleUr: "آج کے ریٹ · فی من",
  ratesBadge: "Sample",
  rates: [
    {
      name: "Gandum",
      en: "Wheat",
      price: "Rs 4,150",
      change: "▲ 50",
      tone: "up",
    },
    {
      name: "Kapas",
      en: "Cotton",
      price: "Rs 8,900",
      change: "▼ 120",
      tone: "down",
    },
    {
      name: "Chawal",
      en: "Basmati",
      price: "Rs 9,600",
      change: "▲ 200",
      tone: "up",
    },
    {
      name: "Makai",
      en: "Maize",
      price: "Rs 2,950",
      change: "— 0",
      tone: "flat",
    },
  ],
  illustrationLabel: "Grain sacks next to a mandi weighing scale",
  features: [
    "Private to your shop",
    "Staff roles",
    "Every change recorded",
    "Works on slow internet",
  ],
} as const;

export const loginText = {
  title: "Welcome back",
  subtitle: "Sign in to your mandi account",
  // The design says "username"; the API takes a phone number or an email.
  identifierLabel: "Phone number or email",
  identifierPlaceholder: "0300 1234567",
  passwordLabel: "Password",
  passwordPlaceholder: "Your password",
  forgotPassword: "Forgot password?",
  rememberMe: "Keep me signed in on this device",
  submit: "Sign in",
  submitUr: "داخل ہوں",
  submitting: "Signing in…",
  retry: "Try again",
  retryUr: "دوبارہ کوشش کریں",
  staffHint: "Staff member? Your shop owner can also reset your password.",
  staffHintUr: "اسٹاف؟ آپ کا منڈی مالک بھی پاس ورڈ ری سیٹ کر سکتا ہے",
  copyright: "© Galla Mandi",
  errors: {
    identifierRequired: "Enter your phone number or email",
    identifierTooLong: "Use 160 characters or fewer",
    passwordRequired: "Enter your password",
    passwordTooLong: "Use 128 characters or fewer",
    invalidCredentials: "Phone number or password is incorrect",
    invalidCredentialsUr: "فون نمبر یا پاس ورڈ غلط ہے",
    attemptsLeft: (n: number) =>
      `${plural(n, "attempt", "attempts")} left before sign-in is paused for 1 minute.`,
    capsLock: "Check Caps Lock and try again.",
    network: "Can’t reach the server. Check your internet and try again.",
    unknown: "Something went wrong. Please try again.",
  },
  sessionExpired: {
    title: "Your session has ended",
    body: "For your safety you were signed out. Sign in again to continue.",
    ur: "سیشن ختم ہو گیا، دوبارہ سائن ان کریں",
  },
} as const;

export const lockedText = {
  title: "Sign-in paused",
  body: (who: string) =>
    `Too many wrong passwords for ${who}. You can try again in 1 minute.`,
  bodyGeneric: "Too many wrong passwords. You can try again in 1 minute.",
  ur: "بہت زیادہ غلط کوششیں۔ ایک منٹ بعد دوبارہ کوشش کریں",
  note: "We pause sign-in to protect your shop’s khata. If this wasn’t you, reset your password after the timer ends.",
  button: (time: string) => `Try again in ${time}`,
  timerLabel: "Time left before you can sign in again",
  resetPassword: "Reset password",
  backToSignIn: "Back to sign in",
} as const;

export const forgotText = {
  backToSignIn: "Back to sign in",
  back: "Back",
  step: (n: number) => `Step ${n} of 3`,
  request: {
    title: "Forgot your password?",
    body: "Enter the phone number on your account. We’ll send a 6-digit code to reset it.",
    ur: "اپنا فون نمبر درج کریں، ہم آپ کو کوڈ بھیجیں گے",
    phoneLabel: "Phone number",
    countryCode: "+92",
    country: "PK",
    phonePlaceholder: "300 1234567",
    channelLegend: "Send the code by",
    whatsapp: "WhatsApp",
    sms: "SMS",
    submit: "Send code",
    submitUr: "کوڈ بھیجیں",
    submitting: "Sending…",
    noPhone: "No phone on your account? Ask your shop owner to reset it from",
    noPhonePath: "Staff › Reset password",
  },
  code: {
    title: "Enter the 6-digit code",
    sentTo: (channel: string) => `We sent it on ${channel} to`,
    change: "Change",
    ur: "واٹس ایپ پر بھیجا گیا ۶ ہندسوں کا کوڈ درج کریں",
    legend: "One-time code",
    digitLabel: (i: number) => `Digit ${i} of 6`,
    expiresIn: (time: string) => `Code expires in ${time}`,
    expired: "Code expired. Send a new one.",
    resendIn: "Resend in",
    resend: "Resend code",
    resent: "We sent a new code.",
    submit: "Verify code",
    submitUr: "تصدیق کریں",
    didntGet: "Didn’t get it? Check the number, or",
    sendBySms: "send by SMS instead",
    sendByWhatsapp: "send on WhatsApp instead",
  },
  newPassword: {
    title: "Set a new password",
    ur: "نیا پاس ورڈ بنائیں",
    submit: "Save new password",
    submitUr: "محفوظ کریں",
    submitting: "Saving…",
  },
  errors: {
    phoneRequired: "Enter your phone number",
    phoneInvalid: "Enter a mobile number like 300 1234567",
    codeInvalid: "Enter all 6 digits",
    invalidOtp: "Invalid or expired code",
    tooMany: "Too many tries. Wait a minute and try again.",
  },
} as const;

export const passwordText = {
  newLabel: "New password",
  newPlaceholder: "At least 8 characters",
  confirmLabel: "Confirm new password",
  confirmPlaceholder: "Type it again",
  show: "Show password",
  hide: "Hide password",
  strengthLabel: "Password strength",
  strength: ["Too short", "Weak", "Fair", "Good", "Strong"],
  rules: {
    length: "At least 8 characters",
    number: "One number",
    case: "Upper and lower case",
    symbol: "One symbol (! @ #)",
  },
  matches: "Passwords match",
  errors: {
    tooShort: "Use at least 8 characters",
    tooLong: "Use 128 characters or fewer",
    mismatch: "Passwords don’t match",
    currentRequired: "Enter your current password",
  },
} as const;

export const changePasswordText = {
  greeting: "Assalam o Alaikum,",
  mustChange: {
    title: "Choose your own password",
    body: "Your shop owner gave you a temporary password. Replace it now — only you should know your password.",
    ur: "عارضی پاس ورڈ تبدیل کر کے اپنا پاس ورڈ بنائیں",
    currentLabel: "Temporary password",
  },
  voluntary: {
    title: "Change your password",
    body: "Enter your current password, then choose a new one.",
    ur: "اپنا پاس ورڈ تبدیل کریں",
    currentLabel: "Current password",
  },
  submit: "Save and continue",
  submitUr: "جاری رکھیں",
  submitting: "Saving…",
  signOut: "Sign out",
} as const;

export const passwordChangedText = {
  imageAlt: "Wheat field at sunrise",
  title: "Password changed",
  ready: "Your new password is ready.",
  signedOut: (n: number, other: boolean) =>
    n > 0
      ? ` We signed you out of ${plural(n, other ? "other device" : "device", other ? "other devices" : "devices")} to keep your khata safe.`
      : "",
  ur: "پاس ورڈ کامیابی سے تبدیل ہو گیا",
  toSignIn: "Continue to sign in",
  toSignInUr: "سائن ان کریں",
  toDashboard: "Continue",
  toDashboardUr: "جاری رکھیں",
} as const;

export const blockedText = {
  shopSuspended: {
    badge: "Shop suspended",
    title: (shop: string | null) =>
      shop ? `${shop} is paused` : "Your shop is paused",
    body: "This shop’s subscription has ended. Your khata, traders and reports are safe — nothing has been deleted.",
    ur: "دکان عارضی طور پر بند ہے، آپ کا تمام ڈیٹا محفوظ ہے",
    points: [
      "All data is kept for 90 days",
      "The owner can still download reports",
      "Everything unlocks the moment you renew",
    ],
    contact: "Shop suspended, contact support to renew.",
    anotherAccount: "Use another account",
    staff: "Staff? Ask your shop owner.",
  },
  accountDisabled: {
    title: "Your account is turned off",
    body: "The owner of your shop has turned off sign-in for your account. Entries you made before are still in the shop’s records.",
    ur: "آپ کا اکاؤنٹ منڈی مالک نے بند کر دیا ہے",
    hint: "Think this is a mistake? Ask your shop owner to turn your account back on from",
    hintPath: "Staff › your name › Activate",
    back: "Back to sign in",
  },
} as const;

export const guardText = {
  loading: "Loading your shop…",
} as const;
