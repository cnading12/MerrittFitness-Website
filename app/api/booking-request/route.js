// app/api/booking-request/route.js
// FIXED VERSION - Eliminates duplicate calendar event creation

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  isSaturday,
  endsBy10PM,
  calculateAccuratePricing,
  findRecurringSlotConflicts,
} from '../../lib/booking-pricing.js';
// NOTE: Calendar events are now created in the Stripe webhook after payment completion
// import { createCalendarEvent } from '../../lib/calendar.js';
// NOTE: Confirmation emails are now sent in the Stripe webhook after payment completion
// import { sendConfirmationEmails } from '../../lib/email.js';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// UPDATED: Enhanced validation schema with setup/teardown and home address
const IndividualBookingSchema = z.object({
  id: z.number(),
  eventName: z.string()
    .min(1, 'Event name is required')
    .max(100, 'Event name too long'),

  eventType: z.enum([
    'yoga-class', 'meditation', 'fitness', 'martial-arts', 'dance',
    'workshop', 'therapy', 'private-event', 'other'
  ]),

  selectedDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine(date => {
      const bookingDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return bookingDate >= today;
    }, 'Booking date cannot be in the past'),

  selectedTime: z.string()
    .regex(/^\d{1,2}:\d{2} (AM|PM)$/, 'Invalid time format'),

  hoursRequested: z.coerce.number()
    .min(0.5, 'Minimum 0.5 hours')
    .max(16, 'Maximum 16 hours per booking'),

  specialRequests: z.string()
    .max(500, 'Special requests too long')
    .optional()
    .default(''),

  needsSetupHelp: z.boolean().default(false),
  needsTeardownHelp: z.boolean().default(false),

  // Expected attendee count — used server-side to determine whether first-time
  // on-site event supervision ($30/hr, 4hr cap) should be applied.
  expectedAttendees: z.coerce.number()
    .int('Attendee count must be a whole number')
    .min(1, 'At least one attendee is required')
    .max(130, 'Venue capacity is 130 attendees')
});

const ContactInfoSchema = z.object({
  contactName: z.string()
    .min(1, 'Contact name is required')
    .max(50, 'Contact name too long'),

  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase(),

  phone: z.string()
    .min(10, 'Please enter a valid phone number')
    .max(20, 'Phone number too long'),

  homeAddress: z.string()
    .min(10, 'Please enter a complete address')
    .max(200, 'Address too long'),

  businessName: z.string()
    .max(100, 'Business name too long')
    .optional()
    .default(''),

  websiteUrl: z.string()
    .max(200, 'URL too long')
    .optional()
    .default(''),

  isRecurring: z.boolean().default(false),
  recurringDetails: z.string().optional().default(''),
  // 'card' for single events (only method supported for one-time checkout).
  // 'ach' is accepted on recurring applications — monthly auto-debit runs
  // through Stripe ACH.
  paymentMethod: z.enum(['card', 'ach']).default('card'),
  isFirstEvent: z.boolean().nullable().optional(), // Required for single events; ignored for recurring
  wantsOnsiteAssistance: z.boolean().default(false) // Optional: Add on-site assistance if not first event
});

const PricingSchema = z.object({
  totalHours: z.number(),
  totalBookings: z.number(),
  baseAmount: z.number(),
  saturdayCharges: z.number().optional().default(0),
  setupTeardownFees: z.number().optional().default(0),
  onsiteAssistanceFee: z.number().optional().default(0),
  eventSupervisionFee: z.number().optional().default(0),
  eventSupervisionHours: z.number().optional().default(0),
  isFirstEvent: z.boolean().nullable().optional(),
  wantsOnsiteAssistance: z.boolean().optional().default(false),
  promoCode: z.string().optional().default(''),
  promoDiscount: z.number().optional().default(0),
  promoDescription: z.string().optional().default(''),
  preDiscountSubtotal: z.number().optional(),
  subtotal: z.number(),
  stripeFee: z.number().optional().default(0),
  total: z.number()
});

// Required government-issued ID photo. Stored on each booking record and
// attached to the manager notification email sent after successful payment.
const ID_PHOTO_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const IdPhotoSchema = z.object({
  dataUrl: z.string()
    .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, 'ID photo must be a base64-encoded image')
    .refine(val => val.length < Math.ceil(ID_PHOTO_MAX_BYTES * 4 / 3) + 100, 'ID photo must be smaller than 8 MB'),
  name: z.string().min(1).max(255),
  type: z.string().regex(/^image\//, 'ID photo must be an image'),
  size: z.number().int().min(1).max(ID_PHOTO_MAX_BYTES, 'ID photo must be smaller than 8 MB')
});

