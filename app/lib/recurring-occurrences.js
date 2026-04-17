// Pure occurrence computation for recurring bookings.
//
// Given a recurring pattern (a list of weekday/time/frequency slots with an
// anchor startDate), this expands it into concrete date occurrences for a
// single calendar month. The monthly cron uses the result to compute hours,
// build invoice-item descriptions, and email the client a preview of what
// they're being billed for.
//
// Dates are treated as America/Denver wall-clock calendar dates. All inputs
// are expected as 'YYYY-MM-DD' strings (matching how recurring_details is
// persisted) so day-of-week is unambiguous and independent of the runtime TZ.

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function normalizeDateString(value) {
  if (!value) return null;
  if (typeof value !== 'string') {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const iso = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
        .toISOString().slice(0, 10);
      return iso;
    }
    return null;
  }
  // Accept 'YYYY-MM-DD' directly; accept ISO timestamps by slicing the date
  // part. This is safe because elsewhere in the system we store recurring
  // dates as plain YYYY-MM-DD calendar strings.
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseDateParts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

// UTC-midnight epoch of a YYYY-MM-DD calendar date. Used only for day-of-week
// and date-arithmetic — never for real timestamps.
function toUtcEpoch(dateStr) {
  const { y, m, d } = parseDateParts(dateStr);
  return Date.UTC(y, m - 1, d);
}

function dayOfWeek(dateStr) {
  return new Date(toUtcEpoch(dateStr)).getUTCDay();
}

function daysBetween(aStr, bStr) {
  return Math.round((toUtcEpoch(bStr) - toUtcEpoch(aStr)) / 86_400_000);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function slotLabel(slot) {
  const day = DAY_LABELS[Number(slot.dayOfWeek)] || 'Day';
  const freq = slot.frequency === 'weekly'
    ? 'Every'
    : slot.frequency === 'biweekly'
    ? 'Every other'
    : 'Monthly';
  return `${freq} ${day} ${slot.startTime || ''}`.trim();
}

// Find the first day on-or-after `fromDateStr` whose day-of-week matches the
// slot. Used as the biweekly parity anchor — week-offsets are measured from
// this date. Returns null if the anchor is itself missing.
function firstMatchingDayOnOrAfter(fromDateStr, targetDow) {
  if (!fromDateStr) return null;
  const fromDow = dayOfWeek(fromDateStr);
  let delta = (targetDow - fromDow + 7) % 7;
  const { y, m, d } = parseDateParts(fromDateStr);
  const start = new Date(Date.UTC(y, m - 1, d + delta));
  return `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}-${pad2(start.getUTCDate())}`;
}

// Compute all concrete occurrences for a recurring pattern in a given month.
//
// Arguments
//   pattern    { slots: [{ dayOfWeek, startTime, durationHours, frequency }], ... }
//              OR a bare array of slots (convenience)
//   year       full year (e.g. 2026)
//   month      1-12
//   options    { startDate, endDate } — inclusive clipping. If omitted, falls
//              back to pattern.startDate / pattern.endDate.
//
// Returns: Array<{ date: 'YYYY-MM-DD', hours: number, slotLabel: string, slot: original slot }>
//          sorted ascending by date, then by slotLabel.
export function computeOccurrences(pattern, year, month, options = {}) {
  if (!pattern) return [];
  const slots = Array.isArray(pattern) ? pattern : Array.isArray(pattern.slots) ? pattern.slots : [];
  if (slots.length === 0) return [];

  const clipStart = normalizeDateString(options.startDate ?? pattern.startDate);
  const clipEnd = normalizeDateString(options.endDate ?? pattern.endDate);
  if (!clipStart) {
    // Without an anchor we can't derive bi-weekly parity. Refuse rather than
    // silently produce the wrong schedule.
    throw new Error('computeOccurrences requires startDate (on options or pattern)');
  }

  const totalDays = daysInMonth(year, month);
  const monthStart = formatDate(year, month, 1);
  const monthEnd = formatDate(year, month, totalDays);

  // Quick reject: the whole month is outside the booking window.
  if (clipEnd && monthStart > clipEnd) return [];
  if (clipStart && monthEnd < clipStart) return [];

  // Pre-compute biweekly anchors per slot once, then test each day.
  const biweeklyAnchors = new Map();
  const monthlyAnchors = new Map();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.frequency === 'biweekly') {
      biweeklyAnchors.set(i, firstMatchingDayOnOrAfter(clipStart, Number(slot.dayOfWeek)));
    } else if (slot.frequency === 'monthly') {
      // Monthly slot = first matching weekday in the target month, clipped.
      monthlyAnchors.set(i, firstMatchingDayOnOrAfter(monthStart, Number(slot.dayOfWeek)));
    }
  }

  const out = [];
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = formatDate(year, month, d);
    if (dateStr < clipStart) continue;
    if (clipEnd && dateStr > clipEnd) continue;

    const dow = dayOfWeek(dateStr);
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (Number(slot.dayOfWeek) !== dow) continue;

      const freq = slot.frequency;
      if (freq === 'weekly') {
        out.push(buildOccurrence(dateStr, slot));
      } else if (freq === 'biweekly') {
        const anchor = biweeklyAnchors.get(i);
        if (!anchor) continue;
        const delta = daysBetween(anchor, dateStr);
        if (delta >= 0 && delta % 14 === 0) {
          out.push(buildOccurrence(dateStr, slot));
        }
      } else if (freq === 'monthly') {
        const anchor = monthlyAnchors.get(i);
        if (anchor === dateStr) {
          out.push(buildOccurrence(dateStr, slot));
        }
      }
    }
  }

  out.sort((a, b) => a.date === b.date
    ? a.slotLabel.localeCompare(b.slotLabel)
    : a.date.localeCompare(b.date));

  return out;
}

function buildOccurrence(dateStr, slot) {
  return {
    date: dateStr,
    hours: Number(slot.durationHours) || 0,
    slotLabel: slotLabel(slot),
    slot,
  };
}

// Build a human-friendly description of a month's occurrences, grouped by
// weekday so the client email and invoice description read naturally.
// Example: "5 Wednesdays x 2 hrs + 2 Fridays x 4 hrs = 18 hrs"
export function summarizeOccurrences(occurrences) {
  if (!occurrences || occurrences.length === 0) {
    return { parts: [], totalHours: 0, text: '0 hrs' };
  }

  const grouped = new Map();
  for (const occ of occurrences) {
    const dow = dayOfWeek(occ.date);
    const key = `${dow}|${occ.hours}`;
    const g = grouped.get(key) || { dow, hours: occ.hours, count: 0 };
    g.count += 1;
    grouped.set(key, g);
  }

  const parts = [];
  let total = 0;
  for (const g of grouped.values()) {
    const dayName = DAY_LABELS[g.dow] || 'Day';
    const plural = g.count === 1 ? dayName : `${dayName}s`;
    parts.push(`${g.count} ${plural} x ${g.hours} hrs`);
    total += g.count * g.hours;
  }

  return {
    parts,
    totalHours: total,
    text: `${parts.join(' + ')} = ${total} hrs`,
  };
}

export const _internal = {
  dayOfWeek,
  daysBetween,
  daysInMonth,
  firstMatchingDayOnOrAfter,
  normalizeDateString,
  slotLabel,
};
