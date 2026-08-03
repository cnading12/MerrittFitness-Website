// Editable scheduling + partnership data for /class-partnerships, /congregations,
// and /studio. Venue staff: update the blocks below as communities come and go —
// no other code change is needed, the pages render whatever is here.

// ---------------------------------------------------------------------------
// Open recurring class blocks shown on /class-partnerships.
// Keep this list current: it is published verbatim as real availability.
// ---------------------------------------------------------------------------
export interface OpenBlock {
  day: string;
  time: string;
  note?: string;
}

export const OPEN_CLASS_BLOCKS: OpenBlock[] = [
  { day: 'Monday', time: '6:00 – 8:00 PM' },
  { day: 'Thursday', time: '4:00 – 6:00 PM' },
  { day: 'Sunday', time: '5:00 – 7:00 PM', note: 'evening block, after Sunday services end' },
];

// Season label shown alongside the open blocks, e.g. "open for fall".
export const OPEN_BLOCKS_SEASON = 'fall';

// The weekly rhythm the venue runs on. Rendered as prose/graphics on
// /class-partnerships so practitioners understand where they fit.
export const WEEKLY_RHYTHM = [
  { days: 'Monday – Thursday', use: 'Two separate two-hour class blocks per day, morning-to-evening flexibility' },
  { days: 'Friday & Saturday', use: 'Larger private events; Saturday carries a premium rate' },
  { days: 'Sunday daytime', use: 'Congregation services (capacity for three; currently two), space vacated by 4:30 PM' },
  { days: 'Sunday evening', use: 'Recurring class block available from 5 PM' },
];

// ---------------------------------------------------------------------------
// Sunday congregation schedule shown on /congregations.
// ---------------------------------------------------------------------------
export const SUNDAY_SCHEDULE = {
  // Two churches currently hold Sunday services between these hours.
  congregationsCount: 2,
  occupiedWindow: '7:00 AM – 4:30 PM',
  eveningAvailableFrom: '4:30 PM',
  note: 'Two churches currently hold Sunday services between 7 AM and 4:30 PM. The building has capacity for a third Sunday community, and Sunday evenings after 4:30 PM are open.',
};

// ---------------------------------------------------------------------------
// Merritt Workspace member benefit shown on /studio (and referenced from
// /class-partnerships). Members book the Merritt Wellness venue at no
// additional cost, Monday–Friday 9 AM–5 PM, with included hours by tier.
// ---------------------------------------------------------------------------
export const WORKSPACE_MEMBER_BENEFIT = {
  window: 'Monday through Friday, 9 AM – 5 PM',
  tiers: [
    { name: 'Dedicated desk', includedHoursPerMonth: 4 },
    { name: 'Private office', includedHoursPerMonth: 8 },
  ],
};
