// app/api/validate-promo/route.js
//
// Validates a promo code server-side and returns only that code's display
// metadata.
//
// WHY THIS ROUTE EXISTS
//   The booking page used to carry the whole promo dictionary in a client
//   component, which put every code — including the fully-comped sponsorship
//   code — into the public JavaScript bundle. Anyone who opened devtools could
//   read it and book the venue for $0: a sponsored booking skips Stripe
//   entirely, is confirmed on the spot, and lands on the live Google Calendar.
//
//   Now the codes exist only in app/lib/booking-pricing.js (server-side), and
//   the page has to ask. The response carries the discount metadata for the ONE
//   code submitted, which the UI needs to render the price breakdown — never
//   the list of codes.
//
// This route is advisory. It exists so the UI can show a discount before
// submit; the authoritative pricing is always recomputed by
// calculateAccuratePricing in /api/booking-request, which re-validates the code
// from scratch and ignores whatever the client claims the total is.

import { z } from 'zod';

import { lookupPromoCode } from '../../lib/promo-codes.js';
import { enforceRateLimit } from '../../lib/rate-limit.js';

// Codes are short, printable identifiers. Constraining the shape keeps the
// endpoint from being used to probe with long or odd payloads.
const RequestSchema = z.object({
  code: z.string().min(1).max(64),
});

// Without a cap this endpoint is a brute-force oracle: submit guesses until
// one returns valid:true. 10 tries a minute is far more than a renter typing a
// code off a flyer needs, and far too slow to enumerate a code space.
const RATE_LIMIT = { bucket: 'validate-promo', limit: 10, windowMs: 60_000 };

export async function POST(request) {
  const limited = enforceRateLimit(request, RATE_LIMIT);
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

  // Codes are matched exactly (case-sensitive), the same way
  // calculateAccuratePricing looks them up — so a code that validates here
  // behaves identically at intake.
  const code = parsed.data.code.trim();
  // lookupPromoCode guards the prototype chain, so "constructor"/"__proto__"
  // and friends cannot validate as codes.
  const promo = lookupPromoCode(code);

  if (!promo) {
    // 200 with valid:false, not 404: the outcome is a normal form result, and
    // a uniform status keeps the response shape simple for the caller.
    return Response.json({ valid: false, error: 'Invalid promo code' });
  }

  console.log(`🏷️  Promo code applied: ${code}`);

  return Response.json({
    valid: true,
    code,
    // Only this code's own attributes — never the dictionary.
    discount: promo.discount,
    description: promo.description,
    partner: promo.partner === true,
    sponsored: promo.sponsored === true,
    staffingBilled: promo.staffingBilled === true,
    minHours: promo.minHours ?? null,
  });
}

export const dynamic = 'force-dynamic';
