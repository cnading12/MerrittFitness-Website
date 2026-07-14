// app/lib/email-log.js
//
// Durable, per-send delivery log for every transactional email.
//
// Why this exists: the "client only received their first email" incident kept
// recurring, and every diagnosis was a guess because the only evidence
// (console.log in a serverless function) evaporates with the invocation.
// Recording each send's outcome — accepted by Resend (with the Resend message
// id) or failed (with the error) — turns the next incident into a lookup
// instead of an investigation:
//
//   * a `sent` row with a resend_id proves the pipeline reached that email and
//     Resend accepted it → the problem is delivery-side (spam, bounce,
//     mailbox filtering), checkable via /api/admin/email-status which asks
//     Resend for the message's live last_event.
//   * a `failed` row carries the exact Resend error.
//   * NO row means the pipeline died before that send (timeout/crash).
//
// Writes are strictly best-effort: a logging failure (table not migrated yet,
// Supabase hiccup) must never break or delay-fail an actual email send.

import { createClient } from '@supabase/supabase-js';
import { lazyClient } from './lazy-client.js';

const supabase = lazyClient(() => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
));

// Insert one row into email_events. Never throws.
export async function recordEmailEvent({
  bookingId = null,
  masterBookingId = null,
  kind,
  recipient = null,
  status,               // 'sent' | 'failed'
  resendId = null,
  idempotencyKey = null,
  attempts = null,
  errorMessage = null,
} = {}) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return;

  try {
    const { error } = await supabase.from('email_events').insert({
      booking_id: bookingId,
      master_booking_id: masterBookingId,
      email_kind: kind,
      recipient,
      status,
      resend_id: resendId,
      idempotency_key: idempotencyKey,
      attempts,
      error_message: errorMessage,
    });
    if (error) {
      console.warn(`⚠️ [EMAIL-LOG] Failed to record ${kind} (${status}) for booking ${bookingId}: ${error.message}`);
    }
  } catch (err) {
    console.warn(`⚠️ [EMAIL-LOG] Failed to record ${kind} (${status}) for booking ${bookingId}: ${err.message}`);
  }
}
