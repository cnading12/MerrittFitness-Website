// Generates two print-ready PDFs for clients who book through third-party
// platforms (Peerspace + Giggster). Those platforms restrict sharing our
// phone/email directly and don't route clients through our website's
// automated onboarding emails, so these PDFs:
//
//   1. platform-onboarding.pdf  — mirrors the clientOnboarding email, with a
//      prominent block up top asking the client to send us their email + phone
//      (we need it to issue their door access code and coordinate the event).
//   2. public-event-marketing.pdf — mirrors the publicEventMarketing email,
//      emphasizing the marketing materials we need for a public event.
//
// Both are standalone handouts (no per-booking personalization). The logo is
// embedded as a base64 data URI so the PDFs render without network access, and
// Chrome is asked to print backgrounds so the colored callout boxes survive.
//
// Usage:  node scripts/generate-platform-onboarding-pdfs.mjs
// Output: docs/platform-onboarding/*.pdf

import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const OUT_DIR = path.resolve('docs/platform-onboarding');
mkdirSync(OUT_DIR, { recursive: true });

// Embed the navbar logo so the PDF is fully self-contained.
const logoBase64 = readFileSync('public/images/hero/logo.png').toString('base64');
const LOGO = `<img src="data:image/png;base64,${logoBase64}" alt="Merritt Wellness" width="180" style="display: block; margin: 0 auto 16px auto; width: 180px; max-width: 60%; height: auto;" />`;

// Wraps an inner card in a print-optimized full HTML document.
function pageDoc(title, innerCard) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: Letter; margin: 0.55in; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body { font-family: Arial, Helvetica, sans-serif; }
    /* Keep callout boxes from splitting awkwardly across pages. */
    .box { page-break-inside: avoid; }
    a { color: inherit; }
  </style>
</head>
<body>
  <div style="max-width: 720px; margin: 0 auto;">
    ${innerCard}
  </div>
