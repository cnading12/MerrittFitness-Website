/**
 * Merritt Wellness - Automated Post-Event Review Emails
 *
 * Sends a review request the morning after an event ends.
 * - Recurring events: only the first instance triggers an email
 * - Per-event toggle: add [skip-review] to the event title or description
 * - Cooldown: same host email won't get another request for 60 days
 *
 * Parses your booking system's description format:
 *   Event: ...
 *   Organizer: ...
 *   Email: ...
 *   Business: ...
 *
 * SETUP:
 * 1. Create a Google Sheet, add a tab named "ReviewRequests" with headers:
 *    Timestamp | Host Email | Event Title | Event Date | Series ID
 *    Copy the sheet ID into TRACKING_SHEET_ID below.
 * 2. Replace REVIEW_URL with your actual Google review link.
 * 3. Paste this into Apps Script (can be the same project as your briefing script).
 * 4. Run testRun() once to authorize and preview what would be sent.
 * 5. Add a daily time trigger: sendReviewEmails, 8-9am.
 *
 * DELIVERABILITY NOTE (why this email looks the way it does):
 * A previous, heavier HTML design was landing in spam. Mail filters punish
 * image-heavy templates, large background blocks, and HTML with little real
 * text. This version is deliberately lightweight: no embedded or remote
 * images, a single accent color, simple inline styles, and a full plain-text
 * alternative that mirrors the HTML. Keep it that way and it stays in the
 * inbox. If you redesign, preview with previewEmailToSelf() and check that it
 * lands in your Primary tab, not Promotions/Spam, before relying on it.
 */

// ============ CONFIG ============
const TRACKING_SHEET_ID = '1q6IxmIYxGcGpvgTQF37VEj2R0YRr7rKQ5pDmYLWBqxo';
const TRACKING_SHEET_NAME = 'ReviewRequests';
const CALENDAR_ID = 'c_002ae67fc0cd95665a26d4183a61597bd74447d4760b239bd5135518cf978704@group.calendar.google.com';

const REVIEW_URL = 'https://g.page/r/CQit8gnuhxa7EBM/review';
const FROM_NAME = 'Cole at Merritt Wellness';
const REPLY_TO = 'manager@merrittwellness.net';
const MANAGER_EMAIL = 'manager@merrittwellness.net';

const COOLDOWN_DAYS = 60;

// If true, skip ALL recurring events (recurring partners typically have already reviewed).
// If false, send on the first occurrence of a new recurring series (one email per series, ever).
const SKIP_RECURRING_EVENTS = true;

const EXCLUDE_EMAILS = [
  'manager@merrittwellness.net',
  'clientservices@merrittwellness.net',
  'tyler.ryan@c3hdenver.com',
  // add Cole's, Lance's, and any congregation contacts
];

const SUNDAY_SERVICE_KEYWORDS = ['service', 'church', 'worship', 'congregation', 'sunday school'];
const SKIP_TAGS = ['[skip-review]', '[no-review]'];

// ============ MAIN ============

function sendReviewEmails() {
  const cal = (CALENDAR_ID === 'primary')
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);

  const now = new Date();
  const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const events = cal.getEvents(yStart, yEnd);

  const sheet = SpreadsheetApp.openById(TRACKING_SHEET_ID).getSheetByName(TRACKING_SHEET_NAME);
  const log = buildSentLog(sheet);

  let sent = 0;
  let skipped = 0;

  for (const event of events) {
    try {
      const result = processEvent(event, sheet, log);
      if (result === 'sent') sent++;
      else skipped++;
    } catch (e) {
      console.error('Error on "' + event.getTitle() + '": ' + e);
    }
  }

  console.log('Review emails: ' + sent + ' sent, ' + skipped + ' skipped.');
}

