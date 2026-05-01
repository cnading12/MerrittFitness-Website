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
//   pattern    { slots: [{ dayOfWeek, startTime, durationHours, frequency }], exceptions?, ... }
//              OR a bare array of slots (convenience)
//   year       full year (e.g. 2026)
//   month      1-12
//   options    { startDate, endDate, exceptions } — inclusive clipping. If
//              omitted, falls back to pattern.startDate / pattern.endDate /
//              pattern.exceptions.
//
// Exceptions (per-date overrides selected by the renter, typically to dodge a
// calendar conflict) take this shape:
//   { date: 'YYYY-MM-DD', slotIdx?: number, action: 'skip' }
//   { date: 'YYYY-MM-DD', slotIdx?: number, action: 'reschedule',
//     newDate: 'YYYY-MM-DD', newStartTime?: 'H:MM AM/PM' }
// `slotIdx` matches the original slot index; if omitted, the exception applies
// to every slot landing on that date. Reschedules whose `newDate` falls in a
// different month are dropped from THAT month's output and re-introduced when
// the engine is asked for the new month — same exceptions list, same logic.
//
// Returns: Array<{ date, hours, slotLabel, slot, rescheduledFrom? }>
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

  const exceptionsRaw = Array.isArray(options.exceptions)
    ? options.exceptions
    : Array.isArray(pattern.exceptions) ? pattern.exceptions : [];
  const exceptions = exceptionsRaw
    .map(normalizeException)
    .filter(Boolean);

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

  // Build the raw schedule first. We'll post-process exceptions afterward so
  // a reschedule's NEW date can be inserted even if the new date doesn't sit
  // on one of the slot's regular weekdays.
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
        out.push(buildOccurrence(dateStr, slot, i));
      } else if (freq === 'biweekly') {
        const anchor = biweeklyAnchors.get(i);
        if (!anchor) continue;
        const delta = daysBetween(anchor, dateStr);
        if (delta >= 0 && delta % 14 === 0) {
          out.push(buildOccurrence(dateStr, slot, i));
        }
      } else if (freq === 'monthly') {
        const anchor = monthlyAnchors.get(i);
        if (anchor === dateStr) {
          out.push(buildOccurrence(dateStr, slot, i));
        }
      }
    }
  }

  // Cross-month reschedules: an exception whose ORIGINAL date sat in a
  // different month but whose NEW date lands in *this* month needs to inject
  // a synthetic occurrence here. slotIdx is required for that — without it we
  // can't reconstruct the slot's hours/label, so we silently drop.
  for (const ex of exceptions) {
    if (ex.action !== 'reschedule') continue;
    if (!ex.newDate) continue;
    if (ex.newDate < monthStart || ex.newDate > monthEnd) continue;
    if (clipStart && ex.newDate < clipStart) continue;
    if (clipEnd && ex.newDate > clipEnd) continue;
    // Original date inside this month? Already handled by the post-processing
    // pass below — skip to avoid double insertion.
    if (ex.date >= monthStart && ex.date <= monthEnd) continue;
    if (ex.slotIdx === null) continue;
    const slot = slots[ex.slotIdx];
    if (!slot) continue;
    out.push({
      date: ex.newDate,
      hours: Number(slot.durationHours) || 0,
      slotLabel: slotLabel(slot),
      slot: { ...slot, startTime: ex.newStartTime || slot.startTime },
      slotIdx: ex.slotIdx,
      rescheduledFrom: ex.date,
    });
  }

  // Apply exceptions. Skips drop matching occurrences. Reschedules drop the
  // original AND insert a synthetic occurrence at the new date/time provided
  // it falls inside the target month and inside the booking window.
  const filtered = [];
  for (const occ of out) {
    const matched = matchingException(exceptions, occ);
    if (!matched) {
      filtered.push(occ);
      continue;
    }
    if (matched.action === 'skip') {
      // drop
      continue;
    }
    if (matched.action === 'reschedule') {
      const newDate = normalizeDateString(matched.newDate);
      if (!newDate) continue; // invalid reschedule — drop the occurrence
      if (newDate < monthStart || newDate > monthEnd) continue; // moved out of month
      if (clipStart && newDate < clipStart) continue;
      if (clipEnd && newDate > clipEnd) continue;
      filtered.push({
        date: newDate,
        hours: occ.hours,
        slotLabel: occ.slotLabel,
        slot: { ...occ.slot, startTime: matched.newStartTime || occ.slot.startTime },
        slotIdx: occ.slotIdx,
        rescheduledFrom: occ.date,
      });
      continue;
    }
    // unknown action — be conservative, keep the occurrence
    filtered.push(occ);
  }

  // Dedupe by (date, slotIdx, startTime). A reschedule onto a date the slot
  // already covers would otherwise double-bill the renter for the same hour.
  const seen = new Set();
  const deduped = [];
  for (const occ of filtered) {
    const key = `${occ.date}|${occ.slotIdx ?? '-'}|${occ.slot?.startTime ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(occ);
  }

  deduped.sort((a, b) => a.date === b.date
    ? a.slotLabel.localeCompare(b.slotLabel)
    : a.date.localeCompare(b.date));

  return deduped;
}

// Normalize an exception into the canonical shape used internally. Unknown
// entries (missing date, missing action) become null and are dropped — this
// keeps the engine forgiving when the exceptions blob arrives from older
// records or hand-edited JSON.
function normalizeException(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const date = normalizeDateString(raw.date);
  if (!date) return null;
  const action = raw.action === 'skip' || raw.action === 'reschedule' ? raw.action : null;
  if (!action) return null;
  const slotIdx = (raw.slotIdx === null || raw.slotIdx === undefined)
    ? null
    : Number(raw.slotIdx);
  const out = { date, action, slotIdx: Number.isNaN(slotIdx) ? null : slotIdx };
  if (action === 'reschedule') {
    out.newDate = normalizeDateString(raw.newDate);
    out.newStartTime = typeof raw.newStartTime === 'string' ? raw.newStartTime : null;
  }
  return out;
}

// First matching exception for a generated occurrence. `slotIdx` null on the
// exception means "any slot on this date".
function matchingException(exceptions, occ) {
  for (const ex of exceptions) {
    if (ex.date !== occ.date) continue;
    if (ex.slotIdx !== null && ex.slotIdx !== occ.slotIdx) continue;
    return ex;
  }
  return null;
}

function buildOccurrence(dateStr, slot, slotIdx = null) {
  return {
    date: dateStr,
    hours: Number(slot.durationHours) || 0,
    slotLabel: slotLabel(slot),
    slot,
    slotIdx,
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

// Convert a "H:MM AM/PM" or "HH:MM" string into minutes-from-midnight.
// Returns null if unparseable.
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const period = m[3] ? m[3].toUpperCase() : null;
  if (period === 'PM' && hour !== 12) hour += 12;
  else if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

// Walk a list of occurrences against a list of busy ranges (date + minute
// window) and report each occurrence whose [start, end) intersects an
// existing booking. Used by the conflict-check endpoint to flag dates the
// renter needs to skip or reschedule before submission.
//
// `excludeSummaryRegex` defaults to ignoring the renter's OWN existing
// recurring/single events that happen to be on the calendar — pass null to
// surface every overlap.
//
// Returns Array<{ occurrence, conflict: { startMinutes, endMinutes, summary } }>
export function findOccurrenceConflicts(occurrences, busyRanges, options = {}) {
  if (!Array.isArray(occurrences) || !Array.isArray(busyRanges)) return [];

  // Group busy ranges by date for O(N+M) instead of O(N*M).
  const byDate = new Map();
  for (const range of busyRanges) {
    if (!range || !range.date) continue;
    const list = byDate.get(range.date) || [];
    list.push(range);
    byDate.set(range.date, list);
  }

  const excludeRegex = options.excludeSummaryRegex || null;

  const conflicts = [];
  for (const occ of occurrences) {
    const ranges = byDate.get(occ.date);
    if (!ranges || ranges.length === 0) continue;

    const occStart = timeToMinutes(occ.slot?.startTime);
    if (occStart === null) continue;
    const occEnd = occStart + Math.round((Number(occ.hours) || 0) * 60);
    if (occEnd <= occStart) continue;

    for (const range of ranges) {
      if (excludeRegex && excludeRegex.test(range.summary || '')) continue;
      // Half-open interval intersection.
      if (occStart < range.endMinutes && range.startMinutes < occEnd) {
        conflicts.push({
          occurrence: occ,
          conflict: {
            startMinutes: range.startMinutes,
            endMinutes: range.endMinutes,
            summary: range.summary,
          },
        });
        break; // one report per occurrence is enough for the UX
      }
    }
  }

  return conflicts;
}

export const _internal = {
  dayOfWeek,
  daysBetween,
  daysInMonth,
  firstMatchingDayOnOrAfter,
  normalizeDateString,
  slotLabel,
  timeToMinutes,
};