</body>
</html>`;
}

// Shared header used at the top of each document.
function header(headline, subhead) {
  return `
    <div style="text-align: center; margin-bottom: 26px;">
      ${LOGO}
      <h1 style="color: #10b981; margin: 0; font-size: 24px;">${headline}</h1>
      <p style="color: #6b7280; margin: 10px 0 0 0;">${subhead}</p>
    </div>`;
}

// Shared signature block used at the bottom of each document.
const SIGNATURE = `
  <div style="margin-top: 25px;">
    <p style="color: #374151; margin: 0 0 5px 0;">Warm regards,</p>
    <p style="color: #111827; font-weight: 600; margin: 0 0 10px 0;">Merritt Wellness Team</p>
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      MerrittWellness.net<br>
      clientservices@merrittwellness.net<br>
      720-357-9499
    </p>
  </div>`;

// The contact-exchange ask. This is the whole reason these PDFs exist, so it is
// loud and appears near the top of both documents.
const CONTACT_REQUEST = `
  <div class="box" style="background: #fee2e2; padding: 22px; border-radius: 10px; margin: 0 0 22px 0; border: 2px solid #dc2626;">
    <h2 style="color: #991b1b; margin: 0 0 12px 0; font-size: 20px;">First — Please Send Us Your Contact Info</h2>
    <p style="color: #7f1d1d; line-height: 1.6; margin: 0 0 12px 0;">
      Because you booked through a third-party platform, <strong>we don't yet have a direct way to reach you</strong>. To finish onboarding you and to send you your <strong>personal building access code</strong>, we need your direct contact information.
    </p>
    <p style="color: #7f1d1d; line-height: 1.6; margin: 0 0 12px 0; font-weight: 600;">
      Please email or text us the following as soon as possible:
    </p>
    <ul style="margin: 0 0 14px 0; padding-left: 20px; color: #7f1d1d; line-height: 1.9;">
      <li>Your <strong>full name</strong></li>
      <li>Your best <strong>email address</strong></li>
      <li>Your best <strong>phone number</strong> (for day-of coordination)</li>
    </ul>
    <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #fecaca;">
      <p style="margin: 0 0 6px 0; color: #111827;"><strong>Send to:</strong></p>
      <p style="margin: 0 0 4px 0; color: #059669; font-weight: 700; font-size: 16px;">clientservices@merrittwellness.net</p>
      <p style="margin: 0; color: #059669; font-weight: 700; font-size: 16px;">Call or text: 720-357-9499</p>
    </div>
    <p style="color: #7f1d1d; font-size: 14px; line-height: 1.6; margin: 12px 0 0 0;">
      We can't issue your access code or coordinate day-of logistics without this, so please reach out before your event date.
    </p>
  </div>`;

// ---------------------------------------------------------------------------
// PDF 1 — Onboarding (mirrors EMAIL_TEMPLATES.clientOnboarding)
// ---------------------------------------------------------------------------
const onboardingCard = `
  <div style="background: white; padding: 30px;">
    ${header('Welcome to Merritt Wellness', 'Important Information for Your Upcoming Event')}

    <div style="margin-bottom: 22px;">
      <p style="color: #374151; line-height: 1.6; margin: 0;">Hello, and welcome!</p>
      <p style="color: #374151; line-height: 1.6; margin: 15px 0;">
        Thank you so much for booking your event at Merritt Wellness. We truly appreciate your business and are excited to host you in our space.
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 15px 0;">
        Now that your booking is confirmed, we want to share a few important details to ensure everything runs smoothly leading up to&mdash;and during&mdash;your event. Please read this through in full.
      </p>
    </div>

    ${CONTACT_REQUEST}

    <!-- Primary Point of Contact -->
    <div class="box" style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">Primary Point of Contact</h2>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 10px 0;">For all event-related questions, including:</p>
      <ul style="margin: 10px 0; padding-left: 20px; color: #374151;">
        <li style="margin-bottom: 5px;">Day-of logistics</li>
        <li style="margin-bottom: 5px;">On-site access or facility questions</li>
        <li style="margin-bottom: 5px;">Scheduling details</li>
        <li style="margin-bottom: 5px;">Setup, breakdown, or general event coordination</li>
      </ul>
      <p style="color: #374151; line-height: 1.6; margin: 15px 0 10px 0;"><strong>Please direct all communication to:</strong></p>
      <p style="margin: 0 0 6px 0; color: #059669; font-weight: 600; font-size: 16px;">clientservices@merrittwellness.net</p>
      <p style="margin: 0; color: #059669; font-weight: 600; font-size: 16px;">720-357-9499</p>
      <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
        This inbox and phone line are actively monitored by our on-site team and are the fastest way to get support before and during your event.
      </p>
    </div>

    <!-- Manager Contact -->
    <div class="box" style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Manager Contact</h2>
      <p style="color: #451a03; line-height: 1.6; margin: 0 0 10px 0;">
        The <strong>manager@merrittwellness.net</strong> email and <strong>720-357-9499</strong> phone line are reserved strictly for:
      </p>
      <ul style="margin: 10px 0; padding-left: 20px; color: #451a03;">
        <li style="margin-bottom: 5px;">Future booking inquiries</li>
        <li style="margin-bottom: 5px;">Additional dates</li>
        <li style="margin-bottom: 5px;">Large-scale or long-term planning questions</li>
      </ul>
      <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
        Using the correct contact helps us respond quickly and keeps everything organized for your event.
      </p>
    </div>

    <!-- Onboarding Videos -->
    <div class="box" style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Required: Watch the Onboarding Videos Before Your Event</h2>
      <p style="color: #1e3a8a; line-height: 1.6; margin: 0 0 15px 0; font-weight: 600;">
        You <u>must</u> watch the onboarding video playlist before your event. These videos cover everything you need to know to operate the space safely and leave it ready for the next guest. Please do not wait until the day of &mdash; watch them in advance so you arrive prepared.
      </p>
      <ul style="margin: 0 0 15px 0; padding-left: 20px; color: #1e3a8a; line-height: 1.8;">
        <li><strong>How to lock up the building</strong> &mdash; the single most important video. Please watch it carefully (see policy section below).</li>
        <li>How to unlock and enter the building</li>
        <li>How to use the projector</li>
        <li>How to use the PA system</li>
        <li>Surround Sound Audio System &amp; Wireless Microphones</li>
        <li>How to operate the heating and air conditioning</li>
      </ul>
      <p style="margin: 0 0 10px 0; color: #1e40af;">
        <strong>Watch the Playlist:</strong>
        <a href="https://www.youtube.com/playlist?list=PLkE5cGIi8Zdjl6Sb3aa7UKqFrYWQN3uiu" style="color: #3b82f6; text-decoration: none;">youtube.com/playlist?list=PLkE5cGIi8Zdjl6Sb3aa7UKqFrYWQN3uiu</a>
      </p>
      <p style="color: #1e3a8a; line-height: 1.6; margin: 15px 0 0 0;">
        <strong>Need your access code?</strong> Email clientservices@merrittwellness.net or call 720-357-9499 to receive your personal access code before your event (and remember to send us your contact info above so we can reach you).
      </p>
    </div>

    <!-- Policies & Fines -->
    <div class="box" style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <h2 style="color: #991b1b; margin: 0 0 15px 0; font-size: 18px;">Important Policies &mdash; Please Read Carefully</h2>
      <p style="color: #7f1d1d; line-height: 1.6; margin: 0 0 15px 0;">
        To keep our space running smoothly for every guest, we ask that you follow these two policies. Failure to do so may result in a fine. <strong>Whether a fine is applied is entirely at Merritt Wellness's discretion</strong> &mdash; we reserve the right to issue or waive any fine on a case-by-case basis.
      </p>
      <div style="background: #ffffff; padding: 16px; border-radius: 6px; margin: 12px 0; border: 1px solid #fecaca;">
        <h3 style="color: #991b1b; margin: 0 0 8px 0; font-size: 16px;">1. Respect Your Booked Time &mdash; No Early Arrivals or Late Departures</h3>
        <p style="color: #7f1d1d; line-height: 1.6; margin: 0 0 8px 0;">
          You may be <strong>charged or fined</strong> if you use the space for longer than you have booked. <strong>There is no showing up early and no staying late.</strong> Please include any setup and cleanup time in your booked window.
        </p>
        <p style="color: #7f1d1d; line-height: 1.6; margin: 0;">
          We frequently book events back-to-back. Other guests will respect your time, and we ask that you respect theirs.
        </p>
      </div>
      <div style="background: #ffffff; padding: 16px; border-radius: 6px; margin: 12px 0; border: 1px solid #fecaca;">
        <h3 style="color: #991b1b; margin: 0 0 8px 0; font-size: 16px;">2. Lock Up Correctly &mdash; Watch the Lock-Up Video</h3>
        <p style="color: #7f1d1d; line-height: 1.6; margin: 0 0 8px 0;">
          Locking up properly is the <strong>most important</strong> thing you'll do at the end of your event. The lock-up video in the onboarding playlist is the most important video we have &mdash; please make sure you (and anyone helping you close out) are fully familiar with the lock-up process before your event.
        </p>
        <p style="color: #7f1d1d; line-height: 1.6; margin: 0;">
          If the building is not locked up correctly, you may be fined <strong>up to an additional $50</strong>.
        </p>
      </div>
      <p style="color: #7f1d1d; line-height: 1.6; margin: 12px 0 0 0; font-size: 14px;">
        Again, any fines are <strong>completely at Merritt Wellness's discretion</strong>. We'd much rather never have to issue one &mdash; watching the videos in advance is the easiest way to make sure that's the case.
      </p>
    </div>

    <!-- Wi-Fi -->
    <div class="box" style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">Wi-Fi Access</h2>
      <table style="border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #374151; font-weight: 600;">Network:</td>
          <td style="padding: 4px 0; color: #111827;">merrittcowork</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #374151; font-weight: 600;">Password:</td>
          <td style="padding: 4px 0; color: #111827;">Merritt23X</td>
        </tr>
      </table>
    </div>

    <!-- Closing -->
    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">
        If anything comes up as you prepare, don't hesitate to reach out to clientservices@merrittwellness.net or call 720-357-9499 &mdash; we're happy to help.
      </p>
      <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">
        Thank you again for choosing Merritt Wellness. We're grateful to be part of your event and look forward to hosting you.
      </p>
    </div>

    ${SIGNATURE}
  </div>`;

// ---------------------------------------------------------------------------
// PDF 2 — Public Event Marketing (mirrors EMAIL_TEMPLATES.publicEventMarketing)
// ---------------------------------------------------------------------------
const marketingCard = `
  <div style="background: white; padding: 30px;">
    ${header("Let's Promote Your Event Together", 'Collaborative Marketing for Public Events')}

    <div style="margin-bottom: 22px;">
      <p style="color: #374151; line-height: 1.6; margin: 0;">Hello, and welcome!</p>
      <p style="color: #374151; line-height: 1.6; margin: 15px 0;">
        If your event at Merritt Wellness is a <strong>public event</strong> open to the community, we'd love to help you spread the word &mdash; at no extra cost &mdash; as part of a collaborative marketing effort. Here's exactly what we offer and the materials we'll need from you to make it happen.
      </p>
    </div>

    <!-- Send us your materials (and contact info) -->
    <div class="box" style="background: #fee2e2; padding: 22px; border-radius: 10px; margin: 0 0 22px 0; border: 2px solid #dc2626;">
      <h2 style="color: #991b1b; margin: 0 0 12px 0; font-size: 20px;">Please Send Us Your Marketing Materials</h2>
      <p style="color: #7f1d1d; line-height: 1.6; margin: 0 0 12px 0;">
        Because you booked through a third-party platform, the fastest way to get your event promoted is to email us directly with your materials (detailed below) <strong>and</strong> your direct contact info &mdash; your <strong>name, email, and phone number</strong> &mdash; so we can coordinate.
      </p>
      <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #fecaca;">
        <p style="margin: 0 0 6px 0; color: #111827;"><strong>Send everything to:</strong></p>
        <p style="margin: 0 0 4px 0; color: #059669; font-weight: 700; font-size: 16px;">clientservices@merrittwellness.net</p>
        <p style="margin: 0; color: #059669; font-weight: 700; font-size: 16px;">Call or text: 720-357-9499</p>
      </div>
      <p style="color: #7f1d1d; font-size: 14px; line-height: 1.6; margin: 12px 0 0 0;">
        The sooner we receive these, the more runway we have to promote your event.
      </p>
    </div>

    <!-- What We Offer -->
    <div class="box" style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">What We Offer</h2>
      <ul style="margin: 0; padding-left: 20px; color: #065f46; line-height: 1.8;">
        <li><strong>A printed flyer</strong> hung on the community bulletin board in our wellness space.</li>
        <li><strong>A feature on the "Upcoming Events" tab</strong> of our website.</li>
        <li><strong>Social media support</strong> &mdash; we're happy to help advertise your event across our channels.</li>
      </ul>
    </div>

    <!-- What We Need -->
    <div class="box" style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h2 style="color: #92400e; margin: 0 0 8px 0; font-size: 18px;">What We Need From You</h2>
      <p style="color: #451a03; line-height: 1.6; margin: 0 0 16px 0;">To execute the three methods above, please send us the following:</p>

      <div style="background: #ffffff; padding: 16px; border-radius: 6px; margin: 12px 0; border: 1px solid #fde68a;">
        <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px;">1. For the Bulletin-Board Flyer</h3>
        <p style="color: #451a03; line-height: 1.6; margin: 0;">
          A <strong>print-ready PDF</strong> of your flyer that we can print and hang in our wellness space.
        </p>
      </div>

      <div style="background: #ffffff; padding: 16px; border-radius: 6px; margin: 12px 0; border: 1px solid #fde68a;">
        <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px;">2. For Our Website's "Upcoming Events" Tab</h3>
        <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #451a03; line-height: 1.8;">
          <li>An <strong>event description</strong></li>
          <li>Your <strong>social media handles</strong></li>
          <li>A <strong>link to purchase tickets</strong> (how customers can buy/register)</li>
          <li>An <strong>event image</strong> (specs below)</li>
        </ul>
        <div style="background: #f0fdf4; padding: 14px; border-radius: 6px; border: 1px solid #bbf7d0;">
          <p style="color: #065f46; font-weight: 600; margin: 0 0 8px 0; font-size: 14px;">Image specs:</p>
          <ul style="margin: 0; padding-left: 20px; color: #065f46; line-height: 1.7; font-size: 14px;">
            <li><strong>Aspect ratio: 16:10</strong> &mdash; most important. Off-ratio images get cropped.</li>
            <li><strong>Dimensions:</strong> 1600&times;1000px (or 1920&times;1200 for retina). A bigger source is fine &mdash; the site downscales.</li>
            <li><strong>Format:</strong> JPG or PNG are both fine &mdash; the site auto-converts to WebP/AVIF.</li>
            <li><strong>Keep the subject centered</strong> &mdash; we center-crop, and edges may trim on narrow screens.</li>
          </ul>
        </div>
      </div>

      <div style="background: #ffffff; padding: 16px; border-radius: 6px; margin: 12px 0; border: 1px solid #fde68a;">
        <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px;">3. For Social Media Promotion</h3>
        <p style="color: #451a03; line-height: 1.6; margin: 0;">
          Either <strong>tag us as a collaborator</strong> on your post, <em>or</em> <strong>send us the content</strong> you'd like shared and we'll post it to our social media.
        </p>
      </div>
    </div>

    <!-- Closing -->
    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">
        Just email us your materials, or reach out to clientservices@merrittwellness.net with any questions &mdash; we're excited to help make your event a success.
      </p>
    </div>

    ${SIGNATURE}
  </div>`;

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
const jobs = [
  { file: 'platform-onboarding.pdf', title: 'Merritt Wellness — Event Onboarding', html: onboardingCard },
  { file: 'public-event-marketing.pdf', title: 'Merritt Wellness — Public Event Marketing', html: marketingCard },
];

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  for (const job of jobs) {
    const page = await browser.newPage();
    await page.setContent(pageDoc(job.title, job.html), { waitUntil: 'networkidle0' });
    const outPath = path.join(OUT_DIR, job.file);
    await page.pdf({
      path: outPath,
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
    });
    // Optional full-page PNG for visual QA (QA_PNG=1). Not part of the deliverable.
    if (process.env.QA_PNG) {
      await page.screenshot({ path: outPath.replace(/\.pdf$/, '.png'), fullPage: true });
    }
    await page.close();
    console.log('Wrote', path.relative(process.cwd(), outPath));
  }
} finally {
  await browser.close();
}
