/**
 * Merritt Wellness - 24-Hour Pre-Event Reminder Emails
 *
 * Sends an HTML reminder to hosts the day before their event.
 * - Recurring events: skipped by default
 * - Per-event toggle: add [skip-reminder] to title or description
 * - Tracking: logs each sent reminder to the "ReminderEmails" tab so the
 *   same event never gets reminded twice (safe to re-run any time).
 *
 * NOTE: This file relies on functions and constants defined in the review
 * email script (parseBookingDetails, findHostEmail, decodeHtmlEntities,
 * extractField, CALENDAR_ID, TRACKING_SHEET_ID, SKIP_RECURRING_EVENTS,
 * FROM_NAME, REPLY_TO, SUNDAY_SERVICE_KEYWORDS, and the shared email-styling
 * helpers mwEmailShell / mwButton / mwParagraph / BRAND_GREEN / MUTED_COLOR).
 * Keep both files in the same Apps Script project.
 *
 * DELIVERABILITY NOTE: like the review email, this reminder is intentionally
 * lightweight, no images, simple inline styles, and a full plain-text body
 * that mirrors the HTML, so it stays out of the spam folder. See the longer
 * note in reviewEmails.gs before redesigning.
 *
 * SETUP:
 * 1. In your existing tracking sheet, add a NEW tab named "ReminderEmails"
 *    with these headers in row 1:
 *      Timestamp | Host Email | Event Title | Event Date | Event ID
 * 2. Paste this file into Apps Script as a new script file in the same
 *    project as reviewEmails.gs.
 * 3. Set TEST_REMINDER_EMAIL near the bottom and run previewReminderEmailToSelf()
 *    to see the reminder in your inbox.
 * 4. Add a daily trigger: sendEventReminders, 8am to 9am.
 */

// ============ CONFIG (reminder-specific) ============
const REMINDER_SHEET_NAME = 'ReminderEmails';
const REMINDER_SKIP_TAGS = ['[skip-reminder]', '[no-reminder]'];

const ONBOARDING_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLkE5cGIi8Zdjl6Sb3aa7UKqFrYWQN3uiu';
const DAY_OF_EMAIL = 'clientservices@merrittwellness.net';
const DAY_OF_PHONE = '303-359-8337';
const WIFI_NETWORK = 'merrittcowork';
const WIFI_PASSWORD = 'Merritt23X';

// ============ MAIN ============

function sendEventReminders() {
  const cal = (CALENDAR_ID === 'primary')
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);

  // Tomorrow's window
  const now = new Date();
  const tStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const tEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);
  const events = cal.getEvents(tStart, tEnd);

  const sheet = SpreadsheetApp.openById(TRACKING_SHEET_ID).getSheetByName(REMINDER_SHEET_NAME);
  const sentLog = buildReminderLog(sheet);

  let sent = 0;
  let skipped = 0;

  for (const event of events) {
    try {
      const result = processReminderEvent(event, sheet, sentLog);
      if (result === 'sent') sent++;
      else skipped++;
    } catch (e) {
      console.error('Reminder error on "' + event.getTitle() + '": ' + e);
    }
  }

  console.log('Reminder emails: ' + sent + ' sent, ' + skipped + ' skipped.');
}

function processReminderEvent(event, sheet, sentLog) {
  const title = event.getTitle();
  const desc = event.getDescription() || '';
  const combined = (title + ' ' + desc).toLowerCase();

  // 1. Skip tag check
  for (const tag of REMINDER_SKIP_TAGS) {
    if (combined.includes(tag.toLowerCase())) {
      console.log('Skip (tag): ' + title);
      return 'skipped';
    }
  }

  // 2. Skip Sunday services
  if (event.getStartTime().getDay() === 0) {
    for (const kw of SUNDAY_SERVICE_KEYWORDS) {
      if (title.toLowerCase().includes(kw)) return 'skipped';
    }
  }

  // 3. Parse details and find host email
  const details = parseBookingDetails(event);
  const hostEmail = findHostEmail(event, details);
  if (!hostEmail) {
    console.log('Skip (no host email): ' + title);
    return 'skipped';
  }

  // 4. Tracking key check:
  //    - one-off events use the event ID
  //    - recurring events use the series ID (so the first occurrence sends,
  //      and all later occurrences in the same series are skipped)
  const trackingKey = getTrackingKey(event);
  if (sentLog[trackingKey]) {
    console.log('Skip (already reminded for this event/series): ' + title);
    return 'skipped';
  }

  // 5. Send and log
  sendReminderEmail(hostEmail, event, details);
  sheet.appendRow([new Date(), hostEmail, title, event.getStartTime(), trackingKey]);
  console.log('Reminder sent: ' + hostEmail + ' for ' + title);
  return 'sent';
}

function getTrackingKey(event) {
  if (event.isRecurringEvent()) {
    try {
      return event.getEventSeries().getId();
    } catch (e) {
      // fall through to event ID if series can't be retrieved
    }
  }
  return event.getId();
}

