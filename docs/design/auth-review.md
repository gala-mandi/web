# Auth screens — design review (ticket 40)

Built shop-panel pages compared with the design files in `docs/design/auth/` at 1440×900 and
390×844, in English and Urdu. Pictures (design | built English | built Urdu) are in
`review-shots/`, one per screen and size, plus `themes-sign-in.png` (the six themes). To make them
again: build and start the app on port 3000, then
`DESIGN_REVIEW=1 npx playwright test e2e/design-review.spec.ts --workers=1`
(full-size shots land in `test-results/design-review/`; the committed pictures were
palette-compressed to stay small).

Checked by tests on every run (`e2e/auth-a11y.spec.ts`, `src/app/theme-contrast.test.ts`):
keyboard order and focus ring on sign in (English and Urdu), buttons/inputs at least 44 px at
phone width, no sideways scroll, no clipped text or Nastaliq on any auth screen in Urdu (1440 and
390), theme swatches, 4.5:1 contrast for body text in all six themes.

| Screen | Built route | Result | Differences | Fixed or left |
|---|---|---|---|---|
| 1.1 Sign in | `/login` | Matches (brand panel, card, fields, remember me, two-language button, staff hint, theme swatches) | 1. No **Help on WhatsApp** link beside the language switch. 2. Footer shows only "© Galla Mandi" (design: "New shop? Request a demo · Platform admin · © Galla Mandi"). 3. Field label "Phone number or email" (design: "…or username"). 4. Urdu line under the brand headline sat on the right. 5. Theme swatches were missing. | 4, 5 fixed. 1, 2 left: both links go to `https://wa.me/` with no number in the design — the owner must give the support WhatsApp number (and decide if a public link to the admin panel belongs on the shop sign in). 3 left on purpose: the API signs in with phone or email; there are no usernames. |
| 1.2 Sign in — wrong password | `/login` (401) | Matches (red notice, attempts left, Urdu line, Caps Lock hint, Try again button) | Design's "Back to sign in · See lockout state" are canvas links between frames, not product links | — |
| 1.3 Too many attempts | `/login` (429) | Matches (ring timer, masked number, Urdu line, note, disabled retry, Reset password / Back to sign in) | — | — |
| 2.1 Forgot password | `/forgot-password` | Matches (step 1 of 3, phone with +92, WhatsApp / SMS choice, Send code, staff note) | Design's flag is a picture; built shows "PK" | Left (no flag images in the app) |
| 2.2 Verify OTP | `/forgot-password`, code step | Matches (6 boxes, timer, resend, Verify code, "send by SMS instead") | On a 390 px phone the six boxes pushed the page sideways (and the masked number broke over two lines in Urdu) | Fixed (boxes shrink to 45 px; number kept on one line) |
| 2.3 Set new password | `/forgot-password`, new password step | Matches (step 3 of 3, strength bar, rules, confirm) | Design has a "Sign out of all other devices (recommended)" checkbox | Left: the server always signs out every device after a reset, so the choice would not be honoured |
| 2.4 Password changed | `/forgot-password`, done | Matches (wheat-field picture, tick, devices signed out, Continue to sign in) | Design has "Didn't do this? Contact support" | Left: needs the support contact (owner) |
| 3.1 Accept staff invite | `/accept-invite?token=…` | Different content | Design shows the shop card ([Shop name], invited by [Owner name], role, what the role can do) and the phone from the invite; built shows name, new password and confirm only | Left: the server has no endpoint that tells the page about an invite before it is accepted (follow-up: `GET /auth/invitations/:token` preview) |
| 3.2 First login — change password | `/change-password` | Matches (greeting with the user's real name, temporary/new/confirm, Save and continue, Sign out) | Button label pushed the card wider than a phone in Urdu | Fixed (two-language button labels wrap) |
| 3.3 Session expired | `/login?reason=session-expired` | Different form | Design is a modal over the panel that keeps the unsaved entry and asks only for the password; built sends the user to sign in with a "Your session has ended" notice | Left: re-signing in a modal is a new flow (follow-up ticket) |
| 4.1 Shop suspended | `/shop-suspended` | Matches (badge, paused title, safe-data points) | Design's title has the shop name and a **Renew on WhatsApp** button; built says "Your shop is paused" and "contact support to renew" | Left: the page is reached after a refused sign-in, so the shop name is not known; the renew button needs the support WhatsApp number (owner) |
| 4.2 Account disabled | `/account-disabled` | Matches | "Back to sign in" was a text link; design shows an outlined full-width button. Design names [Shop name]/[Staff name]; built is generic (the user is not signed in) | Button fixed; names left |
| 5.1 Mobile — sign in | — | app — not built yet | — | — |
| 5.2 Mobile — verify OTP | — | app — not built yet | — | — |
| 4.3 Super-admin sign in | — | Built in admin | — | See admin's review |

Phone width: the built pages show a short brand panel (logo, headline, Urdu line) above the form,
so the form is on the first screen; the design wraps the full desktop panel above it. Kept on
purpose (one-handed use).

Urdu: every auth screen was checked at 1440 and 390 px. Nothing is clipped; the only problems
were the sideways scroll on 2.2 and 3.2 (fixed above).

Placeholders: the built pages show real data or neutral copy — no `[Shop name]`, `[Owner name]` or
`[Staff name]` text is left in the code. The brand panel's "Today's mandi rates" card shows sample
rates with a **Sample** badge, exactly as the design does (the sign-in page has no shop, so there
are no real rates); the owner decides whether to keep it.
