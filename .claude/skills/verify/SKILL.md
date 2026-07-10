---
name: verify
description: Build, launch, and drive the Merritt Wellness booking app to verify changes at the UI surface.
---

# Verifying changes in this repo

Build and launch (no env vars needed for client-side pages like /booking):

```bash
npm install                    # fresh containers start without node_modules
npx next build
npx next start -p 3100 &       # production server; /booking returns 200
```

API routes that touch Supabase/Stripe (booking-request insert, payments,
webhooks) can NOT be driven live without env vars — cover those with
`npm test` (mocked) and verify their pure pricing/scheduling logic via the
unit-tested helpers in `app/lib/`.

Drive the booking UI with Playwright (Chromium pre-installed at
`/opt/pw-browsers/chromium`; `npm install playwright --no-save` in the
scratchpad, don't run `playwright install`):

- The pricing sidebar updates live — locate it via
  `div:has(> h3:has-text("Monthly Billing Estimate"))` (recurring) or
  `"Pricing Summary"` (single) and read `innerText` after each input change.
- Switch tabs with `page.click('text=Recurring Events')`.
- Recurring slot day/frequency are `<select>`s inside the slot card; duration
  is a number input. Attendee count inputs are findable by label text.

Gotchas: the default recurring slot (Wednesday 6:00 PM, 2h weekly) already
qualifies for the 8+ hrs/month volume discount, so to see undiscounted rates
drop the duration below 2h first.