function buildReminderLog(sheet) {
  const data = sheet.getDataRange().getValues();
  const log = {};
  for (let i = 1; i < data.length; i++) {
    const key = (data[i][4] || '').toString();
    if (key) log[key] = true;
  }
  return log;
}

// ============ EMAIL ============

function sendReminderEmail(toEmail, event, details) {
  details = details || {};
  const firstName = (details.organizer && details.organizer.split(/\s+/)[0]) || 'there';
  const eventName = details.eventName || event.getTitle().replace(/^[^A-Za-z]*BOOKED:\s*/i, '');

  const startTime = event.getStartTime();
  const tz = Session.getScriptTimeZone();
  const eventDate = Utilities.formatDate(startTime, tz, 'EEEE, MMMM d');
  const eventTime = Utilities.formatDate(startTime, tz, 'h:mm a');

  const subject = 'See you tomorrow, ' + firstName + ' — ' + eventName + ' at Merritt Wellness';
  const html = buildReminderHtml(firstName, eventName, eventDate, eventTime);
  const textBody = buildReminderText(firstName, eventName, eventDate, eventTime);

  MailApp.sendEmail({
    to: toEmail,
    subject: subject,
    body: textBody,
    htmlBody: html,
    name: FROM_NAME,
    replyTo: REPLY_TO
  });
}

// A subtle, left-bordered note card. No background images or heavy fills,
// just a faint tint, so it reads as friendly rather than promotional.
function mwNoteCard(title, bodyHtml) {
  return '' +
    '<div style="background-color:#f3f6f4;border-left:3px solid ' + BRAND_GREEN + ';' +
      'border-radius:0 6px 6px 0;padding:14px 16px;margin:0 0 16px 0;">' +
      '<div style="font-weight:bold;color:' + BRAND_GREEN + ';margin-bottom:6px;font-size:15px;">' + title + '</div>' +
      '<div style="font-size:15px;line-height:1.55;">' + bodyHtml + '</div>' +
    '</div>';
}

function buildReminderHtml(firstName, eventName, eventDate, eventTime) {
  const link = function(href, label) {
    return '<a href="' + href + '" style="color:' + BRAND_GREEN + ';">' + label + '</a>';
  };

  const inner =
    mwParagraph('Hi ' + firstName + ',') +
    mwParagraph('Just a friendly reminder that <strong>' + eventName + '</strong> is happening tomorrow, ' +
      eventDate + ' at ' + eventTime + '. We are genuinely looking forward to having you in the space.') +
    mwParagraph('A few quick things to set you up for a smooth day:') +

    mwNoteCard('Watch the onboarding videos first',
      'If you have not already, please take a few minutes to watch the onboarding videos before tomorrow. ' +
      'The lock-up video is the most important one, it walks you through closing out the space correctly. ' +
      link(ONBOARDING_PLAYLIST_URL, 'Onboarding video playlist') + '.') +

    mwNoteCard('Please respect your booked time',
      'Your window includes setup and breakdown. We often book back to back, so arriving early or staying late ' +
      'affects the next host. Planning around your exact start and end times keeps the day easy for everyone.') +

    mwNoteCard('Wi-Fi for the day',
      'Network: <strong>' + WIFI_NETWORK + '</strong><br>Password: <strong>' + WIFI_PASSWORD + '</strong>') +

    mwParagraph('If anything comes up before or during your event, reach our day-of team at ' +
      link('mailto:' + DAY_OF_EMAIL, DAY_OF_EMAIL) + ' or call ' +
      link('tel:' + DAY_OF_PHONE.replace(/[^0-9]/g, ''), DAY_OF_PHONE) + '. We are happy to help.') +

    mwParagraph('Have a wonderful event, ' + firstName + '. We are glad to be part of it.') +

    '<p style="margin:24px 0 0 0;">Warmly,<br><strong>Cole</strong><br>' +
      '<span style="color:' + MUTED_COLOR + ';">Merritt Wellness</span></p>';

  return mwEmailShell(inner);
}

function buildReminderText(firstName, eventName, eventDate, eventTime) {
  return 'Hi ' + firstName + ',\n\n' +
    'Just a friendly reminder that ' + eventName + ' is happening tomorrow, ' + eventDate + ' at ' + eventTime + '. ' +
    'We are genuinely looking forward to having you in the space.\n\n' +
    'A few quick things to set you up for a smooth day:\n\n' +
    'Watch the onboarding videos first\n' +
    'If you have not already, please take a few minutes to watch the onboarding videos before tomorrow. ' +
    'The lock-up video is the most important one, it walks you through closing out the space correctly.\n' +
    'Playlist: ' + ONBOARDING_PLAYLIST_URL + '\n\n' +
    'Please respect your booked time\n' +
    'Your window includes setup and breakdown. We often book back to back, so arriving early or staying late ' +
    'affects the next host. Planning around your exact start and end times keeps the day easy for everyone.\n\n' +
    'Wi-Fi for the day\n' +
    'Network: ' + WIFI_NETWORK + '\n' +
    'Password: ' + WIFI_PASSWORD + '\n\n' +
    'If anything comes up before or during your event, reach our day-of team at ' + DAY_OF_EMAIL +
    ' or call ' + DAY_OF_PHONE + '. We are happy to help.\n\n' +
    'Have a wonderful event, ' + firstName + '. We are glad to be part of it.\n\n' +
    'Warmly,\n' +
    'Cole\n' +
    'Merritt Wellness';
}

