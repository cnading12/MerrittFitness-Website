# Platform Onboarding PDFs (Peerspace / Giggster)

Clients who book through third-party platforms (Peerspace, Giggster) don't go
through the website's automated onboarding emails, and those platforms restrict
sharing our phone/email and don't surface the client's contact info to us. These
two handouts close that gap — attach/send them to platform bookings.

| File | Mirrors | Purpose |
| --- | --- | --- |
| `platform-onboarding.pdf` | `clientOnboarding` email (`app/lib/email.js`) | Full onboarding info (contacts, required videos, policies/fines, Wi-Fi). Leads with a loud request for the client's name, email, and phone — we need it to issue their access code. |
| `public-event-marketing.pdf` | `publicEventMarketing` email (`app/lib/email.js`) | For public events: the collaborative marketing we offer and the materials we need. Leads with a request to email us those materials plus the client's contact info. |

## Regenerating

The PDFs are produced by `scripts/generate-platform-onboarding-pdfs.mjs` using
Puppeteer (headless Chrome), which is a devDependency.

```bash
node scripts/generate-platform-onboarding-pdfs.mjs
# Visual QA: also emit full-page PNGs
QA_PNG=1 node scripts/generate-platform-onboarding-pdfs.mjs
```

If you edit the source emails in `app/lib/email.js`, update the matching copy in
the generator script and re-run it so the PDFs stay in sync.
