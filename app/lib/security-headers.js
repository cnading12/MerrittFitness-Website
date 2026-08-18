// app/lib/security-headers.js
//
// The security headers sent with every page response, and the reasoning for
// each. middleware.js is the thin wrapper that applies them; the policy lives
// here so it can be unit tested without the Next runtime.

// Everything the pages legitimately load from another origin. Anything not
// listed is blocked by the browser, which is the point — if a script tag ever
// gets injected into a page, it has nowhere to call home.
const CSP_SOURCES = {
  // Google Fonts stylesheet + the font files it references.
  fontStyles: 'https://fonts.googleapis.com',
  fontFiles: 'https://fonts.gstatic.com',
  // Embedded Google Calendar (booking + home page) and the Maps embed.
  frames: 'https://calendar.google.com https://www.google.com',
  // Stripe.js, its inner frames, and the API it posts card details to.
  // Checkout breaks without all three.
  stripeScript: 'https://js.stripe.com',
  stripeFrames: 'https://js.stripe.com https://hooks.stripe.com',
  stripeConnect: 'https://api.stripe.com https://maps.googleapis.com',
  // Remote images: the configured next/image host, plus Stripe and Google
  // serving pixels and map tiles into their own widgets.
  images: 'https://images.unsplash.com https://*.stripe.com https://*.googleapis.com https://*.gstatic.com',
};

export function buildCsp() {
  return [
    // Nothing loads from anywhere unless a directive below allows it.
    `default-src 'self'`,

    // Scripts: same-origin bundles, Stripe.js, and inline.
    //
    // WHY 'unsafe-inline' RATHER THAN A NONCE — this was tried and reverted,
    // so please read before "fixing" it:
    //
    // The strong form of this directive is a per-request nonce plus
    // 'strict-dynamic'. It cannot work here. Almost every page in this app is
    // statically prerendered at build time, and Next.js can only stamp a nonce
    // onto script tags while rendering a request — so the cached HTML goes out
    // with no nonce attribute at all. Because 'strict-dynamic' makes browsers
    // ignore 'self' and host allowlists, the result is that EVERY script on
    // the site is blocked: a blank, non-interactive page including checkout.
    // (Verified against a production build: 15 script tags, zero nonces.)
    //
    // Making the nonce work would mean forcing dynamic rendering on every page
    // — giving up static caching across a marketing site — to defend against
    // script injection on pages that render no user-supplied HTML. That trade
    // isn't worth it here.
    //
    // Note also that a nonce and 'unsafe-inline' cannot be combined: browsers
    // ignore 'unsafe-inline' whenever a nonce or hash is present, so adding a
    // nonce "just in case" would silently re-break the site.
    //
    // What still holds the line if a script ever does get injected:
    // connect-src keeps it from phoning home, form-action keeps it from
    // posting the renter's data elsewhere, and base-uri stops it rewriting
    // every relative URL on the page.
    `script-src 'self' 'unsafe-inline' ${CSP_SOURCES.stripeScript}`,

    // Styles: 'unsafe-inline' is unavoidable here. Tailwind and Next inject
    // style attributes and inline <style> blocks that carry no nonce, and
    // Google Fonts serves a stylesheet. Inline CSS is a far weaker primitive
    // than inline JS, so this is the concession made.
    `style-src 'self' 'unsafe-inline' ${CSP_SOURCES.fontStyles}`,
    `font-src 'self' data: ${CSP_SOURCES.fontFiles}`,

    `img-src 'self' data: blob: ${CSP_SOURCES.images}`,
    `media-src 'self'`,

    // XHR/fetch targets. Same-origin covers our own API routes.
    `connect-src 'self' ${CSP_SOURCES.stripeConnect}`,

    // Iframes we embed: Stripe's payment frames, the Google Calendar embed,
    // the Maps embed.
    `frame-src 'self' ${CSP_SOURCES.stripeFrames} ${CSP_SOURCES.frames}`,

    // Nobody may embed US — the modern replacement for X-Frame-Options, and
    // the clickjacking defense that actually applies to the payment page.
    `frame-ancestors 'none'`,

    // No <object>/<embed>, and <base href> can't be rewritten to hijack every
    // relative URL on the page.
    `object-src 'none'`,
    `base-uri 'self'`,

    // Forms may only post back to us. Blocks an injected form that would
    // exfiltrate whatever the renter typed.
    `form-action 'self'`,

    // Upgrade any stray http:// subresource rather than blocking it outright.
    `upgrade-insecure-requests`,
  ].join('; ');
}

// The full header set, as plain data.
//
// X-Content-Type-Options is deliberately absent: it is set in next.config.js
// instead, so it also covers the /_next/* paths the middleware matcher skips.
// Setting it in both places would emit the header twice.
export function securityHeaders() {
  return {
    'Content-Security-Policy': buildCsp(),

    // Force HTTPS for two years, including subdomains, and allow preloading.
    // Safe here: the site is HTTPS-only on Vercel already.
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

    'X-Robots-Tag': 'index, follow',

    // Kept for pre-CSP browsers; `frame-ancestors 'none'` above is what modern
    // browsers actually enforce.
    'X-Frame-Options': 'DENY',

    // Deliberately `0`, not `1; mode=block`.
    //
    // X-XSS-Protection is the legacy Internet Explorer / old-Chrome auditor.
    // Its filter was itself exploitable — it could be induced to *create*
    // vulnerabilities by selectively neutering parts of a page — which is why
    // browsers removed it and why every current recommendation is to disable
    // it explicitly. The CSP above is the real protection.
    'X-XSS-Protection': '0',

    // Don't leak the full booking URL (which contains the booking id, the only
    // credential this app has) to third-party origins.
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Nothing here needs a camera, microphone, or the user's location.
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://js.stripe.com")',
  };
}

// Stripe verifies its webhook signature over the RAW request body, so that
// path is passed straight through without any middleware involvement.
export function isWebhookPath(pathname) {
  return pathname.startsWith('/api/webhooks/') || pathname.startsWith('/api/stripe-webhook');
}
