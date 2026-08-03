// POST /api/inquiry — website inquiry + studio waitlist submissions.
//
// Forwards the submission to the venue manager via email. Follows the email
// delivery rules in CLAUDE.md: maxDuration exported (rule 1), send goes
// through sendEmailWithRetry (rule 3), and every send carries an
// Idempotency-Key derived from the client-generated submissionId (rule 7).

import { z } from 'zod';
import { sendInquiryNotification } from '../../lib/email.js';

export const maxDuration = 60;

const inquirySchema = z.object({
  type: z.enum(['inquiry', 'waitlist']).default('inquiry'),
  submissionId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  eventType: z.string().trim().max(120).optional().or(z.literal('')),
  eventDate: z.string().trim().max(40).optional().or(z.literal('')),
  startWindow: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().max(5000).optional().or(z.literal('')),
  sourcePage: z.string().trim().max(200).optional().or(z.literal('')),
});

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid inquiry submission' }, { status: 400 });
  }

  const inquiry = parsed.data;
  // Waitlist signups need a start window; inquiries need a message. Enforced
  // here (not in the schema) so the error stays readable.
  if (inquiry.type === 'waitlist' && !inquiry.startWindow) {
    return Response.json({ error: 'Desired start window is required' }, { status: 400 });
  }

  try {
    await sendInquiryNotification(inquiry);
    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Inquiry notification failed:', error);
    return Response.json({ error: 'Failed to send inquiry' }, { status: 502 });
  }
}
