// Pure pricing + scheduling helpers for one-off (single) bookings.
//
// Extracted from app/api/booking-request/route.js so the rules can be unit
// tested without spinning up Supabase, Stripe, or the Next.js request layer.
// Behavior is intentionally identical to the in-route version that shipped
// before this extraction — every rate, fee, threshold, and rounding rule is
// preserved. The route now imports these helpers instead of redefining them.

// Pricing constants. Mirror the "Important Rental Information" copy on the
// booking page. Changing any of these without updating the UI copy will create
// a discrepancy between what the renter sees and what they're charged, so
// always update both.
export const HOURLY_RATE = 95;
export const SATURDAY_RATE = 200;
export const SETUP_TEARDOWN_FEE = 50;
export const ON_SITE_ASSISTANCE_FEE = 35;
export const EVENT_SUPERVISION_RATE = 30;          // $/hr for first-time 40+ attendee bookings
export const EVENT_SUPERVISION_MAX_HOURS = 4;
export const EVENT_SUPERVISION_GROUP_THRESHOLD = 40;
export const STRIPE_FEE_PERCENTAGE = 3;            // % surcharge for card payments

// Promo codes. These must stay in sync with the client-side dictionary in
// app/booking/page.tsx — the server is the source of truth, but the UI shows
// the discount before submit, so any drift is user-visible.
export const VALID_PROMO_CODES = {
  MerrittMagic: { discount: 0.20, description: 'Partnership Discount (20% off)' },
  EXTENDED15: { discount: 0.15, description: 'Extended Booking Discount (15% off)', minHours: 8 },
};

// True iff `dateString` (YYYY-MM-DD) lands on a Saturday in local time. Parses
// the parts directly so the result doesn't depend on the runtime timezone of
// whichever Vercel region serves the request.
export function isSaturday(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.getDay() === 6;
}

// True iff a booking starting at `startTime` (e.g. "6:00 PM") for
// `hoursRequested` hours finishes by 10 PM (22:00). The booking page enforces
// this at submit time and the API repeats the check so a hand-crafted POST
// can't slip past.
export function endsBy10PM(startTime, hoursRequested) {
  if (!startTime || !hoursRequested) return true;

  const [time, period] = String(startTime).split(' ');
  if (!time || !period) return false;
  const [hourStr, minStr] = time.split(':');
  let startHour = parseInt(hourStr, 10);
  const startMin = parseInt(minStr, 10) || 0;
  if (Number.isNaN(startHour)) return false;

  if (period === 'PM' && startHour !== 12) startHour += 12;
  else if (period === 'AM' && startHour === 12) startHour = 0;

  const startMinutes = startHour * 60 + startMin;
  const durationMinutes = parseFloat(hoursRequested) * 60;
  if (Number.isNaN(durationMinutes)) return false;
  const endMinutes = startMinutes + durationMinutes;

  const tenPMMinutes = 22 * 60;
  return endMinutes <= tenPMMinutes;
}

