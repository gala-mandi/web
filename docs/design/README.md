# Galla Mandi — screen designs

These files are exported from the design canvas (the "Design canvas" link in tickets, which is
private). Tickets refer to screens by number, e.g. **1.1 Sign in**. This table maps each number to
its file in `auth/`.

| # | Screen | File | Built in |
|---|---|---|---|
| 1.1 | Sign in | `auth/Main.dc.html` | web |
| 1.2 | Sign in — wrong password | `auth/SignInError.dc.html` | web |
| 1.3 | Too many attempts | `auth/LockedOut.dc.html` | web |
| 2.1 | Forgot password | `auth/ForgotPassword.dc.html` | web |
| 2.2 | Verify OTP | `auth/VerifyOtp.dc.html` | web |
| 2.3 | Set new password | `auth/NewPassword.dc.html` | web |
| 2.4 | Password changed | `auth/PasswordChanged.dc.html` | web |
| 3.1 | Accept staff invite | `auth/AcceptInvite.dc.html` | web |
| 3.2 | First login — change password | `auth/ChangeTempPassword.dc.html` | web |
| 3.3 | Session expired | `auth/SessionExpired.dc.html` | web, admin |
| 4.1 | Shop suspended | `auth/ShopSuspended.dc.html` | web |
| 4.2 | Account disabled | `auth/AccountDisabled.dc.html` | web, admin |
| 4.3 | Super-admin sign in | `auth/AdminSignIn.dc.html` | admin |
| 5.1 | Mobile — sign in | `auth/MobileSignIn.dc.html` | app |
| 5.2 | Mobile — verify OTP | `auth/MobileOtp.dc.html` | app |
| — | Brand panel (left side of every desktop screen) | `auth/BrandPanel.dc.html` | web, admin |

Desktop screens are designed at 1440×900 and must also work down to phone width (the brand panel
wraps above the form). Mobile screens are 390×844.

## How to read the files

They are HTML with inline styles plus a few design-tool tags:

- `<dc-import name="BrandPanel">` — put the Brand panel component (`BrandPanel.dc.html`) here.
- `{{accent}}`, `{{btnA}}`, `{{ring}}` … — theme values. The `<script type="text/x-dc">` block at the
  bottom of each file shows how they are worked out (see the themes table below).
- `<sc-for list="{{rates}}">` — repeat the block for each item in that list (sample data is in the
  script block).
- `<x-dc>`, `<helmet>` and `support.js` belong to the design tool; ignore them.
- Links between screens (e.g. `href="AdminSignIn.dc.html"`) show the flow.

Build the screens with the project's components (Tailwind + shadcn/ui on web/admin, React Native on
the app). Match layout, copy, states and spacing; don't copy the inline styles.

## Themes

The shop can pick one of 6 themes. Default is **violet**.

| Theme | Accent (links, focus) | Button gradient | Brand panel gradient |
|---|---|---|---|
| violet | `#6D28D9` | `#6D28D9` → `#9333EA` | `#4C1D95` → `#9333EA` |
| indigo | `#4338CA` | `#4338CA` → `#7C3AED` | `#312E81` → `#6D28D9` |
| blue | `#1D4ED8` | `#1D4ED8` → `#2563EB` | `#1E3A8A` → `#2563EB` |
| green | `#065F46` | `#065F46` → `#047857` | `#064E3B` → `#047857` |
| red | `#BE123C` | `#BE123C` → `#E11D48` | `#881337` → `#E11D48` |
| dark | `#18181B` | `#18181B` → `#3F3F46` | `#18181B` → `#3F3F46` |

Focus ring = accent at 15% opacity (`26` alpha). Button shadow = accent at 50% (`80` alpha).

Shared tokens: page background `#F6F3FF`, card white with radius 24px, inputs 50px tall with
radius 12px, text `#1E1B2E`, secondary text `#5B5668`, borders `#DCD8E6`, error `#BE123C`,
success `#047857`. Fonts: Plus Jakarta Sans (headings), Inter (body), Noto Nastaliq Urdu (Urdu).

## Images

- `images/wheat-grain.webp` — the brand-panel photo. This is a small preview copy (it sits under a
  90% colour overlay, so it is enough for building); swap in a 1600px version before launch.
- `images/wheat-field.webp` — used by the success, admin and mobile screens. Full size, from
  Unsplash (photo `1500382017468-9049fed747ef`, Unsplash licence).

In the apps, put the images in `public/images/` (web, admin) or `assets/images/` (app).