function processEvent(event, sheet, log) {
  const title = event.getTitle();
  const desc = event.getDescription() || '';
  const combined = (title + ' ' + desc).toLowerCase();

  // 1. Skip tag check
  for (const tag of SKIP_TAGS) {
    if (combined.includes(tag.toLowerCase())) {
      console.log('Skip (tag): ' + title);
      return 'skipped';
    }
  }

  // 2. Sunday service check
  if (event.getStartTime().getDay() === 0) {
    for (const kw of SUNDAY_SERVICE_KEYWORDS) {
      if (title.toLowerCase().includes(kw)) {
        console.log('Skip (Sunday service): ' + title);
        return 'skipped';
      }
    }
  }

  // 3. Parse booking details and find host email
  const details = parseBookingDetails(event);
  const hostEmail = findHostEmail(event, details);
  if (!hostEmail) {
    console.log('Skip (no host email): ' + title);
    return 'skipped';
  }

  // 4. Recurring series handling
  let seriesId = '';
  if (event.isRecurringEvent()) {
    if (SKIP_RECURRING_EVENTS) {
      console.log('Skip (recurring): ' + title);
      return 'skipped';
    }
    try {
      seriesId = event.getEventSeries().getId();
      if (log.series[seriesId]) {
        console.log('Skip (series already sent): ' + title);
        return 'skipped';
      }
    } catch (e) {
      // treat as one-off if series can't be retrieved
    }
  }

  // 5. Cooldown check
  if (recentlySent(log, hostEmail)) {
    console.log('Skip (cooldown): ' + hostEmail + ' for ' + title);
    return 'skipped';
  }

  // 6. Send and log
  sendReviewEmail(hostEmail, event, details);
  sheet.appendRow([new Date(), hostEmail, title, event.getStartTime(), seriesId]);
  console.log('Sent: ' + hostEmail + ' for ' + title);
  return 'sent';
}

// ============ PARSING ============

function parseBookingDetails(event) {
  const desc = event.getDescription() || '';
  // Convert <br> to newlines, strip remaining HTML tags, then decode entities
  const text = decodeHtmlEntities(
    desc.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  );
  return {
    eventName: extractField(text, 'Event'),
    type: extractField(text, 'Type'),
    organizer: extractField(text, 'Organizer'),
    email: extractField(text, 'Email'),
    phone: extractField(text, 'Phone'),
    business: extractField(text, 'Business')
  };
}

function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(parseInt(n, 10)); })
    .replace(/&#x([0-9a-fA-F]+);/g, function(_, n) { return String.fromCharCode(parseInt(n, 16)); })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function extractField(text, label) {
  const re = new RegExp('^\\s*' + label + '\\s*:\\s*(.+?)\\s*$', 'im');
  const match = text.match(re);
  return match ? match[1].trim() : '';
}

function findHostEmail(event, details) {
  const excludeLower = EXCLUDE_EMAILS.map(e => e.toLowerCase());

  // Strategy 1: parsed "Email:" field from booking description
  if (details && details.email) {
    const m = details.email.match(/[\w.+-]+@[\w.-]+\.\w+/);
    if (m && !excludeLower.includes(m[0].toLowerCase())) return m[0];
  }

  // Strategy 2: first non-excluded guest on the event
  const guest = firstNonExcludedGuest(event);
  if (guest) return guest.getEmail();

  // Strategy 3: any email in description (last resort)
  const desc = event.getDescription() || '';
  const matches = desc.match(/[\w.+-]+@[\w.-]+\.\w+/g) || [];
  for (const m of matches) {
    if (!excludeLower.includes(m.toLowerCase())) return m;
  }

  return null;
}

// ============ NAME / EVENT-NAME RESOLUTION ============
//
// Website bookings carry "Organizer:" and "Event:" in the description, so we
// always have a name. Manually-created or sponsored events made directly in
// Google Calendar usually do not, so we fall back to the host added as a
// guest, then to the event title, before giving up on a generic greeting.

function firstWord(str) {
  if (!str) return '';
  const parts = str.trim().split(/\s+/);
  return parts.length ? parts[0] : '';
}

