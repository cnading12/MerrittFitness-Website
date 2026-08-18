// app/api/promo/validate/route.js
//
// Server-side promo code validation.
//
// The booking page used to carry its own copy of the promo dictionary so it
// could price a code without a round-trip. Because app/book/page.tsx is a
// client component, that dictionary shipped in the public JavaScript bundle —
// so "view source" handed anyone the fully-comped sponsorship code, and a
// sponsored booking skips Stripe entirely, auto-confirms, and lands on the
// live venue calendar. The codes now live only in app/lib/booking-pricing.js
// (server-only) and the client asks this route.
//
// What this route deliberately does NOT do:
//   - enumerate codes: there is no "list" mode, and an invalid code gets the
//     same generic response no matter how close it was
//   - price the booking: it returns only the code's metadata, and
//     calculateAccuratePricing re-derives every dollar at intake. This route
//     is a UI affordance; /api/booking-request remains the source of truth.
//
// Brute-forcing the dictionary is the residual risk, so the route is rate
// limited harder than anything else on the site (15/hour/IP).

import { z } from 'zod';

import { VALID_PROMO_CODES } from '../../../lib/booking-pricing.js';
import { enforceRateLimit } from '../../../lib/rate-limit.js';

const RequestSchema = z.object({
  // Codes are short identifiers; the cap keeps a huge body from reaching the
  // dictionary lookup at all.
  code: z.string().min(1).max(64),
  // Used only to evaluate a code's `minHours` requirement so the renter gets
  // the specific "needs N+ hours" message instead of "invalid code".
  totalHours: z.coerce.number().min(0).max(500).optional().default(0),
});

export async function POST(request) {
  const limited = enforceRateLimit(request, 'promo-validate', {
    message: 'Too many promo code attempts. Please wait a few minutes and try again.',
  });
  if (limited) return limited;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ valid: false, error: 'Invalid request' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ valid: false, error: 'Invalid promo code' }, { status: 400 });
  }

  const code = parsed.data.code.trim();

  // Own-property lookup only. A plain object literal inherits from
  // Object.prototype, so a bare `VALID_PROMO_CODES[code]` treats
  // "constructor" or "toString" as a hit and hands back a function.
  const promo = Object.prototype.hasOwnProperty.call(VALID_PROMO_CODES, code)
    ? VALID_PROMO_CODES[code]
    : null;

  if (!promo) {
    // Same shape and status for every miss — nothing to distinguish a
    // near-miss from a nonsense string.
    return Response.json(
      { valid: false, error: 'Invalid promo code' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (promo.minHours && parsed.data.totalHours < promo.minHours) {
    return Response.json(
      {
        valid: false,
        error: `This code requires a reservation of ${promo.minHours}+ hours.`,
        minHours: promo.minHours,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Metadata only — enough for the client to render an accurate estimate,
  // and it never reveals any code the caller did not already supply.
  return Response.json(
    {
      valid: true,
      promo: {
        discount: promo.discount,
        description: promo.description,
        partner: promo.partner === true,
        sponsored: promo.sponsored === true,
        staffingBilled: promo.staffingBilled === true,
        minHours: promo.minHours ?? null,
      },
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}

export const dynamic = 'force-dynamic';
