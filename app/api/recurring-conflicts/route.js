// app/api/recurring-conflicts/route.js
//
// Pre-submit (or pre-confirm) sanity check for a recurring booking. Given the
// renter's proposed slots + start/end + any exceptions they've already
// recorded, this expands the next N months of occurrences and reports the
// dates where their times would overlap something already on the Google
// Calendar. The frontend uses the response to render a "schedule conflicts"
// modal that lets the renter skip the conflicting week or move it to a
// different date — both are recorded as exceptions and persisted on the
// booking when they finally submit.

import { z } from 'zod';
import {
  computeOccurrences,
  findOccurrenceConflicts,
} from '../../lib/recurring-occurrences.js';
import { findBusyRangesInRange } from '../../lib/calendar.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{1,2}:\d{2} (AM|PM)$/, 'Invalid time format'),
  durationHours: z.coerce.number().min(0.5).max(12),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
});

const ExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotIdx: z.number().int().min(0).optional().nullable(),
  action: z.enum(['skip', 'reschedule']),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  newStartTime: z.string().regex(/^\d{1,2}:\d{2} (AM|PM)$/).optional().nullable(),
});

const RequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  slots: z.array(SlotSchema).min(1).max(20),
  exceptions: z.array(ExceptionSchema).max(200).optional().default([]),
  // How many calendar months to scan, starting at startDate's month. The
  // booking page passes 3 by default — enough to flag the typical conflicts
  // (holidays, recurring obligations) without doing a year-long Google query.
  horizonMonths: z.number().int().min(1).max(12).optional().default(3),
});

export async function POST(request) {
  let payload;
  try {
    payload = RequestSchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { success: false, error: 'Invalid request', details: err.errors || String(err) },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Range to expand: from startDate (or today, whichever is later) for
  // horizonMonths whole months. We don't pre-clip to endDate because
  // computeOccurrences already does that, and it keeps the scan window
  // predictable for caching.
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const scanStart = payload.startDate > todayIso ? payload.startDate : todayIso;

  const [scanStartYear, scanStartMonth] = scanStart.split('-').map(Number);

  // Walk month by month so the engine handles biweekly parity correctly per
  // call. Aggregate into a flat list before doing the conflict cross-check.
  const occurrences = [];
  for (let i = 0; i < payload.horizonMonths; i++) {
    const cursor = new Date(Date.UTC(scanStartYear, scanStartMonth - 1 + i, 1));
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth() + 1;
    try {
      const monthOccs = computeOccurrences(
        { slots: payload.slots, exceptions: payload.exceptions || [] },
        y,
        m,
        { startDate: payload.startDate, endDate: payload.endDate || null },
      );
      occurrences.push(...monthOccs);
    } catch (err) {
      return Response.json(
        { success: false, error: 'Failed to compute occurrences', details: err.message },
        { status: 400, headers: CORS_HEADERS }
      );
    }
  }

  // No occurrences in the horizon? Nothing to check.
  if (occurrences.length === 0) {
    return Response.json(
      { success: true, occurrencesChecked: 0, conflicts: [], horizonMonths: payload.horizonMonths },
      { headers: CORS_HEADERS }
    );
  }

  // Pull every busy range across the occurrence span in one Google API call.
  const sortedDates = occurrences.map((o) => o.date).sort();
  const rangeStart = sortedDates[0];
  const rangeEnd = sortedDates[sortedDates.length - 1];

  let busyRanges;
  try {
    busyRanges = await findBusyRangesInRange(rangeStart, rangeEnd);
  } catch (err) {
    console.error('❌ Calendar lookup failed for recurring-conflicts:', err);
    return Response.json(
      {
        success: false,
        error: 'Calendar service unavailable',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Try again shortly',
      },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  const rawConflicts = findOccurrenceConflicts(occurrences, busyRanges);

  // Shape into a UI-friendly payload. The frontend uses these fields directly
  // to render each row of the conflict modal.
  const conflicts = rawConflicts.map(({ occurrence, conflict }) => ({
    date: occurrence.date,
    slotIdx: occurrence.slotIdx,
    startTime: occurrence.slot?.startTime || null,
    durationHours: occurrence.hours,
    rescheduledFrom: occurrence.rescheduledFrom || null,
    conflictWith: {
      summary: conflict.summary,
      startMinutes: conflict.startMinutes,
      endMinutes: conflict.endMinutes,
    },
  }));

  return Response.json(
    {
      success: true,
      occurrencesChecked: occurrences.length,
      horizonMonths: payload.horizonMonths,
      scanRange: { start: rangeStart, end: rangeEnd },
      conflicts,
    },
    { headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}
