// Pure date helpers for the monthly-recurring-billing cron. Kept in their
// own module so tests can import them without triggering the Stripe/Supabase
// client initialization that happens at the top of monthly-billing.js.

// Accepts a Date and returns true iff that moment falls on the last calendar
// day of its own UTC month.
export function isLastDayOfMonth(nowUtc) {
  const tomorrow = new Date(nowUtc.getTime() + 24 * 60 * 60 * 1000);
  return tomorrow.getUTCMonth() !== nowUtc.getUTCMonth();
}

// The cron wakes up on the last day of the current month and queues invoice
// items for the month whose 1st is tomorrow. Wraps Dec -> Jan of the next year.
export function nextMonth(nowUtc) {
  const y = nowUtc.getUTCFullYear();
  const m = nowUtc.getUTCMonth() + 1;
  if (m === 12) return { year: y + 1, month: 1 };
  return { year: y, month: m + 1 };
}
