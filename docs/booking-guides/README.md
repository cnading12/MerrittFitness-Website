# Booking Guides — Direct (Non-Platform) Bookings

These are the guides emailed to guests who book **directly** with Merritt
Wellness — i.e. *not* through the website and *not* through Peerspace/Giggster
(a rare case). They mirror the branding and content of the existing
Peerspace/Giggster guides, with all marketplace-platform references removed.
The request for the guest to send their direct contact information ahead of the
event is kept, since we still need to reach them directly.

## Files

| File | Purpose |
| --- | --- |
| `Merritt-Wellness-Onboarding-Guide.pdf` | Welcome / onboarding guide (3 pages) |
| `Merritt-Wellness-Public-Event-Marketing-Guide.pdf` | Collaborative marketing guide for public events (1 page) |
| `onboarding-guide.html` / `marketing-guide.html` | Editable HTML sources |
| `guide.css` | Shared branding/styles |
| `assets/logo.png` | Merritt Wellness logo |
| `generate-pdfs.mjs` | Renders the HTML to PDF with headless Chromium |

## Regenerating the PDFs

Edit the HTML/CSS, then re-render:

```bash
node docs/booking-guides/generate-pdfs.mjs
```

This uses Playwright + Chromium. If Playwright isn't installed locally:

```bash
npm i -D playwright && npx playwright install chromium
```

## What differs from the Peerspace/Giggster versions

- No mention of Peerspace, Giggster, or "booking platforms."
- Subtitles drop the "— Peerspace & Giggster Guests" qualifier.
- The intro no longer explains that a platform restricts contact exchange; it
  simply asks the guest to send their direct contact info so we can coordinate.
- All other content (contact directory, onboarding videos, Wi-Fi, policies,
  marketing offers/specs) is unchanged.
