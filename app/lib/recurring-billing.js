// Pricing model: $0 base monthly price + invoice items written each cycle.
// Actual hours vary month-to-month (weekly slots land 4–5× per month,
// biweekly 2–3×), so no fixed amount would survive without overrides.
// Pending invoice items on the customer auto-attach to the next subscription
// invoice, which is how the prorated first-month charge lands on the first
// bill and how the monthly cron (next PR) will add each subsequent month.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: false,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Cached on a first call; we only need one product + one $0 price to share
// across every recurring booking since actual amounts come from invoice items.
const ZERO_PRICE_LOOKUP_KEY = 'merritt-recurring-base-zero-monthly';
const ZERO_PRODUCT_NAME = 'Merritt Wellness Recurring Rental (base)';

async function getOrCreateZeroMonthlyPrice() {
  // Prefer the lookup_key path — it's the Stripe-idiomatic way to have a
  // stable reference without hardcoding env vars.
  const existing = await stripe.prices.list({
    lookup_keys: [ZERO_PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (existing.data.length > 0) {
    return existing.data[0];
  }

  const product = await stripe.products.create({
    name: ZERO_PRODUCT_NAME,
    description:
      'Monthly billing container for recurring Merritt Wellness rentals. Actual usage is added each month as invoice items.',
  });

  return stripe.prices.create({
    product: product.id,
    unit_amount: 0,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: ZERO_PRICE_LOOKUP_KEY,
  });
}

// Billing anchor = first 1st-of-the-month strictly in the future. Stripe
// rejects anchors in the past, and using "next month's 1st" gives the
// prorated first-month invoice item time to be attached before the invoice
// auto-closes.
function nextFirstOfMonthUnix() {
  const now = new Date();
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return Math.floor(anchor.getTime() / 1000);
}

function parseRecurringDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.warn('⚠️ recurring_details was not valid JSON:', err.message);
      return null;
    }
  }
  return raw;
}

// Idempotent by design. Safe to call from both the client-driven subscription
// API route AND the webhook safety net — if the booking already has a
// subscription id, we return the existing record unchanged.
export async function finalizeRecurringSetup({ bookingId, setupIntentId }) {
  if (!bookingId) throw new Error('bookingId is required');
  if (!setupIntentId) throw new Error('setupIntentId is required');

  const { data: booking, error: lookupError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (lookupError || !booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  if (booking.stripe_subscription_id) {
    console.log('ℹ️ Recurring setup already complete for booking', bookingId);
    return { booking, subscription: null, alreadyDone: true };
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  if (setupIntent.status !== 'succeeded') {
    throw new Error(
      `SetupIntent is not succeeded (status=${setupIntent.status}). Refusing to create subscription.`
    );
  }
  if (!setupIntent.payment_method) {
    throw new Error('SetupIntent has no payment_method attached.');
  }
  if (setupIntent.metadata?.bookingId && setupIntent.metadata.bookingId !== bookingId) {
    throw new Error('SetupIntent metadata bookingId does not match the booking.');
  }

  const customerId = setupIntent.customer || booking.stripe_customer_id;
  if (!customerId) {
    throw new Error('No Stripe customer found on SetupIntent or booking.');
  }

  const paymentMethodId =
    typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method.id;

  // Attach the payment method (no-op if already attached via SetupIntent) and
  // set it as the customer default so future invoices auto-collect from it.
  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  } catch (err) {
    // Most common benign case: already attached. Any other error bubbles up.
    if (!/already been attached/i.test(err.message || '')) {
      throw err;
    }
  }
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const details = parseRecurringDetails(booking.recurring_details);
  const startDate =
    details?.startDate || details?.start_date || booking.event_date || null;
  const firstMonthCharge = Number(booking.subtotal) || 0; // set at intake: prorated first-month amount

  const zeroPrice = await getOrCreateZeroMonthlyPrice();
  const billingAnchor = nextFirstOfMonthUnix();

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: zeroPrice.id }],
    // Anchor to the 1st of the (next) month. Subsequent invoices auto-generate
    // on that date every month. `proration_behavior: 'none'` keeps Stripe from
    // trying to prorate the $0 base price — prorations for the first partial
    // month are handled explicitly via the pending invoice item below.
    billing_cycle_anchor: billingAnchor,
    proration_behavior: 'none',
    collection_method: 'charge_automatically',
    default_payment_method: paymentMethodId,
    metadata: {
      bookingId: booking.id,
      masterBookingId: booking.master_booking_id || booking.id,
      applicationType: 'recurring',
    },
  });

  // The prorated first-month amount (computed at intake and stored in
  // booking.subtotal) is attached as a pending invoice item. Stripe pulls
  // pending items onto the next auto-generated subscription invoice, so this
  // lands on the first subscription invoice on `billingAnchor`.
  if (firstMonthCharge > 0) {
    const description = `First-month prorated rental (${details?.slots?.length || 0} recurring slot(s), starts ${startDate || 'TBD'})`;
    await stripe.invoiceItems.create({
      customer: customerId,
      subscription: subscription.id,
      amount: Math.round(firstMonthCharge * 100),
      currency: 'usd',
      description,
      metadata: {
        bookingId: booking.id,
        kind: 'first_month_prorated',
      },
    });
  }

  const billingAnchorIso = new Date(billingAnchor * 1000).toISOString();

  // Merge our newly-computed billing context into whatever recurring_details
  // already held from intake, so downstream jobs have a single source of truth.
  const mergedDetails = {
    ...(details || {}),
    hourlyRate: details?.pricing?.hourlyRate || details?.hourlyRate || 95,
    slots: details?.slots || [],
    startDate,
    endDate: details?.endDate || null,
    monthlyMinCharge: details?.pricing?.monthlyMinCharge ?? null,
    monthlyMaxCharge: details?.pricing?.monthlyMaxCharge ?? null,
    weeklyHours: details?.pricing?.weeklyHours ?? null,
    firstMonthCharge,
    firstBillingDate: billingAnchorIso,
    paymentMethod: setupIntent.metadata?.paymentMethod || booking.payment_method || 'ach',
  };

  const update = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    pending_recurring_setup: false,
    status: 'recurring_active',
    payment_confirmed_at: new Date().toISOString(),
    recurring_details: mergedDetails,
    updated_at: new Date().toISOString(),
  };

  let { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', booking.id)
    .select()
    .single();

  // Pre-migration fallback: drop the new columns and retry so at least the
  // booking status is updated. The subscription still exists in Stripe; a
  // subsequent manual reconciliation can persist the ids once the migration
  // runs.
  const isMissingColumnError = (err) =>
    err && (err.code === 'PGRST204' || /column .* does not exist/i.test(err.message || ''));

  if (isMissingColumnError(updateError)) {
    console.warn('⚠️ Recurring columns missing on bookings — falling back.', updateError.message);
    const {
      stripe_subscription_id,
      stripe_customer_id,
      pending_recurring_setup,
      recurring_details,
      ...trimmed
    } = update;
    ({ data: updated, error: updateError } = await supabase
      .from('bookings')
      .update(trimmed)
      .eq('id', booking.id)
      .select()
      .single());
  }

  if (updateError) {
    console.error('❌ Failed to persist recurring setup results:', updateError);
    throw updateError;
  }

  return { booking: updated, subscription, alreadyDone: false };
}
