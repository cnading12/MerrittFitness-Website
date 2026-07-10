// app/lib/email.js
// UPDATED VERSION - Includes home address in manager notification

import { Resend } from 'resend';
import { isSponsoredBooking } from './calendar-flags.js';
import { saturdayRateForWeekdayRate } from './booking-pricing.js';

// Instantiated on first send, not at module load: the Resend constructor
// throws without an API key, which breaks `next build` (page-data collection
// imports this module) in environments where RESEND_API_KEY isn't set.
let resendClient = null;
function getResend() {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

const EMAIL_CONFIG = {
  from: 'Merritt Wellness <clientservices@merrittwellness.net>',
  replyTo: 'clientservices@merrittwellness.net',
  clientServicesEmail: 'clientservices@merrittwellness.net'
};

// Every member of staff who MUST receive booking/operations notifications.
// Used as the guaranteed fallback when the OPS_EMAIL_* env vars are missing or
// blank, so a misconfiguration can never silently drop a staff recipient. The
// configured ops list (see getStaffRecipients) takes precedence when present.
const STAFF_FALLBACK_EMAILS = [
  'manager@merrittwellness.net',
  'clientservices@merrittwellness.net',
];

// Branded logo for email headers. Email clients can't load app-relative
// asset paths, so we reference the same navbar logo via its absolute public
// URL. Centers itself (display:block + margin auto) regardless of parent.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://merrittwellness.net';
const LOGO_HEADER = `<img src="${SITE_URL}/images/hero/logo.png" alt="Merritt Wellness" width="180" style="display: block; margin: 0 auto 16px auto; width: 180px; max-width: 60%; height: auto;" />`;

// A booking is public when the renter chose "public" on the form. Stored as a
// boolean `is_public` column; tolerate string/legacy shapes. Kept local to this
// module so the recurring email path can branch without importing from
// booking-fulfillment.js (which imports from here — avoids a cycle).
function isPublicBooking(booking) {
  return booking?.is_public === true || booking?.is_public === 'public';
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseRecurringDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

function formatBillingDate(value) {
  if (!value) return 'TBD';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
}

function describeSlot(slot) {
  const day = DAY_LABELS[Number(slot.dayOfWeek)] || 'Day';
  const freq = slot.frequency === 'weekly' ? 'Every' : slot.frequency === 'biweekly' ? 'Every other' : 'Once a month on';
  return `${freq} ${day} at ${slot.startTime} for ${slot.durationHours} hrs`;
}

// Format a dollar value for email display.
function money(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

// "Tables + Chairs" / "Tables" / "Chairs" / "None" — what equipment the renter
// requested. Used in both the client and manager event-detail tables.
function equipmentSummary(booking) {
  const parts = [];
  if (booking.needs_tables) parts.push('Tables');
  if (booking.needs_chairs) parts.push('Chairs');
  return parts.length ? parts.join(' + ') : 'None';
}

// Whether the renter chose to make the event public (community-facing).
function publicLabel(booking) {
  return isPublicBooking(booking) ? 'Public (open to the community)' : 'Private';
}

// Build an itemized cost-breakdown block from the persisted booking columns.
// Shared by the client confirmation (their receipt) and manager notification
// (so staff see exactly what was charged for). The `bookings` table stores the
// computed fees but NOT the base venue charge, so we derive it:
//   preDiscountSubtotal = base + saturday + onsite + supervision + equipment + mat
//   subtotal            = preDiscountSubtotal - promoDiscount
// → base = (subtotal + promoDiscount) - (saturday + onsite + supervision + equipment + mat)
// Sponsored bookings (100% comped) end at a $0.00 total.
function renderCostBreakdown(booking, { heading = 'Cost Breakdown', groupContext = null } = {}) {
  const sponsored = isSponsoredBooking(booking);
  // In a multi-event booking every row stores the SAME group-wide pricing, so
  // this breakdown is the combined charge for the whole group — not this one
  // event. Relabel the total and add a note so the figure can't be misread as a
  // per-event price.
  const isGroup = !!groupContext && groupContext.total > 1;
  const num = (v) => Number(v) || 0;
  const saturday = num(booking.saturday_charges);
  const onsite = num(booking.onsite_assistance_fee);
  const supervision = num(booking.event_supervision_fee);
  const supervisionHours = num(booking.event_supervision_hours);
  const equipment = num(booking.tables_chairs_fees);
  const mat = num(booking.mat_rental_fee);
  const promo = num(booking.promo_discount);
  const subtotal = num(booking.subtotal);
  const stripeFee = num(booking.stripe_fee);
  const total = num(booking.total_amount);
  const base = (subtotal + promo) - (saturday + onsite + supervision + equipment + mat);

  const row = (label, value, opts = {}) => {
    if (opts.skip) return '';
    const color = opts.color || '#111827';
    const weight = opts.bold ? '700' : '400';
    const border = opts.border ? 'border-top: 1px solid #d1fae5;' : '';
    return `<tr>
      <td style="padding: 6px 0; color: #374151; ${border}">${label}</td>
      <td style="padding: 6px 0; color: ${color}; text-align: right; font-weight: ${weight}; ${border}">${value}</td>
    </tr>`;
  };

  const paymentLabel = sponsored
    ? 'Sponsored — no payment collected'
    : booking.payment_method === 'ach'
      ? 'ACH bank transfer (no processing fee)'
      : booking.payment_method === 'pay-later'
        ? 'Pay later'
        : 'Card';

  return `
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 20px;">${heading}</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${row('Venue rental (base)', money(base))}
        ${row('Saturday surcharge', `+${money(saturday)}`, { skip: saturday <= 0, color: '#b45309' })}
        ${row('Full-floor mat', `+${money(mat)}`, { skip: mat <= 0, color: '#4f46e5' })}
        ${row('Tables &amp; chairs', `+${money(equipment)}`, { skip: equipment <= 0, color: '#7c3aed' })}
        ${row('Onboarding assistance (first hour)', `+${money(onsite)}`, { skip: onsite <= 0, color: '#0d9488' })}
        ${row(`Facility host (${supervisionHours} hrs · entire event)`, `+${money(supervision)}`, { skip: supervision <= 0, color: '#0f766e' })}
        ${row(booking.promo_code ? `Discount (${booking.promo_code})` : 'Discount', `-${money(promo)}`, { skip: promo <= 0, color: '#059669' })}
        ${row('Subtotal', money(subtotal), { bold: true, border: true })}
        ${row('Processing fee (3% card)', `+${money(stripeFee)}`, { skip: stripeFee <= 0, color: '#ea580c' })}
        ${row(isGroup ? `Total (all ${groupContext.total} events)` : 'Total', sponsored ? '$0.00' : money(total), { bold: true, border: true, color: '#059669' })}
      </table>
      ${isGroup ? `<p style="color: #4338ca; font-size: 13px; margin: 12px 0 0 0; line-height: 1.5;">This is the <strong>combined total for all ${groupContext.total} events</strong> in this booking, charged <strong>once</strong>. The same amount appears on every event's email — it is <strong>not</strong> billed again for each event.</p>` : ''}
      <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0 0;">Payment method: ${paymentLabel}</p>
    </div>`;
}

// Format a booking's event_date ("YYYY-MM-DD") for the multi-event list. Parsed
// as UTC so the day never shifts under the server's local timezone.
function formatEventDateShort(value) {
  if (!value) return 'TBD';
  const iso = String(value).length === 10 ? `${value}T00:00:00Z` : String(value);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  });
}

// When a renter books several events in one transaction, every booking row in
// the group stores the SAME group-wide pricing (one combined total, one shared
// discount, one Stripe fee). Each event still gets its own confirmation/manager
// email, so without context each email looks like a standalone charge — which
// makes the shared combined total read as a per-event price (the exact
// confusion staff hit). buildGroupContext surfaces the group so the templates
// can label the email "event X of N" and spell out that the amount is the
// combined, charged-once total. Returns null for single bookings (a group of
// one) so those emails render exactly as before.
export function buildGroupContext(booking, group) {
  if (!Array.isArray(group) || group.length <= 1) return null;
  const ordered = [...group].sort((a, b) =>
    String(a?.event_date || '').localeCompare(String(b?.event_date || ''))
  );
  const idx = ordered.findIndex((b) => b && b.id === booking.id);
  return {
    total: ordered.length,
    position: idx === -1 ? null : idx + 1,
    // Each row carries the group-wide total, so this booking's own total_amount
    // IS the combined charge — never sum the siblings or it multiplies.
    combinedTotal: Number(booking.total_amount) || 0,
    events: ordered.map((b) => ({
      id: b.id,
      date: b.event_date,
      time: b.event_time,
      name: b.event_name,
      isCurrent: b.id === booking.id,
    })),
  };
}

// Bulleted list of every event in a multi-event booking, with the current
// email's event flagged so the reader can place this notification in the group.
function renderGroupEventList(groupContext) {
  return groupContext.events.map((e) => {
    const when = `${formatEventDateShort(e.date)}${e.time ? ` &middot; ${e.time}` : ''}`;
    const current = e.isCurrent ? ' <strong>(this email)</strong>' : '';
    return `<li style="margin-bottom: 4px;">${when}${current}</li>`;
  }).join('');
}

// Prominent banner that opens both the client and manager emails for a
// multi-event booking. States the position in the group, that there is a single
// shared payment, and lists every event date. `audience` only tweaks wording.
function renderMultiEventBanner(groupContext, { audience }) {
  if (!groupContext || groupContext.total <= 1) return '';
  const { total, position, combinedTotal } = groupContext;
  const positionLabel = position ? `Event ${position} of ${total}` : `One of ${total} events`;
  const intro = audience === 'manager'
    ? `This renter booked <strong>${total} events</strong> in a single transaction. You receive one notification per event date, and they all refer to the <strong>same single payment</strong>.`
    : `You booked <strong>${total} events</strong> together in a single transaction. You receive one confirmation per event date, and they all refer to the <strong>same single payment</strong>.`;
  return `
    <div style="background: #eef2ff; border: 2px solid #6366f1; padding: 18px 20px; border-radius: 8px; margin: 0 0 20px 0;">
      <p style="margin: 0 0 8px 0; color: #3730a3; font-size: 16px; font-weight: 700;">📅 Multi-event booking — ${positionLabel}</p>
      <p style="margin: 0 0 12px 0; color: #312e81; font-size: 14px; line-height: 1.5;">
        ${intro} The amount below is the <strong>combined total for all ${total} events (${money(combinedTotal)}), charged once</strong> — it is <strong>not</strong> billed separately for each event.
      </p>
      <p style="margin: 0 0 6px 0; color: #3730a3; font-size: 13px; font-weight: 600;">All ${total} events in this booking:</p>
      <ul style="margin: 0; padding-left: 20px; color: #312e81; font-size: 13px; line-height: 1.6;">
        ${renderGroupEventList(groupContext)}
      </ul>
    </div>`;
}

// Enhanced email templates
// Exported (also referenced as `EMAIL_TEMPLATES` below) so tests can render
// individual templates without dispatching real emails through Resend.
export
const EMAIL_TEMPLATES = {
  bookingConfirmation: (booking, groupContext = null) => ({
    subject: `Booking Confirmed: ${booking.event_name} on ${booking.event_date}${groupContext?.total > 1 && groupContext.position ? ` (${groupContext.position} of ${groupContext.total})` : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            ${LOGO_HEADER}
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎉 Booking Confirmed!</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Merritt Wellness Historic Sanctuary</p>
          </div>

          ${isSponsoredBooking(booking) ? `
          <!-- Sponsored Banner -->
          <div style="background: #ecfdf5; border: 2px solid #10b981; padding: 18px; border-radius: 8px; margin: 0 0 20px 0; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: 700;">🎁 Sponsored Event</p>
            <p style="margin: 8px 0 0 0; color: #047857; font-size: 14px; line-height: 1.5;">
              This booking has been <strong>sponsored</strong> — there is <strong>no payment required</strong> and no card on file. Your total due is <strong>$0.00</strong>.
            </p>
          </div>
          ` : ''}

          ${renderMultiEventBanner(groupContext, { audience: 'client' })}

          <!-- Booking Details -->
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 20px;">Event Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Event:</td>
                <td style="padding: 8px 0; color: #111827;">${booking.event_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Type:</td>
                <td style="padding: 8px 0; color: #111827; text-transform: capitalize;">${booking.event_type?.replace('-', ' ')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Date:</td>
                <td style="padding: 8px 0; color: #111827;">${new Date(booking.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Time:</td>
                <td style="padding: 8px 0; color: #111827;">${booking.event_time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Duration:</td>
                <td style="padding: 8px 0; color: #111827;">${booking.hours_requested} hours</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Guest count:</td>
                <td style="padding: 8px 0; color: #111827;">${booking.expected_attendees ?? 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Tables &amp; chairs:</td>
                <td style="padding: 8px 0; color: #111827;">${equipmentSummary(booking)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Event visibility:</td>
                <td style="padding: 8px 0; color: #111827;">${publicLabel(booking)}</td>
              </tr>
              ${booking.serving_alcohol === true ? `
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Alcohol service:</td>
                <td style="padding: 8px 0; color: #111827;">Yes — you confirmed alcohol will be present</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #374151; font-weight: 600;">Location:</td>
                <td style="padding: 8px 0; color: #111827;">2246 Irving St, Denver, CO 80211</td>
              </tr>
            </table>
          </div>

          <!-- Cost Breakdown / Receipt -->
          ${renderCostBreakdown(booking, { heading: 'Your Receipt', groupContext })}

          ${booking.needs_mat ? `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 18px;">🤝 Assistance Services</h3>
            ${booking.needs_mat ? (
              Number(booking.mat_rental_fee) > 0
                ? '<p style="margin: 5px 0; color: #451a03;">✓ Full-floor mat included — our team will set it up and break it down within your reserved time.</p>'
                : '<p style="margin: 5px 0; color: #451a03;">✓ Full-floor mat included (partner) — setup and breakdown are your responsibility, within your reserved time.</p>'
            ) : ''}
          </div>
          ` : ''}

          <!-- Important Reminders -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Important Reminders</h3>
            <ul style="margin: 0; padding-left: 20px; color: #451a03;">
              <li style="margin-bottom: 8px;">Please include setup and cleanup time in your rental period</li>
              <li style="margin-bottom: 8px;">Return the space in the condition you found it</li>
              <li style="margin-bottom: 8px;">Arrive 15 minutes early for access</li>
              <li style="margin-bottom: 8px;">Contact us if you need to make any changes</li>
            </ul>
          </div>

          ${booking.special_requests ? `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">💬 Your Special Requests</h3>
            <p style="margin: 0; color: #451a03;">${booking.special_requests}</p>
          </div>
          ` : ''}

          <!-- Contact Info -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0;">Questions? Contact us:</p>
            <p style="color: #374151; margin: 5px 0;">📞 (303) 359-8337</p>
            <p style="color: #374151; margin: 5px 0;">📧 clientservices@merrittwellness.net</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
              (Simply reply to this email to reach us directly)
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Booking ID: <strong>${booking.id}</strong><br>
              Historic Merritt Wellness - Where Sacred Architecture Meets Modern Wellness
            </p>
          </div>
        </div>
      </div>
    `
  }),

  managerNotification: (booking, groupContext = null) => ({
    subject: `🆕 New Booking: ${booking.event_name} on ${booking.event_date}${groupContext?.total > 1 && groupContext.position ? ` (${groupContext.position} of ${groupContext.total})` : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${LOGO_HEADER}
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1e40af; margin: 0 0 15px 0;">🆕 New Booking Request</h2>
          <p style="color: #1e3a8a; margin: 0;">A new event has been booked at Historic Merritt Wellness!</p>
        </div>

        ${isSponsoredBooking(booking) ? `
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #065f46; margin: 0 0 8px 0;">🎁 SPONSORED — No Payment Collected</h2>
          <p style="color: #047857; margin: 0;">This booking was comped with a sponsored promo code (<strong>${booking.promo_code || 'sponsored'}</strong>). No charge was made and no card is on file. It is fully confirmed.</p>
        </div>
        ` : ''}

        ${renderMultiEventBanner(groupContext, { audience: 'manager' })}

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0;">Event Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 120px;">Event:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.event_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Type:</td>
              <td style="padding: 8px 0; color: #111827; text-transform: capitalize;">${booking.event_type?.replace('-', ' ')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Date:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.event_date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Time:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.event_time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Duration:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.hours_requested} hours</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Guest count:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.expected_attendees ?? 'Not specified'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Tables &amp; chairs:</td>
              <td style="padding: 8px 0; color: #111827;">${equipmentSummary(booking)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Full-floor mat:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.needs_mat ? (Number(booking.mat_rental_fee) > 0 ? 'Yes — staff sets up &amp; breaks down (within booked window)' : 'Yes — partner handles own setup &amp; breakdown') : 'No'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Visibility:</td>
              <td style="padding: 8px 0; color: #111827;">${publicLabel(booking)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Amount:</td>
              <td style="padding: 8px 0; color: #111827;">${isSponsoredBooking(booking) ? '$0.00 — 🎁 Sponsored (no charge)' : `$${booking.total_amount}${groupContext?.total > 1 ? ` <span style="color: #4338ca;">— combined total for all ${groupContext.total} events (charged once, not per event)</span>` : ''}`}</td>
            </tr>
          </table>

          ${booking.needs_mat ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
              <p style="color: #374151; font-weight: 600; margin: 0 0 5px 0;">Assistance Requested:</p>
              ${booking.needs_mat ? (
                Number(booking.mat_rental_fee) > 0
                  ? '<p style="color: #111827; margin: 5px 0; background: white; padding: 10px; border-radius: 4px;">✓ Full-floor mat (+$100) — WE set up &amp; break down, within the booked window.</p>'
                  : '<p style="color: #111827; margin: 5px 0; background: white; padding: 10px; border-radius: 4px;">✓ Full-floor mat (partner — no charge) — RENTER handles setup &amp; breakdown, within the booked window.</p>'
              ) : ''}
            </div>
          ` : ''}

          ${booking.special_requests ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
              <p style="color: #374151; font-weight: 600; margin: 0 0 5px 0;">Special Requests:</p>
              <p style="color: #111827; margin: 0; background: white; padding: 10px; border-radius: 4px;">${booking.special_requests}</p>
            </div>
          ` : ''}
        </div>

        <!-- Itemized cost breakdown so staff see exactly what the client paid for -->
        ${renderCostBreakdown(booking, { heading: 'Cost Breakdown', groupContext })}

        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #059669; margin: 0 0 15px 0;">Customer Information:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 120px;">Name:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.contact_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; color: #111827;">
                <a href="mailto:${booking.email}" style="color: #059669; text-decoration: none;">${booking.email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Phone:</td>
              <td style="padding: 8px 0; color: #111827;">
                ${booking.phone ? `<a href="tel:${booking.phone}" style="color: #059669; text-decoration: none;">${booking.phone}</a>` : 'Not provided'}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Address:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.home_address || 'Not provided'}</td>
            </tr>
            ${booking.business_name ? `
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Business:</td>
              <td style="padding: 8px 0; color: #111827;">${booking.business_name}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">ID Photo:</td>
              <td style="padding: 8px 0; color: #111827;">
                ${booking.id_photo_data
                  ? `Attached to this email (<code>${booking.id_photo_name || 'id-photo'}</code>)`
                  : '<span style="color: #b91c1c;">⚠️ Not provided — contact renter</span>'}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">Alcohol:</td>
              <td style="padding: 8px 0; color: #111827;">
                ${booking.serving_alcohol === true
                  ? '<strong style="color: #b45309;">Yes — alcohol will be present</strong>'
                  : booking.serving_alcohol === false
                    ? 'No'
                    : 'Not specified'}
              </td>
            </tr>
            ${booking.serving_alcohol === true ? `
            <tr>
              <td style="padding: 8px 0; color: #374151; font-weight: 600;">COI:</td>
              <td style="padding: 8px 0; color: #111827;">
                ${booking.coi_document_data
                  ? `Attached to this email (<code>${booking.coi_document_name || 'coi'}</code>)`
                  : '<span style="color: #b91c1c;">⚠️ Not provided — contact renter before the event</span>'}
              </td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0369a1; margin: 0 0 10px 0;">Booking Details:</h3>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Booking ID:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.id}</code></p>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Status:</strong> ${booking.status || 'Confirmed'}</p>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Payment Method:</strong> ${isSponsoredBooking(booking) ? 'Sponsored — No Payment Required' : (booking.payment_method === 'pay-later' ? 'Pay Later (No fees)' : 'Card Payment')}</p>
          <p style="margin: 5px 0; color: #0c4a6e;"><strong>Created:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px;">
            Calendar event automatically created<br>
            Customer confirmation email sent
          </p>
        </div>
      </div>
    `
  }),

  recurringSetupClient: (booking) => {
    const details = parseRecurringDetails(booking.recurring_details);
    const slots = details?.slots || [];
    const hourlyRate = details?.hourlyRate || details?.pricing?.hourlyRate || 95;
    // Saturday slots (dayOfWeek 6) bill at the Saturday band rate; surface it
    // alongside the weekday rate when the schedule includes any.
    const hasSaturdaySlot = slots.some((s) => Number(s?.dayOfWeek) === 6);
    const saturdayHourlyRate = details?.saturdayHourlyRate
      ?? details?.pricing?.saturdayHourlyRate
      ?? saturdayRateForWeekdayRate(hourlyRate);
    // The stored rates already include the automatic 20% volume discount for
    // schedules guaranteeing 8+ hrs/month — surface it, never re-apply it.
    const volumeDiscountApplied = details?.pricing?.volumeDiscountApplied === true;
    const monthlyMin = details?.monthlyMinCharge ?? details?.pricing?.monthlyMinCharge ?? null;
    const monthlyMax = details?.monthlyMaxCharge ?? details?.pricing?.monthlyMaxCharge ?? null;
    const firstMonthCharge = Number(details?.firstMonthCharge ?? booking.subtotal ?? 0);
    const firstBillingDate = formatBillingDate(details?.firstBillingDate);
    const startDate = details?.startDate || booking.event_date;
    const paymentMethod = (details?.paymentMethod || booking.payment_method || 'ach').toUpperCase();

    return {
      subject: `Recurring booking confirmed: ${booking.event_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              ${LOGO_HEADER}
              <h1 style="color: #059669; margin: 0; font-size: 24px;">Recurring Booking Confirmed</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0;">Merritt Wellness Historic Sanctuary</p>
            </div>

            <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">Hi ${booking.contact_name},</p>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
              Your recurring rental for <strong>${booking.event_name}</strong> is all set. Your payment method is on file and we will auto-charge on the first of each month going forward.
            </p>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">Billing Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600; width: 55%;">Start date:</td>
                  <td style="padding: 8px 0; color: #111827;">${formatBillingDate(startDate)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">First billing date:</td>
                  <td style="padding: 8px 0; color: #111827;">${firstBillingDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">First-month prorated charge:</td>
                  <td style="padding: 8px 0; color: #111827;">$${firstMonthCharge.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">Base monthly estimate:</td>
                  <td style="padding: 8px 0; color: #111827;">${monthlyMin !== null && monthlyMax !== null ? `$${Number(monthlyMin).toFixed(0)} – $${Number(monthlyMax).toFixed(0)}` : 'Calculated monthly'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">Payment method:</td>
                  <td style="padding: 8px 0; color: #111827;">${paymentMethod === 'ACH' ? 'ACH Auto-Debit (no fee)' : 'Card (3% processing fee)'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">Hourly rate:</td>
                  <td style="padding: 8px 0; color: #111827;">$${Number(hourlyRate).toFixed(0)}/hr${hasSaturdaySlot ? ` &middot; $${Number(saturdayHourlyRate).toFixed(0)}/hr Saturdays` : ''}${volumeDiscountApplied ? ' <span style="color: #059669; font-weight: 600;">(includes 20% volume discount — 8+ hrs/month)</span>' : ''}</td>
                </tr>
              </table>
            </div>

            ${slots.length ? `
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">Your Recurring Schedule</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.8;">
                ${slots.map(s => `<li>${describeSlot(s)}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            ${details?.needsMat ? `
            <div style="background: #eef2ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #3730a3; margin: 0 0 10px 0; font-size: 16px;">Full-Floor Mat</h3>
              <p style="margin: 0; color: #312e81; line-height: 1.6;">
                The full-floor roll-out mat is included with your partnership at no extra charge. Please note that setup and breakdown of the mat are your responsibility, and—like everything else—must happen within your reserved time so we can keep the calendar open for other bookings.
              </p>
            </div>
            ` : ''}

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Note on Monthly Totals</h3>
              <p style="margin: 0; color: #451a03; line-height: 1.6;">
                Each month's total will vary based on the actual number of occurrences in that month. Weekly slots typically land 4–5 times per month, biweekly slots 2–3 times, and monthly slots once. The base monthly estimate above reflects the expected range.
              </p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0;">Questions? Reach out any time:</p>
              <p style="color: #374151; margin: 5px 0;">(303) 359-8337</p>
              <p style="color: #374151; margin: 5px 0;">clientservices@merrittwellness.net</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Booking ID: <strong>${booking.id}</strong><br>
                Historic Merritt Wellness — Where Sacred Architecture Meets Modern Wellness
              </p>
            </div>
          </div>
        </div>
      `,
    };
  },

  recurringSetupManager: (booking) => {
    const details = parseRecurringDetails(booking.recurring_details);
    const slots = details?.slots || [];
    const hourlyRate = details?.hourlyRate || details?.pricing?.hourlyRate || 95;
    const hasSaturdaySlot = slots.some((s) => Number(s?.dayOfWeek) === 6);
    const saturdayHourlyRate = details?.saturdayHourlyRate
      ?? details?.pricing?.saturdayHourlyRate
      ?? saturdayRateForWeekdayRate(hourlyRate);
    // Stored rates already include the automatic 20% volume discount for
    // schedules guaranteeing 8+ hrs/month — flag it so staff know why the
    // rate is below the standard band.
    const volumeDiscountApplied = details?.pricing?.volumeDiscountApplied === true;
    const monthlyMin = details?.monthlyMinCharge ?? details?.pricing?.monthlyMinCharge ?? null;
    const monthlyMax = details?.monthlyMaxCharge ?? details?.pricing?.monthlyMaxCharge ?? null;
    const firstMonthCharge = Number(details?.firstMonthCharge ?? booking.subtotal ?? 0);
    const firstBillingDate = formatBillingDate(details?.firstBillingDate);
    const startDate = details?.startDate || booking.event_date;
    const paymentMethod = (details?.paymentMethod || booking.payment_method || 'ach').toUpperCase();

    return {
      subject: `New recurring booking: ${booking.event_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${LOGO_HEADER}
          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px;">
            <h2 style="color: #1e40af; margin: 0 0 10px 0;">New Recurring Booking</h2>
            <p style="color: #1e3a8a; margin: 0;">A new recurring series is active at Historic Merritt Wellness. Auto-debit is set up and the first invoice will close on ${firstBillingDate}.</p>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Series Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600; width: 40%;">Series:</td><td style="padding: 8px 0; color: #111827;">${booking.event_name}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Type:</td><td style="padding: 8px 0; color: #111827; text-transform: capitalize;">${booking.event_type?.replace('-', ' ') || ''}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Start date:</td><td style="padding: 8px 0; color: #111827;">${formatBillingDate(startDate)}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">First billing date:</td><td style="padding: 8px 0; color: #111827;">${firstBillingDate}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">First-month prorated charge:</td><td style="padding: 8px 0; color: #111827;">$${firstMonthCharge.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Base monthly estimate:</td><td style="padding: 8px 0; color: #111827;">${monthlyMin !== null && monthlyMax !== null ? `$${Number(monthlyMin).toFixed(0)} – $${Number(monthlyMax).toFixed(0)}` : 'Calculated monthly'}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Hourly rate:</td><td style="padding: 8px 0; color: #111827;">$${Number(hourlyRate).toFixed(0)}/hr${hasSaturdaySlot ? ` &middot; $${Number(saturdayHourlyRate).toFixed(0)}/hr Saturdays` : ''}${volumeDiscountApplied ? ' <span style="color: #059669; font-weight: 600;">(20% volume discount — 8+ hrs/month)</span>' : ''}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Payment method:</td><td style="padding: 8px 0; color: #111827;">${paymentMethod === 'ACH' ? 'ACH Auto-Debit' : 'Card (3% fee)'}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Expected attendees:</td><td style="padding: 8px 0; color: #111827;">${booking.expected_attendees || 'n/a'}</td></tr>
            </table>
          </div>

          ${slots.length ? `
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0369a1; margin: 0 0 10px 0;">Recurring Slots</h3>
            <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; line-height: 1.8;">
              ${slots.map(s => `<li>${describeSlot(s)}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${details?.needsMat ? `
          <div style="background: #eef2ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #3730a3; font-size: 14px;">
              <strong>Full-floor mat:</strong> Included (partner — no charge). The renter handles their own mat setup &amp; breakdown, within their reserved time.
            </p>
          </div>
          ` : ''}

          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0 0 15px 0;">Renter Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600; width: 40%;">Name:</td><td style="padding: 8px 0; color: #111827;">${booking.contact_name}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Email:</td><td style="padding: 8px 0; color: #111827;"><a href="mailto:${booking.email}" style="color: #059669; text-decoration: none;">${booking.email}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Phone:</td><td style="padding: 8px 0; color: #111827;">${booking.phone || 'Not provided'}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Address:</td><td style="padding: 8px 0; color: #111827;">${booking.home_address || 'Not provided'}</td></tr>
              ${booking.business_name ? `<tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Business:</td><td style="padding: 8px 0; color: #111827;">${booking.business_name}</td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">ID Photo:</td><td style="padding: 8px 0; color: #111827;">${booking.id_photo_data ? `Attached (<code>${booking.id_photo_name || 'id-photo'}</code>)` : '<span style="color: #b91c1c;">Not provided — contact renter</span>'}</td></tr>
              <tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">Alcohol:</td><td style="padding: 8px 0; color: #111827;">${booking.serving_alcohol === true ? '<strong style="color: #b45309;">Yes — alcohol present</strong>' : booking.serving_alcohol === false ? 'No' : 'Not specified'}</td></tr>
              ${booking.serving_alcohol === true ? `<tr><td style="padding: 8px 0; color: #374151; font-weight: 600;">COI:</td><td style="padding: 8px 0; color: #111827;">${booking.coi_document_data ? `Attached (<code>${booking.coi_document_name || 'coi'}</code>)` : '<span style="color: #b91c1c;">Not provided — contact renter before the event</span>'}</td></tr>` : ''}
            </table>
          </div>

          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0369a1; margin: 0 0 10px 0;">Stripe References</h3>
            <p style="margin: 5px 0; color: #0c4a6e;"><strong>Booking ID:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.id}</code></p>
            <p style="margin: 5px 0; color: #0c4a6e;"><strong>Subscription:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.stripe_subscription_id || 'pending'}</code></p>
            <p style="margin: 5px 0; color: #0c4a6e;"><strong>Customer:</strong> <code style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">${booking.stripe_customer_id || 'pending'}</code></p>
          </div>

          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #451a03; font-size: 14px;">
              Monthly totals will vary based on actual occurrences. The next-PR monthly cron job will write invoice items against this subscription.
            </p>
          </div>
        </div>
      `,
    };
  },

  clientOnboarding: (booking) => ({
    subject: `Welcome to Merritt Wellness — Important Info for Your Upcoming Event`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            ${LOGO_HEADER}
            <h1 style="color: #10b981; margin: 0; font-size: 24px;">Welcome to Merritt Wellness</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Important Information for Your Upcoming Event</p>
          </div>

          <!-- Welcome Message -->
          <div style="margin-bottom: 25px;">
            <p style="color: #374151; line-height: 1.6; margin: 0;">
              Hi ${booking.contact_name},
            </p>
            <p style="color: #374151; line-height: 1.6; margin: 15px 0;">
              Thank you so much for booking your event at Merritt Wellness. We truly appreciate your business and are excited to host you in our space.
            </p>
            <p style="color: #374151; line-height: 1.6; margin: 15px 0;">
              Now that your booking is confirmed and payment and agreements are complete, we want to share a few important details to ensure everything runs smoothly leading up to—and during—your event.
            </p>
          </div>

          <!-- Primary Point of Contact -->
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">Primary Point of Contact</h2>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 10px 0;">
              For all event-related questions, including:
            </p>
            <ul style="margin: 10px 0; padding-left: 20px; color: #374151;">
              <li style="margin-bottom: 5px;">Day-of logistics</li>
              <li style="margin-bottom: 5px;">On-site access or facility questions</li>
              <li style="margin-bottom: 5px;">Scheduling details</li>
              <li style="margin-bottom: 5px;">Setup, breakdown, or general event coordination</li>
            </ul>
            <p style="color: #374151; line-height: 1.6; margin: 15px 0 10px 0;">
              <strong>Please direct all communication to:</strong>
            </p>
            <p style="margin: 0 0 6px 0;">
              <a href="mailto:clientservices@merrittwellness.net" style="color: #059669; font-weight: 600; font-size: 16px; text-decoration: none;">clientservices@merrittwellness.net</a>
            </p>
            <p style="margin: 0;">
              <a href="tel:+13033598337" style="color: #059669; font-weight: 600; font-size: 16px; text-decoration: none;">303-359-8337</a>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">
              This inbox and phone line are actively monitored by our on-site team and are the fastest way to get support before and during your event.
            </p>
          </div>

          <!-- Manager Contact -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Manager Contact</h2>
            <p style="color: #451a03; line-height: 1.6; margin: 0 0 10px 0;">
              The <strong>manager@merrittwellness.net</strong> email and <strong><a href="tel:+17203579499" style="color: #92400e; text-decoration: none;">720-357-9499</a></strong> phone line are reserved strictly for:
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

          <!-- Facility Onboarding Playlist -->
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Required: Watch the Onboarding Videos Before Your Event</h2>
            <p style="color: #1e3a8a; line-height: 1.6; margin: 0 0 15px 0; font-weight: 600;">
              You <u>must</u> watch the onboarding video playlist before your event. These videos cover everything you need to know to operate the space safely and leave it ready for the next guest. Please do not wait until the day of — watch them in advance so you arrive prepared.
            </p>
            <ul style="margin: 0 0 15px 0; padding-left: 20px; color: #1e3a8a; line-height: 1.8;">
              <li><strong>How to lock up the building</strong> — the single most important video. Please watch it carefully (see policy section below).</li>
              <li>How to unlock and enter the building</li>
              <li>How to use the projector</li>
              <li>How to use the PA system</li>
              <li>Surround Sound Audio System &amp; Wireless Microphones</li>
              <li>How to operate the heating and air conditioning</li>
            </ul>
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #1e40af;">Watch the Playlist:</strong>
              <a href="https://www.youtube.com/playlist?list=PLkE5cGIi8Zdjl6Sb3aa7UKqFrYWQN3uiu" style="color: #3b82f6; text-decoration: none;">Merritt Wellness Onboarding Videos</a>
            </p>
            <p style="color: #1e3a8a; line-height: 1.6; margin: 15px 0 0 0;">
              <strong>Need your access code?</strong> Please email
              <a href="mailto:clientservices@merrittwellness.net" style="color: #3b82f6; text-decoration: none;">clientservices@merrittwellness.net</a>
              or call <a href="tel:+13033598337" style="color: #3b82f6; text-decoration: none;">303-359-8337</a>
              to receive your personal access code before your event.
            </p>
          </div>

          <!-- Important Policies & Potential Fines -->
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h2 style="color: #991b1b; margin: 0 0 15px 0; font-size: 18px;">Important Policies — Please Read Carefully</h2>
            <p style="color: #7f1d1d; line-height: 1.6; margin: 0 0 15px 0;">
              To keep our space running smoothly for every guest, we ask that you follow these two policies. Failure to do so may result in a fine. <strong>Whether a fine is applied is entirely at Merritt Wellness's discretion</strong> — we reserve the right to issue or waive any fine on a case-by-case basis.
            </p>

            <div style="background: #ffffff; padding: 16px; border-radius: 6px; margin: 12px 0; border: 1px solid #fecaca;">
              <h3 style="color: #991b1b; margin: 0 0 8px 0; font-size: 16px;">1. Respect Your Booked Time — No Early Arrivals or Late Departures</h3>
              <p style="color: #7f1d1d; line-height: 1.6; margin: 0 0 8px 0;">
                You may be <strong>charged or fined</strong> if you use the space for longer than you have booked. <strong>There is no showing up early and no staying late.</strong> Please include any setup and cleanup time in your booked window.
              </p>
              <p style="color: #7f1d1d; line-height: 1.6; margin: 0;">
                We frequently book events back-to-back. Other guests will respect your time, and we ask that you respect theirs.
              </p>
            </div>

            <div style="background: #ffffff; padding: 16px; border-radius: 6px; margin: 12px 0; border: 1px solid #fecaca;">
              <h3 style="color: #991b1b; margin: 0 0 8px 0; font-size: 16px;">2. Lock Up Correctly — Watch the Lock-Up Video</h3>
              <p style="color: #7f1d1d; line-height: 1.6; margin: 0 0 8px 0;">
                Locking up properly is the <strong>most important</strong> thing you'll do at the end of your event. The lock-up video in the onboarding playlist is the most important video we have — please make sure you (and anyone helping you close out) are fully familiar with the lock-up process before your event.
              </p>
              <p style="color: #7f1d1d; line-height: 1.6; margin: 0;">
                If the building is not locked up correctly, you may be fined <strong>up to an additional $50</strong>.
              </p>
            </div>

            <p style="color: #7f1d1d; line-height: 1.6; margin: 12px 0 0 0; font-size: 14px;">
              Again, any fines are <strong>completely at Merritt Wellness's discretion</strong>. We'd much rather never have to issue one — watching the videos in advance is the easiest way to make sure that's the case.
            </p>
          </div>

          <!-- Wi-Fi Info -->
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
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
              If anything comes up as you prepare, don't hesitate to reach out to
              <a href="mailto:clientservices@merrittwellness.net" style="color: #059669; text-decoration: none;">clientservices@merrittwellness.net</a>
              or call <a href="tel:+13033598337" style="color: #059669; text-decoration: none;">303-359-8337</a>
              — we're happy to help.
            </p>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">
              Thank you again for choosing Merritt Wellness. We're grateful to be part of your event and look forward to hosting you.
            </p>
          </div>

          <!-- Signature -->
          <div style="margin-top: 25px;">
            <p style="color: #374151; margin: 0 0 5px 0;">Warm regards,</p>
            <p style="color: #111827; font-weight: 600; margin: 0 0 10px 0;">Merritt Wellness Team</p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <a href="https://MerrittWellness.net" style="color: #059669; text-decoration: none;">MerrittWellness.net</a><br>
              <a href="mailto:clientservices@merrittwellness.net" style="color: #059669; text-decoration: none;">clientservices@merrittwellness.net</a><br>
              <a href="tel:+13033598337" style="color: #059669; text-decoration: none;">303-359-8337</a>
            </p>
          </div>
        </div>
      </div>
    `
  }),

  // Sent to the renter when they book a PUBLIC event. Walks them through the
  // collaborative marketing we offer (bulletin-board flyer, website "Upcoming
  // Events" feature, social media) and requests the materials we need from them
  // to execute each channel. Includes the logo in the header.
  publicEventMarketing: (booking) => ({
    subject: `Let's promote ${booking.event_name} together — materials we need from you`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 30px;">
            ${LOGO_HEADER}
            <h1 style="color: #10b981; margin: 0; font-size: 24px;">Let's Promote Your Event Together</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Collaborative Marketing for Public Events</p>
          </div>

          <!-- Intro -->
          <div style="margin-bottom: 25px;">
            <p style="color: #374151; line-height: 1.6; margin: 0;">
              Hi ${booking.contact_name},
            </p>
            <p style="color: #374151; line-height: 1.6; margin: 15px 0;">
              Thank you for booking <strong>${booking.event_name}</strong> as a <strong>public event</strong> at Merritt Wellness. Because it's open to the community, we'd love to help you spread the word — at no extra cost — as part of a collaborative marketing effort. Here's exactly what we offer and the materials we'll need from you to make it happen.
            </p>
          </div>

          <!-- What We Offer -->
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">What We Offer</h2>
            <ul style="margin: 0; padding-left: 20px; color: #065f46; line-height: 1.8;">
              <li><strong>A printed flyer</strong> hung on the community bulletin board in our wellness space.</li>
              <li><strong>A feature on the "Upcoming Events" tab</strong> of our website.</li>
              <li><strong>Social media support</strong> — we're happy to help advertise your event across our channels.</li>
            </ul>
          </div>

          <!-- What We Need -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h2 style="color: #92400e; margin: 0 0 8px 0; font-size: 18px;">What We Need From You</h2>
            <p style="color: #451a03; line-height: 1.6; margin: 0 0 16px 0;">
              To execute the three methods above, please reply to this email with the following:
            </p>

            <!-- For the bulletin board -->
            <div style="background: #ffffff; padding: 16px; border-radius: 6px; margin: 12px 0; border: 1px solid #fde68a;">
              <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 16px;">1. For the Bulletin-Board Flyer</h3>
              <p style="color: #451a03; line-height: 1.6; margin: 0;">
                A <strong>print-ready PDF</strong> of your flyer that we can print and hang in our wellness space.
              </p>
            </div>

            <!-- For the website -->
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
                  <li><strong>Aspect ratio: 16:10</strong> — most important. Off-ratio images get cropped.</li>
                  <li><strong>Dimensions:</strong> 1600×1000px (or 1920×1200 for retina). A bigger source is fine — the site downscales.</li>
                  <li><strong>Format:</strong> JPG or PNG are both fine — the site auto-converts to WebP/AVIF.</li>
                  <li><strong>Keep the subject centered</strong> — we center-crop, and edges may trim on narrow screens.</li>
                </ul>
              </div>
            </div>

            <!-- For social media -->
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
              The sooner we receive these, the more runway we have to promote your event. Just reply to this email with your materials, or reach out to
              <a href="mailto:manager@merrittwellness.net" style="color: #059669; text-decoration: none;">manager@merrittwellness.net</a>
              with any questions — we're excited to help make your event a success.
            </p>
          </div>

          <!-- Signature -->
          <div style="margin-top: 25px;">
            <p style="color: #374151; margin: 0 0 5px 0;">Warm regards,</p>
            <p style="color: #111827; font-weight: 600; margin: 0 0 10px 0;">Merritt Wellness Team</p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <a href="https://MerrittWellness.net" style="color: #059669; text-decoration: none;">MerrittWellness.net</a><br>
              <a href="mailto:manager@merrittwellness.net" style="color: #059669; text-decoration: none;">manager@merrittwellness.net</a><br>
              <a href="tel:+17203579499" style="color: #059669; text-decoration: none;">720-357-9499</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Booking ID: <strong>${booking.id}</strong><br>
              Historic Merritt Wellness — Where Sacred Architecture Meets Modern Wellness
            </p>
          </div>
        </div>
      </div>
    `
  }),

  // Sent to the renter immediately after the monthly invoicer writes the
  // upcoming-month invoice item. Tells them what will be billed, when it
  // will be charged, and against which payment method.
  monthlyBillingClient: ({ booking, year, month, occurrences, totalHours, amount, hourlyRate, saturdayHourlyRate, hasSaturday, chargeDate, paymentMethod, summaryText }) => {
    const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const chargeLabel = formatBillingDate(chargeDate);
    const paymentLabel = paymentMethod === 'ach'
      ? 'ACH Auto-Debit (bank transfer, no processing fee)'
      : 'Card on file (3% processing fee)';

    const rowsHtml = occurrences.map((occ) => {
      const dow = new Date(Date.UTC(
        Number(occ.date.slice(0, 4)),
        Number(occ.date.slice(5, 7)) - 1,
        Number(occ.date.slice(8, 10))
      )).getUTCDay();
      const dayName = DAY_LABELS[dow] || '';
      const pretty = new Date(occ.date + 'T00:00:00Z').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'
      });
      return `<tr>
        <td style="padding: 6px 12px 6px 0; color: #111827;">${pretty}</td>
        <td style="padding: 6px 0; color: #374151; text-align: right;">${occ.hours} hrs</td>
      </tr>`;
    }).join('');

    return {
      subject: `Your ${monthLabel} invoice — ${booking.event_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              ${LOGO_HEADER}
              <h1 style="color: #059669; margin: 0; font-size: 24px;">${monthLabel} Invoice Ready</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0;">Merritt Wellness Historic Sanctuary</p>
            </div>

            <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">Hi ${booking.contact_name},</p>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
              Here is your upcoming ${monthLabel} invoice for <strong>${booking.event_name}</strong>. The charge below will appear on your ${paymentMethod === 'ach' ? 'bank' : 'card'} statement shortly after the billing date.
            </p>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">Invoice Summary</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600; width: 55%;">Billing period:</td>
                  <td style="padding: 6px 0; color: #111827;">${monthLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Total hours:</td>
                  <td style="padding: 6px 0; color: #111827;">${totalHours} hrs</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Hourly rate:</td>
                  <td style="padding: 6px 0; color: #111827;">$${Number(hourlyRate).toFixed(0)}/hr${hasSaturday ? ` &middot; $${Number(saturdayHourlyRate).toFixed(0)}/hr Saturdays` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Amount due:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 600;">$${Number(amount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Payment method:</td>
                  <td style="padding: 6px 0; color: #111827;">${paymentLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #374151; font-weight: 600;">Charge date:</td>
                  <td style="padding: 6px 0; color: #111827;">${chargeLabel}</td>
                </tr>
              </table>
            </div>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">Scheduled Dates</h3>
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">${summaryText || ''}</p>
              <table style="width: 100%; border-collapse: collapse;">
                ${rowsHtml || '<tr><td style="padding: 6px 0; color: #6b7280;">No scheduled dates in this month.</td></tr>'}
              </table>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #451a03; line-height: 1.6; font-size: 14px;">
                Need to adjust your schedule, add a date, or cancel? Reply to this email or reach us at clientservices@merrittwellness.net. Changes made before the charge date can be applied to this invoice.
              </p>
            </div>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0;">Questions? Reach out any time:</p>
              <p style="color: #374151; margin: 5px 0;">(303) 359-8337</p>
              <p style="color: #374151; margin: 5px 0;">clientservices@merrittwellness.net</p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Booking ID: <strong>${booking.id}</strong><br>
                Historic Merritt Wellness — Where Sacred Architecture Meets Modern Wellness
              </p>
            </div>
          </div>
        </div>
      `,
    };
  },

  // End-of-run roll-up for the ops team. One table row per booking the cron
  // touched, separated into Succeeded / Skipped / Failed sections so failures
  // are impossible to miss.
  monthlyBillingRollup: ({ year, month, results, durationMs, dryRun }) => {
    const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    const money = (n) => `$${Number(n || 0).toFixed(2)}`;

    const renderRow = (r) => `<tr>
      <td style="padding: 8px 12px 8px 0; color: #111827; border-bottom: 1px solid #e5e7eb;">${r.contactName || ''}<br><span style="color: #6b7280; font-size: 12px;">${r.eventName || ''}</span></td>
      <td style="padding: 8px 12px 8px 0; color: #374151; border-bottom: 1px solid #e5e7eb;">${r.occurrenceCount != null ? r.occurrenceCount : '—'}</td>
      <td style="padding: 8px 12px 8px 0; color: #374151; border-bottom: 1px solid #e5e7eb;">${r.totalHours != null ? `${r.totalHours} hrs` : '—'}</td>
      <td style="padding: 8px 12px 8px 0; color: #111827; border-bottom: 1px solid #e5e7eb;">${r.amount != null ? money(r.amount) : '—'}</td>
      <td style="padding: 8px 0; color: #6b7280; font-size: 12px; border-bottom: 1px solid #e5e7eb;">${r.note || ''}</td>
    </tr>`;

    const tableHead = `<thead><tr>
      <th style="text-align: left; padding: 8px 12px 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Client / Series</th>
      <th style="text-align: left; padding: 8px 12px 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Occurrences</th>
      <th style="text-align: left; padding: 8px 12px 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Hours</th>
      <th style="text-align: left; padding: 8px 12px 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Amount</th>
      <th style="text-align: left; padding: 8px 0; color: #374151; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #d1d5db;">Note</th>
    </tr></thead>`;

    const succeededTotal = results.succeeded.reduce((s, r) => s + Number(r.amount || 0), 0);

    const section = (title, rows, color) => {
      if (!rows || rows.length === 0) return '';
      return `<div style="margin: 20px 0;">
        <h2 style="color: ${color}; margin: 0 0 10px 0; font-size: 18px;">${title} (${rows.length})</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${tableHead}
          <tbody>${rows.map(renderRow).join('')}</tbody>
        </table>
      </div>`;
    };

    const headerBanner = dryRun
      ? `<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
           <strong style="color: #92400e;">DRY RUN</strong>
           <span style="color: #451a03;"> — No Stripe invoice items were created and no client emails were sent.</span>
         </div>`
      : '';

    return {
      subject: `Monthly recurring billing — ${monthLabel}${dryRun ? ' (dry run)' : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            ${LOGO_HEADER}
            <h1 style="color: #111827; margin: 0 0 5px 0; font-size: 22px;">Monthly Recurring Billing Roll-Up</h1>
            <p style="color: #6b7280; margin: 0 0 20px 0;">Billing period: <strong>${monthLabel}</strong></p>

            ${headerBanner}

            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 16px 4px 0; color: #374151; font-weight: 600;">Succeeded:</td>
                  <td style="padding: 4px 0; color: #059669; font-weight: 600;">${results.succeeded.length}</td>
                  <td style="padding: 4px 16px 4px 24px; color: #374151; font-weight: 600;">Skipped:</td>
                  <td style="padding: 4px 0; color: #d97706; font-weight: 600;">${results.skipped.length}</td>
                  <td style="padding: 4px 16px 4px 24px; color: #374151; font-weight: 600;">Failed:</td>
                  <td style="padding: 4px 0; color: #b91c1c; font-weight: 600;">${results.failed.length}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 16px 4px 0; color: #374151; font-weight: 600;">Total billed:</td>
                  <td style="padding: 4px 0; color: #111827; font-weight: 600;" colspan="5">${money(succeededTotal)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 16px 4px 0; color: #374151; font-weight: 600;">Duration:</td>
                  <td style="padding: 4px 0; color: #111827;" colspan="5">${durationMs} ms</td>
                </tr>
              </table>
            </div>

            ${section('Succeeded', results.succeeded, '#059669')}
            ${section('Skipped (idempotent — already billed this month)', results.skipped, '#d97706')}
            ${section('Failed', results.failed, '#b91c1c')}

            ${results.failed.length > 0 ? `
            <div style="background: #fee2e2; padding: 16px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">Failure Details</h3>
              ${results.failed.map(r => `<p style="margin: 6px 0; color: #7f1d1d; font-size: 13px;"><strong>${r.eventName || r.bookingId}:</strong> ${r.error || 'Unknown error'}</p>`).join('')}
            </div>
            ` : ''}

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Generated by the monthly-recurring-billing cron. A full row is stored in <code>cron_runs</code> for audit.
              </p>
            </div>
          </div>
        </div>
      `,
    };
  }
};

// Delay helper to avoid Resend free-plan rate limits (2 requests/second)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Spacing between consecutive sends. Resend's 2 req/sec cap needs ≥500ms, but
// oversized sleeps burn the serverless function's maxDuration budget and are
// how trailing emails historically got killed by the platform timeout before
// they were ever sent. 600ms clears the rate limit with margin while keeping
// the whole pipeline fast; sendEmailWithRetry backstops any transient 429.
const EMAIL_SEND_SPACING_MS = 600;

// The Resend SDK does NOT throw when the API rejects a send — it resolves to
// `{ data: null, error: {...} }`. Only transport-level failures throw. That
// means a rate-limit rejection (HTTP 429, `name: 'rate_limit_exceeded'`) comes
// back in `error`, and if the caller only looks at `result.data` it logs a
// phantom success while the email is silently dropped. This is exactly how a
// booking confirmation / manager notification can go missing.
//
// `sendEmailWithRetry` centralizes the correct behavior for every send:
//   1. Inspect `result.error` (not just `result.data`).
//   2. Retry rate-limit errors with exponential backoff so a transient 429
//      (the free plan caps at 2 req/sec) clears instead of dropping the email.
//   3. Throw on any unrecoverable error so the caller logs + records it
//      instead of reporting a false success.
//   4. Pass an Idempotency-Key on every send so a retry of a request whose
//      email WAS actually accepted (delivered-but-response-lost) can never
//      deliver a duplicate — Resend replays the original response instead.
//      This is what stopped the "client received the onboarding email 4
//      times" incident: without a key, every retry (and every Stripe webhook
//      redelivery) is a brand-new email to Resend.
const RESEND_MAX_ATTEMPTS = 4;

function isRateLimitError(error) {
  if (!error) return false;
  const code = error.statusCode || error.status || error.code;
  const name = String(error.name || '').toLowerCase();
  const message = String(error.message || '').toLowerCase();
  return code === 429
    || code === '429'
    || name.includes('rate_limit')
    || name.includes('too_many')
    || message.includes('rate limit')
    || message.includes('too many requests');
}

// The Resend SDK never throws for network problems — fetch failures and
// unparseable 5xx responses come back as `{ error: { name:
// 'application_error', ... } }`. These are exactly the cases where the email
// may have been accepted even though we never saw the response, so they are
// only safe to retry when the send carries an idempotency key.
function isTransientTransportError(error) {
  if (!error) return false;
  if (String(error.name || '').toLowerCase() !== 'application_error') return false;
  const message = String(error.message || '').toLowerCase();
  return message.includes('unable to fetch data')
    || message.includes('internal server error');
}

async function sendEmailWithRetry(payload, { label = 'email', idempotencyKey = null } = {}) {
  let lastError = null;
  const sendOptions = idempotencyKey ? { idempotencyKey } : {};

  for (let attempt = 1; attempt <= RESEND_MAX_ATTEMPTS; attempt++) {
    let result;
    try {
      result = await getResend().emails.send(payload, sendOptions);
    } catch (transportError) {
      // Defensive: the current SDK reports transport failures via
      // `result.error`, but keep this path in case a future version throws.
      // Without an idempotency key a blind retry could double-send (the email
      // may have been accepted before the response was lost), so only retry
      // when the key makes the retry safe.
      lastError = transportError;
      if (idempotencyKey && attempt < RESEND_MAX_ATTEMPTS) {
        const backoff = 1000 * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [RESEND] ${label} transport error (attempt ${attempt}/${RESEND_MAX_ATTEMPTS}) — retrying in ${backoff}ms: ${transportError.message}`);
        await delay(backoff);
        continue;
      }
      break;
    }

    const error = result?.error;
    if (!error) {
      return result;
    }

    lastError = error;
    if (isRateLimitError(error) && attempt < RESEND_MAX_ATTEMPTS) {
      // Exponential backoff: 1s, 2s, 4s. A short wait clears the per-second
      // window so the resend succeeds rather than dropping the email.
      const backoff = 1000 * Math.pow(2, attempt - 1);
      console.warn(`⚠️ [RESEND] ${label} rate-limited (attempt ${attempt}/${RESEND_MAX_ATTEMPTS}) — retrying in ${backoff}ms`);
      await delay(backoff);
      continue;
    }

    // Fetch/5xx failures: the email may or may not have been accepted. With an
    // idempotency key the retry is safe (Resend dedupes); without one, give up
    // rather than risk a duplicate.
    if (idempotencyKey && isTransientTransportError(error) && attempt < RESEND_MAX_ATTEMPTS) {
      const backoff = 1000 * Math.pow(2, attempt - 1);
      console.warn(`⚠️ [RESEND] ${label} transport error (attempt ${attempt}/${RESEND_MAX_ATTEMPTS}) — retrying in ${backoff}ms: ${error.message}`);
      await delay(backoff);
      continue;
    }

    // Non-retryable API error (bad request, invalid recipient, etc.).
    break;
  }

  throw new Error(`Resend send failed for ${label}: ${lastError?.message || 'Unknown error'}`);
}

// Stable Idempotency-Key for a booking email. Keys are stored by Resend for
// 24h: any repeat of the same key within that window (wrapper retry, Stripe
// webhook redelivery, the group loop re-attempting a once-per-group email on
// a later booking) replays the original response instead of sending again.
//
// Scope choices matter:
//   - per-booking emails (confirmation, manager notification) key on the
//     booking id — each event date legitimately gets its own email.
//   - once-per-GROUP emails (onboarding, public marketing) key on the
//     master_booking_id so a re-attempt from a DIFFERENT booking in the same
//     group still dedupes. This is what previously produced N onboarding
//     emails for an N-date booking: each retried webhook invocation reset the
//     in-memory "already sent" flag and re-sent it with the next booking.
function emailIdempotencyKey(kind, booking) {
  return `${kind}/${booking.id}`;
}

function groupEmailIdempotencyKey(kind, booking) {
  return `${kind}/${booking.master_booking_id || booking.id}`;
}

// Read the two ops addresses from env at call time (not at module load) so
// the sender behaves correctly under env-var changes in hot-reloaded dev
// environments. Returns { manager, clientServices, addrs } where `addrs` is
// a filtered array suitable for Resend's `to` or `bcc`.
function getOpsEmails() {
  const manager = (process.env.OPS_EMAIL_MANAGER || '').trim() || null;
  const clientServices = (process.env.OPS_EMAIL_CLIENT_SERVICES || '').trim() || null;
  const addrs = [manager, clientServices].filter(Boolean);
  return { manager, clientServices, addrs };
}

// Recipients for staff-facing notifications (new booking, recurring setup).
// These MUST reach the whole ops team — the manager AND client services — not a
// single hardcoded address. Prefer the configured ops distribution list; fall
// back to the known staff addresses if neither env var is set so staff are
// never silently dropped from a booking notification. De-duplicated so a single
// shared address (or an env value equal to the fallback) doesn't double-send.
function getStaffRecipients() {
  const ops = getOpsEmails();
  const recipients = ops.addrs.length > 0 ? ops.addrs : STAFF_FALLBACK_EMAILS;
  if (ops.addrs.length === 0) {
    console.warn('⚠️ OPS_EMAIL_MANAGER and OPS_EMAIL_CLIENT_SERVICES both missing — using built-in staff fallback list for notification recipients');
  } else if (ops.addrs.length === 1) {
    console.warn(`⚠️ Only one ops email configured (${ops.addrs[0]}) — staff notification will reach a single recipient`);
  }
  return [...new Set(recipients.map((a) => a.trim()).filter(Boolean))];
}

// Extract the raw base64 payload from a "data:<mime>;base64,<content>" URL.
// Returns null if the input isn't a valid data URL so the email still sends.
function extractBase64FromDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const commaIndex = dataUrl.indexOf('base64,');
  if (commaIndex === -1) return null;
  return dataUrl.slice(commaIndex + 'base64,'.length);
}

// Build a Resend attachment object from the ID photo columns on a booking row,
// or null if no photo is present. Resend accepts a `content` base64 string.
function buildIdPhotoAttachment(booking) {
  const base64 = extractBase64FromDataUrl(booking?.id_photo_data);
  if (!base64) return null;

  // Derive a filename with the correct extension when the stored name lacks one.
  const mime = booking.id_photo_type || 'image/jpeg';
  const ext = mime.split('/')[1]?.split('+')[0] || 'jpg';
  const rawName = (booking.id_photo_name || `id-photo-${booking.id}`).trim();
  const filename = /\.[a-z0-9]+$/i.test(rawName) ? rawName : `${rawName}.${ext}`;

  return {
    filename,
    content: base64,
    contentType: mime
  };
}

// Build a Resend attachment object from the COI columns on a booking row, or
// null if no COI is present. The COI may be a PDF or an image.
function buildCoiAttachment(booking) {
  const base64 = extractBase64FromDataUrl(booking?.coi_document_data);
  if (!base64) return null;

  const mime = booking.coi_document_type || 'application/pdf';
  const ext = mime === 'application/pdf' ? 'pdf' : (mime.split('/')[1]?.split('+')[0] || 'pdf');
  const rawName = (booking.coi_document_name || `coi-${booking.id}`).trim();
  const filename = /\.[a-z0-9]+$/i.test(rawName) ? rawName : `${rawName}.${ext}`;

  return {
    filename,
    content: base64,
    contentType: mime
  };
}

// Collect every document attachment (ID photo + COI when present) for the
// manager-facing emails.
function buildManagerAttachments(booking) {
  return [buildIdPhotoAttachment(booking), buildCoiAttachment(booking)].filter(Boolean);
}

// Email sending functions
export async function sendBookingConfirmation(booking, { group } = {}) {
  try {
    console.log('📧 Sending booking confirmation to:', booking.email);

    const groupContext = buildGroupContext(booking, group);
    const template = EMAIL_TEMPLATES.bookingConfirmation(booking, groupContext);
    
    const result = await sendEmailWithRetry({
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo: EMAIL_CONFIG.replyTo,
      ...template
    }, {
      label: `booking confirmation ${booking.id}`,
      idempotencyKey: emailIdempotencyKey('booking-confirmation', booking),
    });

    console.log('✅ Booking confirmation sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send booking confirmation:', error);
    throw new Error(`Email confirmation failed: ${error.message}`);
  }
}

export async function sendManagerNotification(booking, { group } = {}) {
  try {
    const recipients = getStaffRecipients();
    console.log('📧 Sending manager notification to:', recipients.join(', '));

    const groupContext = buildGroupContext(booking, group);
    const template = EMAIL_TEMPLATES.managerNotification(booking, groupContext);
    const attachments = buildManagerAttachments(booking);

    const payload = {
      from: EMAIL_CONFIG.from,
      to: recipients,
      replyTo: booking.email,
      ...template
    };

    if (attachments.length > 0) {
      payload.attachments = attachments;
      console.log('📎 Attaching renter documents:', attachments.map(a => a.filename).join(', '));
    }
    if (!buildIdPhotoAttachment(booking)) {
      console.warn('⚠️ No ID photo found on booking', booking.id, '- manager email will flag it as missing.');
    }
    if (booking.serving_alcohol === true && !buildCoiAttachment(booking)) {
      console.warn('⚠️ Alcohol present but no COI found on booking', booking.id, '- manager email will flag it as missing.');
    }

    const result = await sendEmailWithRetry(payload, {
      label: `manager notification ${booking.id}`,
      idempotencyKey: emailIdempotencyKey('manager-notification', booking),
    });

    console.log('✅ Manager notification sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send manager notification:', error);
    throw new Error(`Manager notification failed: ${error.message}`);
  }
}

export async function sendClientOnboarding(booking) {
  try {
    console.log('📧 Sending client onboarding email to:', booking.email);

    const template = EMAIL_TEMPLATES.clientOnboarding(booking);

    // Keyed on the GROUP, not the booking: the renter gets onboarding once no
    // matter which booking in a multi-date group carries the send — including
    // across retried webhook invocations.
    const result = await sendEmailWithRetry({
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo: EMAIL_CONFIG.clientServicesEmail,
      ...template
    }, {
      label: `client onboarding ${booking.id}`,
      idempotencyKey: groupEmailIdempotencyKey('client-onboarding', booking),
    });

    console.log('✅ Client onboarding email sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send client onboarding email:', error);
    throw new Error(`Client onboarding email failed: ${error.message}`);
  }
}

// Sent to the renter when their booking is marked as a PUBLIC event. Explains
// the collaborative marketing we offer and requests the materials we need
// (flyer PDF, website event details + image, social handles/ticket link).
export async function sendPublicEventMarketing(booking) {
  try {
    console.log('📧 Sending public-event marketing email to:', booking.email);

    const template = EMAIL_TEMPLATES.publicEventMarketing(booking);

    // Public events are handled by the manager, so renter replies (and their
    // marketing materials) should land in the manager's inbox rather than
    // client services. Fall back to client services if no manager is configured.
    // No staff BCC — staff only receive the booking notification email.
    const ops = getOpsEmails();
    const replyTo = ops.manager || EMAIL_CONFIG.clientServicesEmail;

    const payload = {
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo,
      ...template
    };

    // Group-scoped key: the marketing email is once-per-group, same as
    // onboarding.
    const result = await sendEmailWithRetry(payload, {
      label: `public-event marketing ${booking.id}`,
      idempotencyKey: groupEmailIdempotencyKey('public-event-marketing', booking),
    });

    console.log('✅ Public-event marketing email sent successfully:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send public-event marketing email:', error);
    throw new Error(`Public-event marketing email failed: ${error.message}`);
  }
}

export async function sendRecurringSetupClient(booking) {
  try {
    console.log('📧 Sending recurring setup confirmation to:', booking.email);
    const template = EMAIL_TEMPLATES.recurringSetupClient(booking);

    // No staff BCC — staff get their own recurring-setup notification and
    // should receive nothing else.
    const payload = {
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo: EMAIL_CONFIG.clientServicesEmail,
      ...template
    };

    const result = await sendEmailWithRetry(payload, {
      label: `recurring setup client ${booking.id}`,
      // Guards the race between the client-driven finalize route and the
      // setup_intent.succeeded webhook safety net both sending this email.
      idempotencyKey: emailIdempotencyKey('recurring-setup-client', booking),
    });
    console.log('✅ Recurring setup client email sent:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send recurring setup client email:', error);
    throw new Error(`Recurring setup client email failed: ${error.message}`);
  }
}

export async function sendRecurringSetupManager(booking) {
  try {
    console.log('📧 Sending recurring setup manager notification');
    const template = EMAIL_TEMPLATES.recurringSetupManager(booking);
    const attachments = buildManagerAttachments(booking);
    const recipients = getStaffRecipients();
    console.log('📧 Sending recurring setup manager notification to:', recipients.join(', '));
    const payload = {
      from: EMAIL_CONFIG.from,
      to: recipients,
      replyTo: booking.email,
      ...template
    };
    if (attachments.length > 0) {
      payload.attachments = attachments;
    }
    const result = await sendEmailWithRetry(payload, {
      label: `recurring setup manager ${booking.id}`,
      idempotencyKey: emailIdempotencyKey('recurring-setup-manager', booking),
    });
    console.log('✅ Recurring setup manager email sent:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send recurring setup manager email:', error);
    throw new Error(`Recurring setup manager email failed: ${error.message}`);
  }
}

// Client-facing emails first, staff notification LAST — if the function is
// ever cut short (platform timeout, crash) the paying client loses nothing.
// Recurring renters need the same onboarding email as one-time renters: the
// facility walkthrough, lock-up procedure, and Wi-Fi apply to them just as
// much, and their series is set up exactly once so it can't double-send.
export async function sendRecurringSetupEmails(booking) {
  const results = {
    clientEmail: null,
    onboardingEmail: null,
    publicMarketingEmail: null,
    managerEmail: null,
    errors: [],
  };
  try {
    results.clientEmail = await sendRecurringSetupClient(booking);
  } catch (error) {
    results.errors.push(`Client email failed: ${error.message}`);
  }
  await delay(EMAIL_SEND_SPACING_MS);

  try {
    results.onboardingEmail = await sendClientOnboarding(booking);
  } catch (error) {
    results.errors.push(`Client onboarding email failed: ${error.message}`);
  }
  await delay(EMAIL_SEND_SPACING_MS);

  // Public series get the collaborative-marketing email, sent once here as part
  // of the one-time setup so the renter receives it exactly once.
  if (isPublicBooking(booking)) {
    try {
      results.publicMarketingEmail = await sendPublicEventMarketing(booking);
    } catch (error) {
      results.errors.push(`Public-event marketing email failed: ${error.message}`);
    }
    await delay(EMAIL_SEND_SPACING_MS);
  }

  try {
    results.managerEmail = await sendRecurringSetupManager(booking);
  } catch (error) {
    results.errors.push(`Manager email failed: ${error.message}`);
  }

  if (!results.clientEmail && !results.managerEmail) {
    throw new Error(results.errors.join(', ') || 'Both recurring setup emails failed');
  }
  return results;
}

// Sent to the renter immediately after the monthly cron creates an invoice
// item for their upcoming month. Args match the cron's per-booking result
// shape so the route just forwards its plan object.
export async function sendMonthlyBillingClientEmail(args) {
  const { booking } = args;
  try {
    console.log('📧 Sending monthly billing client email to:', booking.email);
    const template = EMAIL_TEMPLATES.monthlyBillingClient(args);

    // Silently copy ops on every client-facing monthly billing email so
    // staff see the exact invoice the client received.
    const ops = getOpsEmails();
    if (ops.addrs.length === 0) {
      console.warn('⚠️ OPS_EMAIL_MANAGER and OPS_EMAIL_CLIENT_SERVICES both missing — sending client billing email without BCC');
    } else if (ops.addrs.length === 1) {
      console.warn(`⚠️ Only one ops email configured — BCCing ${ops.addrs[0]} only on client billing email`);
    }

    const payload = {
      from: EMAIL_CONFIG.from,
      to: [booking.email],
      replyTo: EMAIL_CONFIG.clientServicesEmail,
      ...template
    };
    if (ops.addrs.length > 0) payload.bcc = ops.addrs;

    const result = await sendEmailWithRetry(payload, {
      label: `monthly billing client ${booking.id}`,
      // Month-scoped: the same booking legitimately gets one of these per
      // billing cycle, but never two for the same cycle.
      idempotencyKey: `monthly-billing-client/${booking.id}/${args?.year || ''}-${args?.month || ''}`,
    });
    console.log('✅ Monthly billing client email sent:', result.data?.id);
    return result;
  } catch (error) {
    console.error('❌ Failed to send monthly billing client email:', error);
    throw new Error(`Monthly billing client email failed: ${error.message}`);
  }
}

// Sent to ops once at the end of each monthly-billing cron run. Bundles the
// whole run into a single email (table with succeeded / skipped / failed).
// Recipients come from the two ops env vars. Both addresses are passed in a
// single Resend `to: [...]` so it arrives as one thread in both inboxes.
export async function sendMonthlyBillingRollupEmail(args) {
  try {
    const ops = getOpsEmails();
    if (ops.addrs.length === 0) {
      console.error('❌ OPS_EMAIL_MANAGER and OPS_EMAIL_CLIENT_SERVICES both missing — skipping monthly billing rollup send');
      return { skipped: true, reason: 'Both ops email env vars missing' };
    }
    if (ops.addrs.length === 1) {
      console.warn(`⚠️ Only one ops email configured — sending rollup to ${ops.addrs[0]} only`);
    }

    console.log('📧 Sending monthly billing rollup to:', ops.addrs.join(', '));
    const template = EMAIL_TEMPLATES.monthlyBillingRollup(args);
    const result = await sendEmailWithRetry({
      from: EMAIL_CONFIG.from,
      to: ops.addrs,
      ...template
    }, {
      label: `monthly billing rollup ${args?.year || ''}-${args?.month || ''}`,
      idempotencyKey: `monthly-billing-rollup/${args?.year || ''}-${args?.month || ''}`,
    });
    console.log('✅ Monthly billing rollup sent:', result.data?.id);
    return result;
  } catch (error) {
    // The rollup email is informational — don't let a send failure fail the
    // whole cron run. Log loudly and keep going.
    console.error('❌ Failed to send monthly billing rollup email:', error);
    return { error: error.message };
  }
}

export async function sendConfirmationEmails(booking) {
  const emailResults = {
    customerConfirmation: null,
    managerNotification: null,
    clientOnboarding: null,
    success: false,
    errors: []
  };

  try {
    console.log('📧 Sending confirmation emails for booking:', booking.id);

    // Client-facing emails first, staff notification last — if the function is
    // ever cut short, the paying client loses nothing.
    try {
      emailResults.customerConfirmation = await sendBookingConfirmation(booking);
    } catch (error) {
      emailResults.errors.push(`Customer email failed: ${error.message}`);
    }

    // Space sends to stay under the Resend rate limit (2 requests/second)
    await delay(EMAIL_SEND_SPACING_MS);

    try {
      emailResults.clientOnboarding = await sendClientOnboarding(booking);
    } catch (error) {
      emailResults.errors.push(`Client onboarding email failed: ${error.message}`);
    }

    // Space sends to stay under the Resend rate limit (2 requests/second)
    await delay(EMAIL_SEND_SPACING_MS);

    try {
      emailResults.managerNotification = await sendManagerNotification(booking);
    } catch (error) {
      emailResults.errors.push(`Manager email failed: ${error.message}`);
    }

    if (emailResults.customerConfirmation || emailResults.managerNotification || emailResults.clientOnboarding) {
      emailResults.success = true;
      console.log('✅ Email sending completed with results:', {
        customerSent: !!emailResults.customerConfirmation,
        managerSent: !!emailResults.managerNotification,
        onboardingSent: !!emailResults.clientOnboarding,
        errorCount: emailResults.errors.length
      });
    } else {
      throw new Error('All emails failed to send');
    }

    return emailResults;

  } catch (error) {
    console.error('❌ Email sending process failed:', error);
    emailResults.errors.push(error.message);
    throw new Error(`Email process failed: ${emailResults.errors.join(', ')}`);
  }
}