// ============ TESTING ============

// Set your own email before running previewReminderEmailToSelf().
const TEST_REMINDER_EMAIL = '';

/**
 * Sends a preview of tomorrow's first eligible event reminder to TEST_REMINDER_EMAIL.
 * Does NOT email the actual host or log to the tracking sheet.
 *
 * Confirm it lands in your Primary inbox (not Spam/Promotions) before relying on it.
 */
function previewReminderEmailToSelf() {
  if (!TEST_REMINDER_EMAIL || TEST_REMINDER_EMAIL.indexOf('@') === -1) {
    console.log('Set TEST_REMINDER_EMAIL near the bottom of the script first.');
    return;
  }

  const cal = (CALENDAR_ID === 'primary')
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);

  const now = new Date();
  const tStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const tEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);
  const events = cal.getEvents(tStart, tEnd);

  for (const event of events) {
    const details = parseBookingDetails(event);
    if (!details.email) continue;

    sendReminderEmail(TEST_REMINDER_EMAIL, event, details);
    console.log('Reminder preview sent to ' + TEST_REMINDER_EMAIL + ' based on "' + event.getTitle() + '".');
    return;
  }
  console.log('No eligible events found tomorrow to preview.');
}

/**
 * Sends a reminder preview using made-up details, so you can see the design
 * even when there are no eligible events tomorrow. Does not log anything.
 */
function previewReminderWithSampleData() {
  if (!TEST_REMINDER_EMAIL || TEST_REMINDER_EMAIL.indexOf('@') === -1) {
    console.log('Set TEST_REMINDER_EMAIL near the bottom of the script first.');
    return;
  }
  const html = buildReminderHtml('Jamie', 'Sunrise Yoga Workshop', 'Saturday, June 14', '9:00 AM');
  const text = buildReminderText('Jamie', 'Sunrise Yoga Workshop', 'Saturday, June 14', '9:00 AM');
  MailApp.sendEmail({
    to: TEST_REMINDER_EMAIL,
    subject: 'See you tomorrow, Jamie — Sunrise Yoga Workshop at Merritt Wellness',
    body: text, htmlBody: html, name: FROM_NAME, replyTo: REPLY_TO
  });
  console.log('Sample reminder preview sent to ' + TEST_REMINDER_EMAIL + '.');
}

/**
 * ONE-TIME SETUP function. Run this once right after deploying the
 * reminder script. It scans all upcoming recurring events for the next
 * year and pre-marks their series as "already reminded" in the tracking
 * sheet, so existing recurring partners (who already know the drill)
 * do NOT receive a reminder on their next occurrence.
 *
 * After running this once, brand-new recurring bookings created from
 * this point forward will still trigger a reminder on their first
 * occurrence; only subsequent occurrences in the same series are skipped.
 */
function seedExistingRecurringSeries() {
  const cal = (CALENDAR_ID === 'primary')
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);

  const now = new Date();
  const future = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const events = cal.getEvents(now, future);

  const sheet = SpreadsheetApp.openById(TRACKING_SHEET_ID).getSheetByName(REMINDER_SHEET_NAME);
  const existing = buildReminderLog(sheet);

  const seenInThisScan = {};
  let added = 0;

  for (const event of events) {
    if (!event.isRecurringEvent()) continue;
    try {
      const seriesId = event.getEventSeries().getId();
      if (seenInThisScan[seriesId] || existing[seriesId]) continue;
      seenInThisScan[seriesId] = true;
      sheet.appendRow([new Date(), '(seeded)', event.getTitle(), event.getStartTime(), seriesId]);
      added++;
    } catch (e) {
      // skip if series can't be retrieved
    }
  }

  console.log('Seeded ' + added + ' existing recurring series. These will no longer receive reminders.');
}

/**
 * Lists tomorrow's events and what the reminder script would do with each.
 * Sends nothing.
 */
function testReminderRun() {
  const cal = (CALENDAR_ID === 'primary')
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);

  const now = new Date();
  const tStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const tEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0);
  const events = cal.getEvents(tStart, tEnd);

  console.log('Found ' + events.length + ' events scheduled for tomorrow.\n');
  for (const event of events) {
    const details = parseBookingDetails(event);
    const host = findHostEmail(event, details);
    const recurring = event.isRecurringEvent() ? '(recurring)' : '(one-off)';
    console.log(' - "' + event.getTitle() + '" ' + recurring);
    console.log('     Organizer: ' + (details.organizer || '(none)'));
    console.log('     Host email -> ' + (host || 'NONE'));
  }
}
