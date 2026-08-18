// app/api/inquiry/route.js
//
// Lightweight intake for the marketing pages: event inquiries, tour requests,
// and the studio waitlist. Unlike /api/booking-request this creates no
// booking, takes no payment, and requires no documents — it stores a row in
// the `inquiries` table (best effort) and sends two emails.

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { lazyClient } from '../../lib/lazy-client.js';
import { z } from 'zod';
import { sendInquiryAck, sendInquiryNotification } from '../../lib/email.js';
import { enforceRateLimit } from '../../lib/rate-limit.js';

// This route sends email. Without an explicit maxDuration, Vercel's default
// (~10s) timeout can kill the function between the ack and the staff
// notification. Every route that sends email MUST export a maxDuration.
export const maxDuration = 60;

// Resend free plan allows 2 requests/second; space consecutive sends.
const EMAIL_RATE_LIMIT_DELAY_MS = 600;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const supabase = lazyClient(() => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
));

const InquirySchema = z.object({
  kind: z.enum(['event', 'tour', 'waitlist', 'congregation', 'class-partnership']),
  // Which page the form was submitted from, e.g. "/weddings".
  page: z.string().max(100).optional(),
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('Valid email is required').max(200),
  phone: z.string().max(40).optional(),
  eventType: z.string().max(100).optional(),
  eventDate: z.string().max(40).optional(),
  guestCount: z.string().max(20).optional(),
  // Waitlist only: when the practitioner hopes to start.
  startWindow: z.string().max(120).optional(),
  message: z.string().max(2000).optional(),
});

async function storeInquiry(inquiry) {
  try {
    const { error } = await supabase.from('inquiries').insert([{
      id: inquiry.id,
      kind: inquiry.kind,
      page: inquiry.page || null,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone || null,
      event_type: inquiry.eventType || null,
      event_date: inquiry.eventDate || null,
      guest_count: inquiry.guestCount || null,
      start_window: inquiry.startWindow || null,
      message: inquiry.message || null,
    }]);
    if (error) {
      console.error('⚠️ Inquiry DB insert failed (continuing — email is the fallback):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('⚠️ Inquiry DB insert threw (continuing — email is the fallback):', err.message);
    return false;
  }
}

export async function POST(request) {
  // Two Resend emails per call, from an unauthenticated form — the cheapest
  // thing on the site to abuse into a burned email quota.
  const limited = enforceRateLimit(request, 'inquiry');
  if (limited) return limited;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot first: bots that fill the hidden `website` field get a quiet
  // success and nothing happens — no validation error to learn from either.
  if (body?.website) {
    return Response.json({ success: true });
  }

  const parsed = InquirySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || 'Invalid inquiry';
    return Response.json({ error: message }, { status: 400 });
  }

  const inquiry = { id: uuidv4(), ...parsed.data };
  console.log(`📥 New ${inquiry.kind} inquiry ${inquiry.id} from ${inquiry.email} (${inquiry.page || 'unknown page'})`);

  const stored = await storeInquiry(inquiry);

  // Client-facing email FIRST, staff notification LAST: if the function is
  // ever cut short, the inquirer still hears from us and the stored row (or
  // the ack's email_events entry) lets staff recover the lead.
  let ackSent = false;
  let notificationSent = false;

  try {
    await sendInquiryAck(inquiry);
    ackSent = true;
  } catch (error) {
    console.error('❌ Inquiry ack email failed:', error.message);
  }

  await delay(EMAIL_RATE_LIMIT_DELAY_MS);

  try {
    await sendInquiryNotification(inquiry);
    notificationSent = true;
  } catch (error) {
    console.error('❌ Inquiry notification email failed:', error.message);
  }

  // The inquiry is safe if it reached the database OR the manager's inbox.
  if (stored || notificationSent) {
    return Response.json({ success: true, ackSent });
  }
  return Response.json(
    { error: 'We could not submit your inquiry. Please email manager@merrittwellness.net or call (720) 357-9499.' },
    { status: 500 }
  );
}