const MultipleBookingSchema = z.object({
  applicationType: z.literal('single').optional(),
  bookings: z.array(IndividualBookingSchema)
    .min(1, 'At least one booking required')
    .max(10, 'Maximum 10 bookings allowed'),
  contactInfo: ContactInfoSchema,
  pricing: PricingSchema,
  idPhoto: IdPhotoSchema
});

// Recurring-series application. One row per weekday/time/frequency slot. All
// slots share the same renter, series name, and event type. Pricing is
// calculated per-month from the configured slots; the first month is prorated.
const RecurringSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{1,2}:\d{2} (AM|PM)$/, 'Invalid time format'),
  durationHours: z.coerce.number().min(0.5, 'Minimum 0.5 hours').max(12, 'Maximum 12 hours per slot'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly'])
});

const RecurringScheduleSchema = z.object({
  eventName: z.string().min(1, 'Series name is required').max(100, 'Series name too long'),
  eventType: z.enum([
    'yoga-class', 'meditation', 'fitness', 'martial-arts', 'dance',
    'workshop', 'therapy', 'private-event', 'other'
  ]),
  expectedAttendees: z.coerce.number().int().min(1).max(130),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  paymentPreference: z.enum(['ach', 'card']).default('ach'),
  specialRequests: z.string().max(500).optional().default(''),
  slots: z.array(RecurringSlotSchema).min(1, 'At least one slot required').max(20, 'Too many slots')
});

const RecurringBookingSchema = z.object({
  applicationType: z.literal('recurring'),
  contactInfo: ContactInfoSchema,
  recurringSchedule: RecurringScheduleSchema,
  pricing: z.object({
    weeklyHours: z.number(),
    monthlyMinHours: z.number(),
    monthlyMaxHours: z.number(),
    monthlyMinCharge: z.number(),
    monthlyMaxCharge: z.number(),
    firstMonthHours: z.number(),
    firstMonthCharge: z.number(),
    firstMonthFee: z.number().optional().default(0),
    firstMonthTotal: z.number(),
    hourlyRate: z.number(),
    paymentPreference: z.enum(['ach', 'card'])
  }),
  idPhoto: IdPhotoSchema
});

// Pricing helpers (calculateAccuratePricing, isSaturday, endsBy10PM,
// findRecurringSlotConflicts) live in app/lib/booking-pricing.js so they can
// be unit-tested without spinning up the request layer.