// Compute the totals for one or more single-event bookings sharing a contact.
// Mirrors the production rules:
//   * $95/hr base, $200/hr Saturdays (delta charged on top of base hours).
//   * 2-hour minimum per booking unless the renter is recurring.
//   * Setup or teardown help is $50 each, per booking.
//   * First-event renters with >=40 attendees: facility-host supervision at
//     $30/hr capped at 4 hrs.
//   * Otherwise (first-event <40 attendees, or returning renter who opted in):
//     $35 on-site assistance, billed once per submission.
//   * Promo discount applies to the pre-discount subtotal; minHours is enforced.
//   * Card adds a 3% surcharge; ACH does not.
//
// `clientPromoCode` is whatever the renter typed; we re-validate here rather
// than trusting the client. Returns the same shape the route used to build
// directly so the response payload is unchanged.
export function calculateAccuratePricing(bookings, contactInfo, clientPromoCode = '') {
  let totalHours = 0;
  let totalBookings = 0;
  let saturdayCharges = 0;
  let setupTeardownFees = 0;
  let onsiteAssistanceFee = 0;
  let eventSupervisionFee = 0;
  let eventSupervisionHours = 0;

  bookings.forEach((booking) => {
    let hours = parseFloat(booking.hoursRequested) || 0;
    const isSat = isSaturday(booking.selectedDate);

    if (!contactInfo.isRecurring && hours < 2) {
      hours = 2; // 2-hour minimum on single events
    }

    if (isSat) {
      saturdayCharges += hours * (SATURDAY_RATE - HOURLY_RATE);
    }

    if (booking.needsSetupHelp) setupTeardownFees += SETUP_TEARDOWN_FEE;
    if (booking.needsTeardownHelp) setupTeardownFees += SETUP_TEARDOWN_FEE;

    const attendees = parseInt(booking.expectedAttendees, 10) || 0;
    if (contactInfo.isFirstEvent === true && attendees >= EVENT_SUPERVISION_GROUP_THRESHOLD) {
      const supervisedHours = Math.min(hours, EVENT_SUPERVISION_MAX_HOURS);
      eventSupervisionFee += supervisedHours * EVENT_SUPERVISION_RATE;
      eventSupervisionHours += supervisedHours;
    }

    totalHours += hours;
    totalBookings++;
  });

  // On-site assistance is mutually exclusive with the facility host. Either
  // (a) the renter is first-time AND no supervision was triggered (under
  // threshold), so they need on-site help, or (b) returning renter opted in.
  if (eventSupervisionFee === 0 && (contactInfo.isFirstEvent === true || contactInfo.wantsOnsiteAssistance)) {
    onsiteAssistanceFee = ON_SITE_ASSISTANCE_FEE;
  }

  const baseAmount = totalHours * HOURLY_RATE;
  const preDiscountSubtotal =
    baseAmount + saturdayCharges + setupTeardownFees + onsiteAssistanceFee + eventSupervisionFee;

  let promoDiscount = 0;
  let promoDescription = '';
  let validatedPromoCode = '';

  if (clientPromoCode && VALID_PROMO_CODES[clientPromoCode]) {
    const promoData = VALID_PROMO_CODES[clientPromoCode];
    if (promoData.minHours && totalHours < promoData.minHours) {
      // Silently ignored: the client surfaces an error already.
    } else {
      promoDiscount = Math.round(preDiscountSubtotal * promoData.discount);
      promoDescription = promoData.description;
      validatedPromoCode = clientPromoCode;
    }
  }

  const subtotal = preDiscountSubtotal - promoDiscount;
  const stripeFee = contactInfo.paymentMethod === 'card'
    ? Math.round(subtotal * (STRIPE_FEE_PERCENTAGE / 100))
    : 0;
  const total = subtotal + stripeFee;

  return {
    totalHours,
    totalBookings,
    hourlyRate: HOURLY_RATE,
    baseAmount,
    saturdayCharges,
    setupTeardownFees,
    onsiteAssistanceFee,
    eventSupervisionFee,
    eventSupervisionHours,
    isFirstEvent: contactInfo.isFirstEvent,
    wantsOnsiteAssistance: contactInfo.wantsOnsiteAssistance,
    preDiscountSubtotal,
    promoCode: validatedPromoCode,
    promoDiscount,
    promoDescription,
    subtotal,
    stripeFee,
    total,
    paymentMethod: contactInfo.paymentMethod,
  };
}

// Detect overlapping recurring slots that share a day-of-week. Two slots
// overlap when their [start, start+duration) intervals intersect on the same
// weekday — billing the renter twice for the same hour would otherwise be
// possible since each slot contributes hours independently to the monthly
// invoice. Returns an array of human-readable conflict strings (empty = OK).
export function findRecurringSlotConflicts(slots) {
  if (!Array.isArray(slots) || slots.length < 2) return [];

  const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const toMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [time, period] = String(timeStr).split(' ');
    if (!time || !period) return null;
    const [h, m] = time.split(':').map(Number);
    let hour = h;
    if (period === 'PM' && hour !== 12) hour += 12;
    else if (period === 'AM' && hour === 12) hour = 0;
    if (Number.isNaN(hour)) return null;
    return hour * 60 + (Number.isNaN(m) ? 0 : m);
  };

  const conflicts = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (Number(a.dayOfWeek) !== Number(b.dayOfWeek)) continue;

      // Different cadences (weekly vs biweekly etc.) can co-exist on the same
      // weekday only if their time windows don't intersect — the cadence
      // doesn't matter when they do, because eventually both fall on the same
      // calendar date and the hours stack.
      const aStart = toMinutes(a.startTime);
      const bStart = toMinutes(b.startTime);
      if (aStart == null || bStart == null) continue;
      const aEnd = aStart + (Number(a.durationHours) || 0) * 60;
      const bEnd = bStart + (Number(b.durationHours) || 0) * 60;

      const overlap = aStart < bEnd && bStart < aEnd;
      if (overlap) {
        const day = DAY_LABELS[Number(a.dayOfWeek)] || 'Day';
        conflicts.push(
          `Slots ${i + 1} and ${j + 1} overlap on ${day} (${a.startTime} for ${a.durationHours}h vs. ${b.startTime} for ${b.durationHours}h)`
        );
      }
    }
  }
  return conflicts;
}
