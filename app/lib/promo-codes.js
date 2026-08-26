// Promo codes — the code STRINGS come from the environment, never from source.
//
// WHY THE ENVIRONMENT, AND NOT THIS FILE
//
// A promo code here is a credential, not a config value. `PROMO_CODE_COMP`
// comps a booking 100%: no Stripe, no card, confirmed on the spot, written to
// the live Google Calendar. Anyone holding that string can rent the venue for
// free, which makes it exactly as sensitive as an API key.
//
// This repository is PUBLIC. Every code that has ever been written into a
// source file is therefore readable at github.com — in the working tree and,
// permanently, in the commit history. Two generations of codes leaked that
// way before anyone noticed, and each "fix" moved them to a different file
// rather than out of the repo:
//
//   v1  hardcoded in app/book/page.tsx, so they also shipped in the JS bundle.
//   v2  moved to app/lib/booking-pricing.js — still in the bundle, because
//       app/page.tsx ('use client') imports it transitively through
//       app/lib/venue-rates.ts.
//   v3  bundle leak fixed (see pricing-constants.js) — but the codes were
//       still sitting in a public repo, which no bundling change can help.
//
// So the codes now live where the Stripe and Resend keys live: in environment
// variables, set in the Vercel dashboard, never committed. Rotating one is a
// dashboard edit and a redeploy, with no code change and no new commit.
//
// WHAT STAYS IN SOURCE
//
// Only the *meaning* of each code — its discount, its label, and which pricing
// rules it triggers. None of that is secret, and keeping it here is what lets
// the pricing engine stay readable and unit-testable. The secret is purely
// which string unlocks which role.
//
// FAILS CLOSED
//
// An unset variable means that role simply has no code — not that everything
// validates. Unset is the safe direction: a renter sees "invalid promo code"
// (annoying, recoverable) rather than the venue being comped by accident.

// The roles, their environment variables, and the pricing behavior each one
// triggers. `flags` are merged into the code's metadata.
//
// Every configured code carries `daytimeAllowed: true`: all four are issued by
// hand, so anyone holding one has already talked to us and can be trusted with
// the weekday daytime window (app/lib/flex-space-hours.js). The `daytime` role
// exists for the case where that is ALL you want to grant — daytime access and
// comped staff coverage, with venue time still billed in full.
const PROMO_ROLES = [
  {
    role: 'partner',
    env: 'PROMO_CODE_PARTNER',
    // The 20% partnership discount also flags the renter as a "recurring
    // partner" (8+ hrs/month). Recurring partners are exempt from mandatory
    // on-site staff coverage — except on their very first event, which
    // everyone pays for.
    discount: 0.20,
    description: 'Partnership Discount (20% off)',
    flags: { partner: true, daytimeAllowed: true },
  },
  {
    role: 'comp',
    env: 'PROMO_CODE_COMP',
    // Fully sponsored events: 100% off, zero fees, no payment collected. The
    // renter is never sent to checkout — the booking is confirmed immediately.
    // The `sponsored` flag is what the booking flow keys off of to skip
    // payment and what the calendar / emails use to label the reservation
    // "Sponsored".
    discount: 1.0,
    description: 'Sponsored — Complimentary Event',
    flags: { sponsored: true, daytimeAllowed: true },
  },
  {
    role: 'sponsor',
    env: 'PROMO_CODE_SPONSOR',
    // Venue-sponsored events where STAFFING is still billed: venue time,
    // Saturday premium, equipment, and mat are all comped, but mandatory staff
    // coverage is charged in full — the flat $35 first-hour onboarding for
    // <40-attendee events (required on every sponsored event, even for
    // returning renters), or $30/hr supervision for the ENTIRE event at 40+
    // attendees (e.g. 70 people for 4 hours = $120). Payment IS collected, so
    // no `sponsored` flag here.
    discount: 1.0,
    description: 'Sponsored — Venue Comped (staffing billed)',
    flags: { staffingBilled: true, daytimeAllowed: true },
  },
  {
    role: 'daytime',
    env: 'PROMO_CODE_DAYTIME',
    // Community daytime access. Unlocks the weekday 8 AM – 4 PM window that is
    // otherwise held for Merritt Workspace next door (see
    // app/lib/flex-space-hours.js for why that window exists), and comps staff
    // coverage — no $35 first-hour onboarding, no $30/hr Facility Host, on any
    // event booked with it.
    //
    // Venue time itself is NOT discounted: `discount: 0`. This code is an
    // access key, not a price cut. It exists so daytime programming that
    // benefits the whole building — a yoga class, a meditation sit, a quiet
    // workshop the workspace members can walk into — can be waved through by a
    // person, while a form keeps everything else out of the window.
    //
    // It is issued after a conversation with the renter, which is the whole
    // point: whether an event is "collaborative and quiet" or "amplified and
    // loud" is a judgement call, not something a booking form can infer.
    discount: 0,
    description: 'Community Daytime Access (workspace hours unlocked)',
    flags: { daytimeAllowed: true, waivesStaffCoverage: true },
  },
];