// Create booking in database with enhanced fields
async function createBooking(bookingData) {
  try {
    // Build insert record. The optional columns `expected_attendees` and
    // `event_supervision_fee` are added to the payload but retried without them
    // if the DB has not yet been migrated (see migrations/*.sql).
    const baseRecord = {
      id: bookingData.id,
      master_booking_id: bookingData.masterBookingId,
      event_name: bookingData.eventName,
      event_type: bookingData.eventType,
      event_date: bookingData.selectedDate,
      event_time: bookingData.selectedTime,
      hours_requested: parseFloat(bookingData.hoursRequested),
      contact_name: bookingData.contactName,
      email: bookingData.email,
      phone: bookingData.phone || '',
      home_address: bookingData.homeAddress,
      business_name: bookingData.businessName || '',
      website_url: bookingData.websiteUrl || '',
      special_requests: bookingData.specialRequests || '',
      needs_setup_help: bookingData.needsSetupHelp || false,
      needs_teardown_help: bookingData.needsTeardownHelp || false,
      payment_method: bookingData.paymentMethod,
      total_amount: parseFloat(bookingData.total),
      subtotal: parseFloat(bookingData.subtotal),
      stripe_fee: parseFloat(bookingData.stripeFee || 0),
      saturday_charges: parseFloat(bookingData.saturdayCharges || 0),
      setup_teardown_fees: parseFloat(bookingData.setupTeardownFees || 0),
      onsite_assistance_fee: parseFloat(bookingData.onsiteAssistanceFee || 0),
      is_first_event: bookingData.isFirstEvent,
      wants_onsite_assistance: bookingData.wantsOnsiteAssistance || false,
      promo_code: bookingData.promoCode || '',
      promo_discount: parseFloat(bookingData.promoDiscount || 0),
      status: bookingData.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const recordWithNewColumns = {
      ...baseRecord,
      expected_attendees: parseInt(bookingData.expectedAttendees, 10) || 0,
      event_supervision_fee: parseFloat(bookingData.eventSupervisionFee || 0),
      event_supervision_hours: parseFloat(bookingData.eventSupervisionHours || 0)
    };

    // ID photo columns are applied on top of the supervision columns. They are
    // populated from IdPhotoSchema; the dataUrl holds the full "data:image/...;base64,..."
    // string which the email layer splits apart to attach to manager notifications.
    const recordWithIdPhoto = {
      ...recordWithNewColumns,
      id_photo_data: bookingData.idPhotoDataUrl || null,
      id_photo_name: bookingData.idPhotoName || null,
      id_photo_type: bookingData.idPhotoType || null
    };

    let { data, error } = await supabase
      .from('bookings')
      .insert([recordWithIdPhoto])
      .select();

    // Staged fallbacks so bookings don't fail if the DB hasn't been migrated yet.
    // PGRST204 = column not found in Supabase.
    const isMissingColumnError = (err) =>
      err && (err.code === 'PGRST204' || /column .* does not exist/i.test(err.message || ''));

    if (isMissingColumnError(error)) {
      console.warn('⚠️ ID photo columns missing from DB — falling back. Run the pending migration. Error:', error.message);
      ({ data, error } = await supabase
        .from('bookings')
        .insert([recordWithNewColumns])
        .select());
    }

    if (isMissingColumnError(error)) {
      console.warn('⚠️ New supervision columns missing from DB — falling back. Run the pending migration. Error:', error.message);
      ({ data, error } = await supabase
        .from('bookings')
        .insert([baseRecord])
        .select());
    }

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    return data[0];
  } catch (error) {
    console.error('❌ Create booking error:', error);
    throw error;
  }
}

// Serialize a recurring schedule into a single booking row. The `bookings`
// table stays single-row-per-application: the recurring_pattern column stores
// the JSON spec so downstream tooling (scheduler, monthly invoicer) can rebuild
// the occurrence list. ACH setup + Stripe subscription creation is handled
// separately on the payment page (not in this request).
async function createRecurringApplication(validatedData) {
  const { contactInfo, recurringSchedule, pricing, idPhoto } = validatedData;
  const applicationId = uuidv4();
  const masterBookingId = applicationId; // Recurring series = one master record.

  const record = {
    id: applicationId,
    master_booking_id: masterBookingId,
    event_name: recurringSchedule.eventName,
    event_type: recurringSchedule.eventType,
    // The start date becomes the first billable date; subsequent occurrences
    // are derived from recurring_pattern when monthly invoicing runs.
    event_date: recurringSchedule.startDate,
    event_time: recurringSchedule.slots[0]?.startTime || '',
    hours_requested: pricing.weeklyHours,
    contact_name: contactInfo.contactName,
    email: contactInfo.email,
    phone: contactInfo.phone || '',
    home_address: contactInfo.homeAddress,
    business_name: contactInfo.businessName || '',
    website_url: contactInfo.websiteUrl || '',
    special_requests: recurringSchedule.specialRequests || '',
    needs_setup_help: false,
    needs_teardown_help: false,
    payment_method: recurringSchedule.paymentPreference,
    // First-month prorated charge is due on the 1st after start date.
    total_amount: pricing.firstMonthTotal,
    subtotal: pricing.firstMonthCharge,
    stripe_fee: pricing.firstMonthFee || 0,
    saturday_charges: 0,
    setup_teardown_fees: 0,
    onsite_assistance_fee: 0,
    is_first_event: null,
    wants_onsite_assistance: false,
    promo_code: '',
    promo_discount: 0,
    status: 'pending_recurring_setup',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const withExtendedColumns = {
    ...record,
    expected_attendees: recurringSchedule.expectedAttendees,
    event_supervision_fee: 0,
    event_supervision_hours: 0,
    id_photo_data: idPhoto.dataUrl,
    id_photo_name: idPhoto.name,
    id_photo_type: idPhoto.type,
    // Persist the full recurring schedule so the monthly invoicer can
    // regenerate occurrences and charge the correct hours each month.
    recurring_details: JSON.stringify({
      paymentPreference: recurringSchedule.paymentPreference,
      startDate: recurringSchedule.startDate,
      endDate: recurringSchedule.endDate || null,
      slots: recurringSchedule.slots,
      pricing: {
        monthlyMinCharge: pricing.monthlyMinCharge,
        monthlyMaxCharge: pricing.monthlyMaxCharge,
        weeklyHours: pricing.weeklyHours,
        hourlyRate: pricing.hourlyRate
      }
    })
  };

  const isMissingColumnError = (err) =>
    err && (err.code === 'PGRST204' || /column .* does not exist/i.test(err.message || ''));

  let { data, error } = await supabase
    .from('bookings')
    .insert([withExtendedColumns])
    .select();

  // Fall back through the same column-dropping cascade as single-event bookings
  // so applications still land in the DB pre-migration.
  if (isMissingColumnError(error)) {
    console.warn('⚠️ recurring_details column missing — falling back without it.');
    const { recurring_details, ...withoutRecurring } = withExtendedColumns;
    ({ data, error } = await supabase
      .from('bookings')
      .insert([withoutRecurring])
      .select());
  }
  if (isMissingColumnError(error)) {
    console.warn('⚠️ ID photo columns missing — falling back.');
    const { id_photo_data, id_photo_name, id_photo_type, recurring_details, ...trimmed } = withExtendedColumns;
    ({ data, error } = await supabase
      .from('bookings')
      .insert([trimmed])
      .select());
  }
  if (isMissingColumnError(error)) {
    console.warn('⚠️ Supervision columns missing — falling back.');
    ({ data, error } = await supabase.from('bookings').insert([record]).select());
  }

  if (error) {
    console.error('❌ Recurring application insert failed:', error);
    throw error;
  }
  return data[0];
}

async function bookingHandler(request) {
  try {
    const rawData = await request.json();
    console.log('📝 Booking request received');

    // Route to the recurring path when the client submits an application of
    // type "recurring". Recurring applications have a materially different
    // payload shape (slots + schedule vs. concrete dates).
    if (rawData?.applicationType === 'recurring') {
      let validatedRecurring;
      try {
        validatedRecurring = RecurringBookingSchema.parse(rawData);
      } catch (validationError) {
        console.error('❌ Recurring validation failed:', validationError.errors);
        return Response.json({
          success: false,
          error: 'Validation failed',
          details: validationError.errors,
          code: 'VALIDATION_ERROR'
        }, { status: 400 });
      }

      // Reject overlapping slots that share a day-of-week. The hours from
      // each slot stack into the monthly invoice, so without this check a
      // renter could double-bill themselves (or hide an overlap from staff).
      const slotConflicts = findRecurringSlotConflicts(validatedRecurring.recurringSchedule.slots);
      if (slotConflicts.length > 0) {
        return Response.json({
          success: false,
          error: 'Recurring slots overlap',
          details: slotConflicts,
          code: 'RECURRING_SLOT_CONFLICT'
        }, { status: 400 });
      }

      try {
        const created = await createRecurringApplication(validatedRecurring);
        console.log('✅ Recurring application created:', {
          id: created.id,
          paymentPreference: validatedRecurring.recurringSchedule.paymentPreference,
          slots: validatedRecurring.recurringSchedule.slots.length
        });
        return Response.json({
          success: true,
          id: created.id,
          masterBookingId: created.master_booking_id,
          applicationType: 'recurring',
          paymentPreference: validatedRecurring.recurringSchedule.paymentPreference,
          firstMonthTotal: validatedRecurring.pricing.firstMonthTotal,
          message: 'Recurring application created. Proceed to set up auto-pay.'
        });
      } catch (error) {
        console.error('❌ Recurring application creation error:', error);
        return Response.json({
          success: false,
          error: 'Failed to create recurring application',
          details: error.message,
          code: 'RECURRING_CREATION_FAILED'
        }, { status: 500 });
      }
    }

    // Validate input data
    let validatedData;
    try {
      validatedData = MultipleBookingSchema.parse(rawData);
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError.errors);
      return Response.json({
        success: false,
        error: 'Validation failed',
        details: validationError.errors,
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }

    console.log('✅ Data validated successfully');

    // Validate that all bookings end by 10 PM
    for (const booking of validatedData.bookings) {
      if (!endsBy10PM(booking.selectedTime, booking.hoursRequested)) {
        console.error('❌ Booking extends past 10 PM:', booking.eventName);
        return Response.json({
          success: false,
          error: 'All events must end by 10 PM',
          details: `The booking "${booking.eventName}" starting at ${booking.selectedTime} for ${booking.hoursRequested} hours would extend past 10 PM. Please select an earlier start time or shorter duration.`,
          code: 'END_TIME_VIOLATION'
        }, { status: 400 });
      }
    }

    // Recalculate pricing with promo code validation
    const clientPromoCode = validatedData.pricing?.promoCode || '';
    const accuratePricing = calculateAccuratePricing(
      validatedData.bookings,
      validatedData.contactInfo,
      clientPromoCode
    );

    const masterBookingId = uuidv4();
    const createdBookings = [];
    let bookingErrors = [];

    // Create ALL bookings in database FIRST
    for (const booking of validatedData.bookings) {
      try {
        const individualBookingId = uuidv4();

        const bookingData = {
          id: individualBookingId,
          masterBookingId: masterBookingId,
          eventName: booking.eventName,
          eventType: booking.eventType,
          selectedDate: booking.selectedDate,
          selectedTime: booking.selectedTime,
          hoursRequested: booking.hoursRequested,
          specialRequests: booking.specialRequests,
          needsSetupHelp: booking.needsSetupHelp,
          needsTeardownHelp: booking.needsTeardownHelp,
          expectedAttendees: booking.expectedAttendees,
          contactName: validatedData.contactInfo.contactName,
          email: validatedData.contactInfo.email,
          phone: validatedData.contactInfo.phone,
          homeAddress: validatedData.contactInfo.homeAddress,
          businessName: validatedData.contactInfo.businessName,
          websiteUrl: validatedData.contactInfo.websiteUrl,
          paymentMethod: validatedData.contactInfo.paymentMethod,
          isFirstEvent: validatedData.contactInfo.isFirstEvent,
          wantsOnsiteAssistance: validatedData.contactInfo.wantsOnsiteAssistance,
          total: accuratePricing.total,
          subtotal: accuratePricing.subtotal,
          stripeFee: accuratePricing.stripeFee,
          saturdayCharges: accuratePricing.saturdayCharges,
          setupTeardownFees: accuratePricing.setupTeardownFees,
          onsiteAssistanceFee: accuratePricing.onsiteAssistanceFee,
          eventSupervisionFee: accuratePricing.eventSupervisionFee,
          eventSupervisionHours: accuratePricing.eventSupervisionHours,
          promoCode: accuratePricing.promoCode,
          promoDiscount: accuratePricing.promoDiscount,
          idPhotoDataUrl: validatedData.idPhoto.dataUrl,
          idPhotoName: validatedData.idPhoto.name,
          idPhotoType: validatedData.idPhoto.type,
          status: 'pending_payment' // All bookings require payment
        };

        // Create booking in database
        const createdBooking = await createBooking(bookingData);
        createdBookings.push(createdBooking);

        console.log('✅ Booking created in DB:', {
          id: individualBookingId,
          status: createdBooking.status
        });

        // NOTE: Calendar events are created AFTER payment completion via Stripe webhook
        // This ensures events only appear on the calendar for paid bookings

      } catch (error) {
        console.error('❌ Failed to create individual booking:', error);
        bookingErrors.push({
          booking: booking.eventName,
          error: error.message
        });
      }
    }

    if (createdBookings.length === 0) {
      return Response.json({
        success: false,
        error: 'Failed to create any bookings',
        details: bookingErrors,
        code: 'BOOKING_CREATION_FAILED'
      }, { status: 500 });
    }

    // Note: Confirmation emails are sent after successful payment via Stripe webhook

    // Prepare success response
    const response = {
      success: true,
      id: createdBookings[0].id,
      masterBookingId: masterBookingId,
      bookings: createdBookings.map(b => ({
        id: b.id,
        eventName: b.event_name,
        eventDate: b.event_date,
        eventTime: b.event_time,
        status: b.status
      })),
      totalBookings: createdBookings.length,
      paymentMethod: validatedData.contactInfo.paymentMethod,
      totalAmount: accuratePricing.total,
      message: 'Bookings created successfully. Proceed to payment.'
    };

    if (bookingErrors.length > 0) {
      response.warnings = {
        bookingErrors: bookingErrors,
        message: `${bookingErrors.length} bookings failed to create`
      };
    }

    console.log('🎉 Bookings created successfully:', {
      masterBookingId: masterBookingId,
      successfulBookings: createdBookings.length,
      totalAmount: accuratePricing.total,
      paymentMethod: validatedData.contactInfo.paymentMethod
    });

    return Response.json(response);

  } catch (error) {
    console.error('❌ Booking creation error:', error);
    return Response.json({
      success: false,
      error: 'Failed to create bookings',
      details: error.message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Export the handler
export async function POST(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const response = await bookingHandler(request);

    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });

  } catch (error) {
    console.error('Handler error:', error);
    return Response.json(
      {
        success: false,
        error: 'Server error',
        details: error.message
      },
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}