// Display-ready rate tables for the marketing pages, derived from the SAME
// constants the booking engine charges with (app/lib/booking-pricing.js).
// Never hardcode a dollar figure on a page: import from here so a rate change
// in the engine updates the marketing copy automatically.

import {
  hourlyRateFor,
  RATE_TIER_MID_THRESHOLD,
  RATE_TIER_HIGH_THRESHOLD,
  EXTENDED_BOOKING_DISCOUNT,
  EXTENDED_BOOKING_DISCOUNT_MIN_HOURS,
  RECURRING_VOLUME_DISCOUNT,
  RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS,
  STRIPE_FEE_PERCENTAGE,
  ON_SITE_ASSISTANCE_FEE,
  EVENT_SUPERVISION_RATE,
  EVENT_SUPERVISION_GROUP_THRESHOLD,
  TABLES_CHAIRS_FEE_SMALL,
  TABLES_CHAIRS_FEE_LARGE,
  TABLES_CHAIRS_GROUP_THRESHOLD,
  MAT_RENTAL_FEE,
  DIVIDER_REMOVAL_FEE,
  // @ts-expect-error - plain JS module without type declarations
} from './booking-pricing.js';

export interface RateBand {
  guests: string;
  weekday: number;
  saturday: number;
  /** Weekday rate with the recurring volume discount applied */
  weekdayRecurring: number;
}

const bandDefs = [
  { guests: `Up to ${RATE_TIER_MID_THRESHOLD} guests`, sample: 0 },
  { guests: `${RATE_TIER_MID_THRESHOLD} to ${RATE_TIER_HIGH_THRESHOLD} guests`, sample: RATE_TIER_MID_THRESHOLD },
  { guests: `${RATE_TIER_HIGH_THRESHOLD}+ guests`, sample: RATE_TIER_HIGH_THRESHOLD },
];

export const rateBands: RateBand[] = bandDefs.map(({ guests, sample }) => ({
  guests,
  weekday: hourlyRateFor(sample, false),
  saturday: hourlyRateFor(sample, true),
  weekdayRecurring: Math.round(hourlyRateFor(sample, false) * (1 - RECURRING_VOLUME_DISCOUNT)),
}));

export const extendedDiscount = {
  percent: Math.round(EXTENDED_BOOKING_DISCOUNT * 100),
  minHours: EXTENDED_BOOKING_DISCOUNT_MIN_HOURS,
};

export const recurringDiscount = {
  percent: Math.round(RECURRING_VOLUME_DISCOUNT * 100),
  minMonthlyHours: RECURRING_VOLUME_DISCOUNT_MIN_MONTHLY_HOURS,
};

// Partner / non-profit discount: same 20% as the recurring volume discount
// (the partnership code applies 20% — see VALID_PROMO_CODES in
// booking-pricing.js).
export const partnerDiscount = { percent: recurringDiscount.percent };

export const cardFeePercent = STRIPE_FEE_PERCENTAGE as number;

export const minimumHours = 2;

export function money(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

// Optional add-ons, itemized during booking. Descriptions mirror the fee
// rules in booking-pricing.js.
export const addOns = [
  {
    name: 'In-house tables and chairs',
    detail: `$${TABLES_CHAIRS_FEE_SMALL} per item type for events under ${TABLES_CHAIRS_GROUP_THRESHOLD} guests, $${TABLES_CHAIRS_FEE_LARGE} per item type for ${TABLES_CHAIRS_GROUP_THRESHOLD}+ guests`,
  },
  {
    name: 'Event staffing',
    detail: `$${EVENT_SUPERVISION_RATE}/hour for events with ${EVENT_SUPERVISION_GROUP_THRESHOLD}+ guests; smaller first-time events include a flat $${ON_SITE_ASSISTANCE_FEE} first-hour onboarding`,
  },
  {
    name: 'Full-coverage floor mat',
    detail: `$${MAT_RENTAL_FEE} per booking, set up and broken down by our staff within your rental window`,
  },
  {
    name: 'Room divider removal',
    detail: `$${DIVIDER_REMOVAL_FEE.toLocaleString('en-US')} flat, for events that want the full open floor`,
  },
] as const;

/** Example: a full Saturday wedding day, used on /weddings pricing copy. */
export function saturdayExample(hours: number, guests: number) {
  const rate = hourlyRateFor(guests, true);
  const base = rate * hours;
  const qualifies = hours >= extendedDiscount.minHours;
  const discount = qualifies ? Math.round(base * (extendedDiscount.percent / 100)) : 0;
  return { rate, hours, base, discount, total: base - discount, qualifies };
}