let warnedAboutMissing = false;

// Read one role's code from the environment. Trimmed, because a value pasted
// into a dashboard field routinely arrives with a stray space or newline and
// the resulting "why doesn't my code work" is invisible from the outside.
function codeForRole(role) {
  const raw = process.env[role.env];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// The live dictionary: { [code]: { discount, description, ...flags } }.
//
// Built on every call rather than cached at module load. That costs nothing at
// this size and keeps the codes rotatable by changing the environment alone —
// a cached copy would serve the old code until the process recycled.
export function validPromoCodes() {
  const dictionary = {};
  const missing = [];

  for (const role of PROMO_ROLES) {
    const code = codeForRole(role);
    if (!code) {
      missing.push(role.env);
      continue;
    }
    dictionary[code] = {
      discount: role.discount,
      description: role.description,
      ...role.flags,
    };
  }

  if (missing.length > 0 && !warnedAboutMissing) {
    warnedAboutMissing = true;
    console.warn(
      `⚠️ Promo codes not configured: ${missing.join(', ')}. Those codes will be ` +
      'rejected as invalid until the variables are set. This is the fail-closed ' +
      'direction — see app/lib/promo-codes.js.'
    );
  }

  return dictionary;
}

// Look one code up. Exact, case-sensitive match against the configured values.
//
// hasOwnProperty rather than `dictionary[code]`, because a plain lookup answers
// truthy for "constructor", "toString" and "__proto__" — which would validate a
// code that does not exist and hand the caller a function where metadata
// belongs.
export function lookupPromoCode(code) {
  if (!code || typeof code !== 'string') return null;
  const dictionary = validPromoCodes();
  const key = code.trim();
  return Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key] : null;
}

// Codes carrying a given flag, e.g. codesWithFlag('sponsored').
function codesWithFlag(flag) {
  return Object.entries(validPromoCodes())
    .filter(([, data]) => data[flag] === true)
    .map(([code]) => code);
}

// Codes that comp the entire booking (no payment, no card).
export function sponsoredPromoCodes() {
  return codesWithFlag('sponsored');
}

// Codes that identify a "recurring partner" (8+ hrs/month, 20% partnership
// discount) — exempt from mandatory staff coverage on repeat events.
export function partnerPromoCodes() {
  return codesWithFlag('partner');
}

// Codes that comp the venue but still bill staffing.
export function staffingBilledPromoCodes() {
  return codesWithFlag('staffingBilled');
}

export function isSponsoredPromoCode(code) {
  return lookupPromoCode(code)?.sponsored === true;
}

export function isPartnerPromoCode(code) {
  return lookupPromoCode(code)?.partner === true;
}

export function isStaffingBilledPromoCode(code) {
  return lookupPromoCode(code)?.staffingBilled === true;
}

// Whether this code unlocks the weekday daytime window otherwise held for the
// workspace next door (app/lib/flex-space-hours.js).
//
// Fails closed by construction: an unknown, empty, or unconfigured code
// resolves to null and answers false, so the window stays protected. That is
// the safe direction — a renter who was issued a code and can't use it calls
// us; a party that gets in at 11 AM on a Tuesday is next door's whole workday.
export function promoCodeAllowsDaytime(code) {
  return lookupPromoCode(code)?.daytimeAllowed === true;
}

// Whether this code comps staff coverage outright — no first-hour onboarding
// fee, no Facility Host charge, regardless of attendee count or whether it's
// the renter's first event. Distinct from the partnership exemption, which
// never applies to a renter's first event.
export function waivesStaffCoveragePromoCode(code) {
  return lookupPromoCode(code)?.waivesStaffCoverage === true;
}

// Codes that unlock the weekday daytime window.
export function daytimeAllowedPromoCodes() {
  return codesWithFlag('daytimeAllowed');
}

// Test seam only: the "have we warned yet" latch is module state, so a test
// that exercises the unconfigured path would otherwise silence later ones.
export function __resetPromoWarning() {
  warnedAboutMissing = false;
}