function firstNonExcludedGuest(event) {
  const excludeLower = EXCLUDE_EMAILS.map(e => e.toLowerCase());
  const guests = event.getGuestList();
  for (const guest of guests) {
    const email = guest.getEmail();
    if (email && !excludeLower.includes(email.toLowerCase())) return guest;
  }
  return null;
}

// Strips lock emoji, staff-attention flags, the "BOOKED:" prefix, and trailing
// status tags like "(sponsored)" so the title reads like a real event name.
function cleanEventTitle(title) {
  return (title || '')
    .replace(/^.*?BOOKED:\s*/is, '')
    .replace(/\s*\((?:sponsored|public|private|recurring)\)\s*$/i, '')
    .trim();
}

function resolveEventName(event, details) {
  if (details && details.eventName) return details.eventName;
  return cleanEventTitle(event.getTitle()) || 'your event';
}

function resolveRecipientName(event, details) {
  // 1. "Organizer:" field from website bookings
  if (details && details.organizer) {
    const n = firstWord(details.organizer);
    if (n) return n;
  }
  // 2. Display name of the first real guest (host added manually as a guest)
  const guest = firstNonExcludedGuest(event);
  if (guest && guest.getName && guest.getName()) {
    const n = firstWord(guest.getName());
    if (n) return n;
  }
  // 3. First word of the cleaned title, if it reads like a personal name
  const t = firstWord(cleanEventTitle(event.getTitle()));
  if (/^[A-Z][a-zA-Z'’\-]+$/.test(t)) return t;
  // 4. Generic, still friendly
  return 'there';
}

// ============ TRACKING ============

function buildSentLog(sheet) {
  const data = sheet.getDataRange().getValues();
  const log = { byEmail: {}, series: {} };
  for (let i = 1; i < data.length; i++) {
    const ts = data[i][0] ? new Date(data[i][0]) : null;
    const email = (data[i][1] || '').toString().toLowerCase();
    const series = (data[i][4] || '').toString();
    if (ts && email) {
      if (!log.byEmail[email] || log.byEmail[email] < ts) log.byEmail[email] = ts;
    }
    if (series) log.series[series] = true;
  }
  return log;
}

function recentlySent(log, email) {
  const last = log.byEmail[email.toLowerCase()];
  if (!last) return false;
  const daysAgo = (new Date() - last) / (1000 * 60 * 60 * 24);
  return daysAgo < COOLDOWN_DAYS;
}

// ============ SHARED EMAIL STYLING ============
//
// One lightweight shell used by both the review and reminder emails so they
// feel like they come from the same person, not a marketing system.
//
// Spam-safety rules baked in here, do not break them casually:
//   - No <img> tags. A plain-text wordmark replaces the logo.
//   - No external resources, web fonts, or background images.
//   - Plain system fonts, one accent color, generous whitespace.
//   - Every email that uses this also sends a matching plain-text body.

const BRAND_GREEN = '#2f6f4f';   // calm, sanctuary-ish green for the wordmark + links
const TEXT_COLOR = '#33373b';    // soft near-black for body copy
const MUTED_COLOR = '#8a9099';   // captions, footer

function mwEmailShell(innerHtml) {
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  return '' +
    '<div style="margin:0;padding:24px 12px;background-color:#f5f5f3;">' +
      '<div style="max-width:560px;margin:0 auto;background-color:#ffffff;border:1px solid #e7e7e4;' +
        'border-radius:10px;padding:34px 30px;font-family:' + font + ';color:' + TEXT_COLOR + ';' +
        'font-size:16px;line-height:1.6;">' +

        '<div style="text-align:center;padding-bottom:22px;margin-bottom:8px;border-bottom:1px solid #ededea;">' +
          '<div style="font-size:19px;letter-spacing:2px;color:' + BRAND_GREEN + ';font-weight:bold;">MERRITT WELLNESS</div>' +
          '<div style="font-size:11px;letter-spacing:2px;color:' + MUTED_COLOR + ';text-transform:uppercase;margin-top:5px;">Historic Sanctuary &middot; Denver</div>' +
        '</div>' +

        innerHtml +

      '</div>' +
      '<div style="max-width:560px;margin:14px auto 0;text-align:center;font-family:' + font + ';' +
        'font-size:12px;line-height:1.5;color:' + MUTED_COLOR + ';">' +
        'Merritt Wellness &middot; 2246 Irving St, Denver, CO 80211' +
      '</div>' +
    '</div>';
}

// A simple, single-color button. No gradients or images that trip filters.
function mwButton(href, label) {
  return '' +
    '<div style="text-align:center;margin:26px 0;">' +
      '<a href="' + href + '" style="display:inline-block;background-color:' + BRAND_GREEN + ';' +
        'color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;' +
        'font-weight:bold;font-size:15px;">' + label + '</a>' +
    '</div>';
}

function mwParagraph(html) {
  return '<p style="margin:0 0 16px 0;">' + html + '</p>';
}

// ============ REVIEW EMAIL ============

function sendReviewEmail(toEmail, event, details) {
  details = details || {};
  const firstName = resolveRecipientName(event, details);
  const eventName = resolveEventName(event, details);

  const tz = Session.getScriptTimeZone();
  const eventDate = Utilities.formatDate(event.getStartTime(), tz, 'EEEE, MMMM d');

  const subject = 'Hope ' + eventName + ' went well, ' + firstName;
  const html = buildReviewHtml(firstName, eventName, eventDate);
  const textBody = buildReviewText(firstName, eventName, eventDate);

  GmailApp.sendEmail(toEmail, subject, textBody, {
    htmlBody: html,
    name: FROM_NAME,
    replyTo: REPLY_TO
  });
}

function buildReviewHtml(firstName, eventName, eventDate) {
  const inner =
    mwParagraph('Hi ' + firstName + ',') +
    mwParagraph('It was a real pleasure having <strong>' + eventName + '</strong> at Merritt Wellness this past ' +
      eventDate + '. I hope the day came together the way you pictured it, and that the space did right by you and your guests.') +
    mwParagraph('If you have a spare minute, I would be genuinely grateful for a quick Google review. We are a small team, ' +
      'and a few honest words from a host like you do more to help the next person find us than anything we could say ourselves.') +
    mwButton(REVIEW_URL, 'Leave a quick review') +
    '<p style="margin:0 0 16px 0;font-size:13px;color:' + MUTED_COLOR + ';text-align:center;">' +
      'If the button does not work, you can paste this link into your browser:<br>' + REVIEW_URL +
    '</p>' +
    mwParagraph('And if something was not quite right, I would honestly rather hear it from you first. Just reply to this ' +
      'email or reach me at <a href="mailto:' + MANAGER_EMAIL + '" style="color:' + BRAND_GREEN + ';">' + MANAGER_EMAIL + '</a> ' +
      'and I will make it right.') +
    mwParagraph('Either way, thank you for trusting us with your event. I would love to host you again whenever the next one comes around.') +
    '<p style="margin:24px 0 0 0;">Warmly,<br><strong>Cole</strong><br>' +
      '<span style="color:' + MUTED_COLOR + ';">Merritt Wellness</span></p>';
  return mwEmailShell(inner);
}

function buildReviewText(firstName, eventName, eventDate) {
  return 'Hi ' + firstName + ',\n\n' +
    'It was a real pleasure having ' + eventName + ' at Merritt Wellness this past ' + eventDate + '. ' +
    'I hope the day came together the way you pictured it, and that the space did right by you and your guests.\n\n' +
    'If you have a spare minute, I would be genuinely grateful for a quick Google review. We are a small team, ' +
    'and a few honest words from a host like you do more to help the next person find us than anything we could say ourselves:\n\n' +
    REVIEW_URL + '\n\n' +
    'And if something was not quite right, I would honestly rather hear it from you first. Just reply to this email or ' +
    'reach me at ' + MANAGER_EMAIL + ' and I will make it right.\n\n' +
    'Either way, thank you for trusting us with your event. I would love to host you again whenever the next one comes around.\n\n' +
    'Warmly,\n' +
    'Cole\n' +
    'Merritt Wellness';
}

// ============ TESTING ============

// Set this to your own email before running previewEmailToSelf().
const TEST_PREVIEW_EMAIL = '';

/**
 * Sends a preview of the review email to TEST_PREVIEW_EMAIL using
 * yesterday's first eligible one-off event. Lets you see exactly what
 * a host would receive, without actually emailing them.
 *
 * After it arrives, confirm it landed in your Primary inbox (not Spam or
 * Promotions). That is the real deliverability test.
 */
function previewEmailToSelf() {
  if (!TEST_PREVIEW_EMAIL || TEST_PREVIEW_EMAIL.indexOf('@') === -1) {
    console.log('Set TEST_PREVIEW_EMAIL near the bottom of the script first.');
    return;
  }

  const cal = (CALENDAR_ID === 'primary')
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);

  const now = new Date();
  const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const events = cal.getEvents(yStart, yEnd);

  for (const event of events) {
    if (event.isRecurringEvent() && SKIP_RECURRING_EVENTS) continue;
    const details = parseBookingDetails(event);
    if (!details.email) continue;

    sendReviewEmail(TEST_PREVIEW_EMAIL, event, details);
    console.log('Preview sent to ' + TEST_PREVIEW_EMAIL + ' based on "' + event.getTitle() + '".');
    return;
  }
  console.log('No eligible one-off events found yesterday to preview.');
}

/**
 * Sends a review preview using made-up details, so you can see the design
 * even when there were no eligible events yesterday. Does not log anything.
 */
function previewReviewWithSampleData() {
  if (!TEST_PREVIEW_EMAIL || TEST_PREVIEW_EMAIL.indexOf('@') === -1) {
    console.log('Set TEST_PREVIEW_EMAIL near the bottom of the script first.');
    return;
  }
  const subject = 'Hope Sunrise Yoga Workshop went well, Jamie';
  const html = buildReviewHtml('Jamie', 'Sunrise Yoga Workshop', 'Saturday, June 7');
  const text = buildReviewText('Jamie', 'Sunrise Yoga Workshop', 'Saturday, June 7');
  GmailApp.sendEmail(TEST_PREVIEW_EMAIL, subject, text, {
    htmlBody: html, name: FROM_NAME, replyTo: REPLY_TO
  });
  console.log('Sample review preview sent to ' + TEST_PREVIEW_EMAIL + '.');
}

/**
 * Run once to list every calendar this Google account can access, with IDs.
 * Use the output to set CALENDAR_ID at the top of the script.
 */
function listCalendars() {
  const cals = CalendarApp.getAllCalendars();
  console.log('Calendars accessible to this script:\n');
  for (const c of cals) {
    console.log(' - "' + c.getName() + '"');
    console.log('     id: ' + c.getId());
  }
}

/**
 * Run from the Apps Script editor to authorize and preview behavior.
 * Lists yesterday's events and what the script would do with each.
 * Does NOT send any emails.
 */
function testRun() {
  const cal = (CALENDAR_ID === 'primary')
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);

  const now = new Date();
  const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const events = cal.getEvents(yStart, yEnd);

  console.log('Found ' + events.length + ' events that ended yesterday.\n');
  for (const event of events) {
    const details = parseBookingDetails(event);
    const host = findHostEmail(event, details);
    const recurring = event.isRecurringEvent() ? '(recurring)' : '(one-off)';
    console.log(' - "' + event.getTitle() + '" ' + recurring);
    console.log('     Event:     ' + (details.eventName || '(none)'));
    console.log('     Organizer: ' + (details.organizer || '(none)'));
    console.log('     Business:  ' + (details.business || '(none)'));
    console.log('     Greeting:  Hi ' + resolveRecipientName(event, details) + ',');
    console.log('     Host email -> ' + (host || 'NONE — add the host as a guest or put their email in the description'));
  }
}
