// app/api/booking-request/route.js
// FIXED VERSION - Eliminates duplicate calendar event creation

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
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
    .max(12, 'Maximum 12 hours per booking'),

  specialRequests: z.string()
    .max(500, 'Special requests too long')
    .optional()
    .default(''),

  needsSetupHelp: z.boolean().default(false),
  needsTeardownHelp: z.boolean().default(false)
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
    .max(20, 'Phone number too long')
    .optional()
    .default(''),

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
  paymentMethod: z.literal('card').default('card'), // Only card payments accepted
  isFirstEvent: z.boolean().nullable(), // Required: Is this their first event?
  wantsOnsiteAssistance: z.boolean().default(false) // Optional: Add on-site assistance if not first event
});

const PricingSchema = z.object({
  totalHours: z.number(),
  totalBookings: z.number(),
  baseAmount: z.number(),
  saturdayCharges: z.number().optional().default(0),
  setupTeardownFees: z.number().optional().default(0),
  onsiteAssistanceFee: z.number().optional().default(0),
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

// Valid promo codes configuration (must match frontend)
const VALID_PROMO_CODES = {
  'MerrittMagic': { discount: 0.20, description: 'Partnership Discount (20% off)' }
};

const MultipleBookingSchema = z.object({
  bookings: z.array(IndividualBookingSchema)
    .min(1, 'At least one booking required')
    .max(10, 'Maximum 10 bookings allowed'),
  contactInfo: ContactInfoSchema,
  pricing: PricingSchema
});

// Helper function to check if date is Saturday (timezone-safe)
function isSaturday(dateString) {
  // Parse date string directly to avoid timezone issues
  // dateString format: "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed in JS
  return date.getDay() === 6;
}

// Helper function to check if booking ends by 10 PM
function endsBy10PM(startTime, hoursRequested) {
  if (!startTime || !hoursRequested) return true;

  // Parse start time (format: "8:00 PM")
  const [time, period] = startTime.split(' ');
  const [hourStr, minStr] = time.split(':');
  let startHour = parseInt(hourStr, 10);
  const startMin = parseInt(minStr, 10) || 0;

  // Convert to 24-hour format
  if (period === 'PM' && startHour !== 12) {
    startHour += 12;
  } else if (period === 'AM' && startHour === 12) {
    startHour = 0;
  }

  // Calculate end time in minutes from midnight
  const startMinutes = startHour * 60 + startMin;
  const durationMinutes = parseFloat(hoursRequested) * 60;
  const endMinutes = startMinutes + durationMinutes;

  // 10 PM = 22:00 = 1320 minutes from midnight
  const tenPMMinutes = 22 * 60;

  return endMinutes <= tenPMMinutes;
}


// Calculate accurate pricing with Saturday rates, fees, and promo codes
function calculateAccuratePricing(bookings, contactInfo, clientPromoCode = '') {
  const HOURLY_RATE = 95;
  const SATURDAY_RATE = 200;
  const SETUP_TEARDOWN_FEE = 50;
  const ON_SITE_ASSISTANCE_FEE = 35;
  const STRIPE_FEE_PERCENTAGE = 3;

  let totalHours = 0;
  let totalBookings = 0;
  let saturdayCharges = 0;
  let setupTeardownFees = 0;
  let onsiteAssistanceFee = 0;

  bookings.forEach(booking => {
    let hours = parseFloat(booking.hoursRequested) || 0;
    const isSat = isSaturday(booking.selectedDate);

    // Apply minimums
    if (!contactInfo.isRecurring && hours < 2) {
      hours = 2; // Single event: 2-hour minimum
    }

    // Calculate Saturday charges - ALL Saturday events are $200/hour
    if (isSat) {
      saturdayCharges += hours * (SATURDAY_RATE - HOURLY_RATE);
    }

    // Calculate setup/teardown fees
    if (booking.needsSetupHelp) {
      setupTeardownFees += SETUP_TEARDOWN_FEE;
    }
    if (booking.needsTeardownHelp) {
      setupTeardownFees += SETUP_TEARDOWN_FEE;
    }

    totalHours += hours;
    totalBookings++;
  });

  // Calculate on-site assistance fee (first event = required, otherwise optional)
  if (contactInfo.isFirstEvent === true || contactInfo.wantsOnsiteAssistance) {
    onsiteAssistanceFee = ON_SITE_ASSISTANCE_FEE;
  }

  const baseAmount = totalHours * HOURLY_RATE;
  const preDiscountSubtotal = baseAmount + saturdayCharges + setupTeardownFees + onsiteAssistanceFee;

  // Apply promo code discount (server-side validation)
  let promoDiscount = 0;
  let promoDescription = '';
  let validatedPromoCode = '';

  if (clientPromoCode && VALID_PROMO_CODES[clientPromoCode]) {
    const promoData = VALID_PROMO_CODES[clientPromoCode];
    promoDiscount = Math.round(preDiscountSubtotal * promoData.discount);
    promoDescription = promoData.description;
    validatedPromoCode = clientPromoCode;
    console.log(`✅ Promo code "${clientPromoCode}" applied: ${promoData.description} (-$${promoDiscount})`);
  } else if (clientPromoCode) {
    console.log(`⚠️ Invalid promo code attempted: "${clientPromoCode}"`);
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
    isFirstEvent: contactInfo.isFirstEvent,
    wantsOnsiteAssistance: contactInfo.wantsOnsiteAssistance,
    preDiscountSubtotal,
    promoCode: validatedPromoCode,
    promoDiscount,
    promoDescription,
    subtotal,
    stripeFee,
    total,
    paymentMethod: contactInfo.paymentMethod
  };
}

// Create booking in database with enhanced fields
async function createBooking(bookingData) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
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
        }
      ])
      .select();

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

async function bookingHandler(request) {
  try {
    const rawData = await request.json();
    console.log('📝 Booking request received');

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
          promoCode: accuratePricing.promoCode,
          promoDiscount: accuratePricing.promoDiscount,
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