// Tests for buildStaffAttentionFlags — the helper that decides which
// staff-attention badges show on a Google Calendar booking. The three flags
// the manager cares about are:
//   1. First event + paid on-site assistance
//   2. Guest count >= 40 on a first event → mandatory supervision (4hr max)
//   3. Paid setup / breakdown
// Run with: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStaffAttentionFlags,
  pickCalendarColorId,
} from '../app/lib/calendar-flags.js';

const baseBooking = {
  is_first_event: false,
  expected_attendees: 10,
  event_supervision_fee: 0,
  event_supervision_hours: 0,
  wants_onsite_assistance: false,
  onsite_assistance_fee: 0,
  needs_setup_help: false,
  needs_teardown_help: false,
};

test('no flags when nothing special is set', () => {
  assert.deepEqual(buildStaffAttentionFlags(baseBooking), []);
});

test('first event with paid on-site assistance flags FIRST EVENT', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    is_first_event: true,
    wants_onsite_assistance: true,
    onsite_assistance_fee: 35,
  });
  assert.equal(flags.length, 1);
  assert.match(flags[0].tag, /FIRST EVENT/);
  assert.match(flags[0].detail, /\$35\.00/);
});

test('first event with 40+ attendees flags SUPERVISION REQUIRED', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    is_first_event: true,
    expected_attendees: 55,
    event_supervision_fee: 120,
    event_supervision_hours: 4,
  });
  assert.equal(flags.length, 1);
  assert.match(flags[0].tag, /SUPERVISION REQUIRED/);
  assert.match(flags[0].detail, /55 expected attendees/);
  assert.match(flags[0].detail, /4hr/);
  assert.match(flags[0].detail, /\$120\.00/);
});

test('supervision takes priority over first-event-assist', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    is_first_event: true,
    expected_attendees: 60,
    event_supervision_fee: 120,
    event_supervision_hours: 4,
    wants_onsite_assistance: true,
    onsite_assistance_fee: 35,
  });
  assert.equal(flags.length, 1);
  assert.match(flags[0].tag, /SUPERVISION REQUIRED/);
});

test('returning renter opting in for on-site assist flags ON-SITE ASSIST', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    is_first_event: false,
    wants_onsite_assistance: true,
    onsite_assistance_fee: 35,
  });
  assert.equal(flags.length, 1);
  assert.equal(flags[0].tag, '🤝 ON-SITE ASSIST');
});

test('setup only flag', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    needs_setup_help: true,
  });
  assert.equal(flags.length, 1);
  assert.equal(flags[0].tag, '🏗️ SETUP');
});

test('breakdown only flag', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    needs_teardown_help: true,
  });
  assert.equal(flags.length, 1);
  assert.equal(flags[0].tag, '🧹 BREAKDOWN');
});

test('setup + breakdown collapses to a single combined flag', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    needs_setup_help: true,
    needs_teardown_help: true,
  });
  assert.equal(flags.length, 1);
  assert.match(flags[0].tag, /SETUP/);
  assert.match(flags[0].tag, /BREAKDOWN/);
});

test('combines supervision and setup+breakdown flags', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    is_first_event: true,
    expected_attendees: 80,
    event_supervision_fee: 120,
    event_supervision_hours: 4,
    needs_setup_help: true,
    needs_teardown_help: true,
  });
  assert.equal(flags.length, 2);
  // Supervision must come first so it's visible even if title gets truncated
  // in calendar grid views.
  assert.match(flags[0].tag, /SUPERVISION REQUIRED/);
  assert.match(flags[1].tag, /SETUP/);
});

test('paid mat rental flags MAT — STAFF SETUP with the fee', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    needs_mat: true,
    mat_rental_fee: 100,
  });
  assert.equal(flags.length, 1);
  assert.match(flags[0].tag, /MAT — STAFF SETUP/);
  assert.match(flags[0].detail, /\$100\.00/);
  assert.match(flags[0].detail, /within the booked window/);
});

test('comped mat (partner) flags renter-setup, no fee', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    needs_mat: true,
    mat_rental_fee: 0,
  });
  assert.equal(flags.length, 1);
  assert.match(flags[0].tag, /MAT \(renter setup\)/);
  assert.match(flags[0].detail, /renter handles/i);
});

test('mat flag coexists with setup/breakdown', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    needs_setup_help: true,
    needs_teardown_help: true,
    needs_mat: true,
    mat_rental_fee: 100,
  });
  assert.equal(flags.length, 2);
  assert.match(flags[0].tag, /SETUP/);
  assert.match(flags[1].tag, /MAT/);
});

test('no mat flag when mat not requested', () => {
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    needs_mat: false,
    mat_rental_fee: 0,
  });
  assert.deepEqual(flags, []);
});

test('first event under threshold without paid assist produces no flag', () => {
  // The pricing engine charges on-site assistance for first events even when
  // attendees < 40, but if the persisted fields say no fee was charged we
  // should not invent a flag.
  const flags = buildStaffAttentionFlags({
    ...baseBooking,
    is_first_event: true,
    expected_attendees: 10,
  });
  assert.deepEqual(flags, []);
});

test('null / undefined booking returns empty array', () => {
  assert.deepEqual(buildStaffAttentionFlags(null), []);
  assert.deepEqual(buildStaffAttentionFlags(undefined), []);
});

// ---------- pickCalendarColorId ----------

test('pickCalendarColorId: no flags → default tomato (11)', () => {
  assert.equal(pickCalendarColorId([]), '11');
  assert.equal(pickCalendarColorId(null), '11');
});

test('pickCalendarColorId: supervision required → flamingo (4)', () => {
  assert.equal(
    pickCalendarColorId([{ tag: '🛡️ SUPERVISION REQUIRED', detail: '' }]),
    '4'
  );
});

test('pickCalendarColorId: on-site assist → tangerine (6)', () => {
  assert.equal(
    pickCalendarColorId([{ tag: '🤝 ON-SITE ASSIST', detail: '' }]),
    '6'
  );
  assert.equal(
    pickCalendarColorId([{ tag: '🌟 FIRST EVENT — ON-SITE ASSIST', detail: '' }]),
    '6'
  );
});

test('pickCalendarColorId: setup/breakdown only → banana (5)', () => {
  assert.equal(
    pickCalendarColorId([{ tag: '🏗️ SETUP', detail: '' }]),
    '5'
  );
  assert.equal(
    pickCalendarColorId([{ tag: '🧹 BREAKDOWN', detail: '' }]),
    '5'
  );
});
