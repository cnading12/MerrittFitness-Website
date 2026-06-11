# Merritt Wellness — Google Apps Script emails

These are the two automated host emails that run from Google Apps Script
(not from the Next.js app). They are kept here for version control; the live
copies live in the Apps Script project tied to the Merritt Google account.

| File | What it sends | When |
| --- | --- | --- |
| `reviewEmails.gs` | Google review request | Morning after an event ends (`sendReviewEmails`, daily 8–9am trigger) |
| `reminderEmails.gs` | 24-hour onboarding reminder | Morning before an event (`sendEventReminders`, daily 8–9am trigger) |

`reminderEmails.gs` depends on shared helpers and constants defined in
`reviewEmails.gs` (parsing, host lookup, and the `mwEmailShell` / `mwButton` /
`mwParagraph` styling helpers). **Keep both files in the same Apps Script
project**, with `reviewEmails.gs` loaded first.

## Deliverability — please read before redesigning

A previous, heavier HTML design was getting flagged as spam, so no one saw it.
These versions are deliberately built to stay in the inbox:

- **No images at all.** A plain-text wordmark replaces the logo. Image-heavy
  HTML with little real text is one of the most common spam triggers.
- **Always multipart.** Every send includes a plain-text body that mirrors the
  HTML, with a healthy text-to-markup ratio.
- **Lightweight inline CSS.** One white card, one accent color, one bordered
  button — no gradients, no background images, no web fonts, no `<table>`
  layout tricks.
- **Plain, human copy.** First-person, signed by Cole; no ALL CAPS, no
  exclamation pileups, no salesy phrasing.

If you change the design, test it before trusting it:

1. Set `TEST_PREVIEW_EMAIL` / `TEST_REMINDER_EMAIL` near the bottom of each file.
2. Run `previewReviewWithSampleData()` / `previewReminderWithSampleData()`
   (these work even when there are no eligible events).
3. Confirm the message lands in your **Primary** inbox — not Spam or
   Promotions. That is the real test.

## Other useful functions

- `testRun()` / `testReminderRun()` — log what would be sent, send nothing.
- `listCalendars()` — print calendar IDs to set `CALENDAR_ID`.
- `seedExistingRecurringSeries()` — one-time, marks existing recurring series so
  long-time partners don't get a first-occurrence reminder.
