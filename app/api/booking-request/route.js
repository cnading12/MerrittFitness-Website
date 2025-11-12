// app/api/booking-request/route.js
// FIXED VERSION - Eliminates duplicate calendar event creation

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createCalendarEvent } from '../../lib/calendar.js';
import { sendConfirmationEmails } from '../../lib/email.js';

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
  paymentMethod: z.enum(['card', 'pay-later']).default('card')
});

const PricingSchema = z.object({
  totalHours: z.number(),
  totalBookings: z.number(),
  baseAmount: z.number(),
  saturdayCharges: z.number().optional().default(0),
  setupTeardownFees: z.number().optional().default(0),
  subtotal: z.number(),
  stripeFee: z.number().optional().default(0),
  total: z.number()
});

const MultipleBookingSchema = z.object({
  bookings: z.array(IndividualBookingSchema)
    .min(1, 'At least one booking required')
    .max(10, 'Maximum 10 bookings allowed'),
  contactInfo: ContactInfoSchema,
  pricing: PricingSchema
});

// Helper function to check if date is Saturday
function isSaturday(dateString) {
  const date = new Date(dateString);
  return date.getDay() === 6;
}

// Helper function to check if time is after 4 PM
function isAfter4PM(timeString) {
  const [time, period] = timeString.split(' ');
  const [hours] = time.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) {
    return hours >= 4;
  }
  return false;
}

// Calculate accurate pricing with Saturday rates and fees
function calculateAccuratePricing(bookings, contactInfo) {
  const HOURLY_RATE = 95;
  const SATURDAY_EVENING_SURCHARGE = 35;
  const SATURDAY_ALL_DAY_RATE = 200;
  const SETUP_TEARDOWN_FEE = 50;
  const STRIPE_FEE_PERCENTAGE = 3;

  let totalHours = 0;
  let totalBookings = 0;
  let saturdayCharges = 0;
  let setupTeardownFees = 0;

  bookings.forEach(booking => {
    let hours = parseFloat(booking.hoursRequested) || 0;
    const isSat = isSaturday(booking.selectedDate);
    const afterFour = isAfter4PM(booking.selectedTime);

    // Apply minimums
    if (!contactInfo.isRecurring && hours < 4) {
      hours = 4; // Single event: 4-hour minimum
    }

    // Calculate Saturday charges
    if (isSat) {
      if (afterFour) {
        // Saturday evening: base + surcharge
        saturdayCharges += hours * SATURDAY_EVENING_SURCHARGE;
      } else if (hours >= 8) {
        // Saturday all-day: special rate (replaces base)
        saturdayCharges += hours * (SATURDAY_ALL_DAY_RATE - HOURLY_RATE);
      }
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

  const baseAmount = totalHours * HOURLY_RATE;
  const subtotal = baseAmount + saturdayCharges + setupTeardownFees;
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

    // Recalculate pricing
    const accuratePricing = calculateAccuratePricing(
      validatedData.bookings,
      validatedData.contactInfo
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
          total: accuratePricing.total,
          subtotal: accuratePricing.subtotal,
          stripeFee: accuratePricing.stripeFee,
          saturdayCharges: accuratePricing.saturdayCharges,
          setupTeardownFees: accuratePricing.setupTeardownFees,
          status: validatedData.contactInfo.paymentMethod === 'pay-later'
            ? 'confirmed_pay_later'
            : 'pending_payment'
        };

        // Create booking in database
        const createdBooking = await createBooking(bookingData);
        createdBookings.push(createdBooking);

        console.log('✅ Booking created in DB:', {
          id: individualBookingId,
          status: createdBooking.status
        });

        // FIXED: Create calendar event ONCE for ALL bookings (both card and pay-later)
        // This replaces the duplicate calendar creation blocks
        try {
          console.log('📅 Creating calendar event for booking:', individualBookingId);
          const calendarEvent = await createCalendarEvent(createdBooking);

          if (calendarEvent && calendarEvent.id) {
            await supabase
              .from('bookings')
              .update({
                calendar_event_id: calendarEvent.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', individualBookingId);

            console.log('✅ Calendar event created and linked:', calendarEvent.id);
          }
        } catch (calendarError) {
          console.warn('⚠️ Calendar event creation failed:', calendarError.message);
          // Don't fail the entire booking if calendar creation fails
          // The booking is still valid, just without a calendar entry
        }

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

    // Send confirmation emails for pay-later bookings
    if (validatedData.contactInfo.paymentMethod === 'pay-later') {
      for (const booking of createdBookings) {
        try {
          await sendConfirmationEmails(booking);
          console.log('✅ Confirmation emails sent for booking:', booking.id);
        } catch (emailError) {
          console.warn('⚠️ Email sending failed:', booking.id, emailError.message);
        }
      }
    }

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
      message: validatedData.contactInfo.paymentMethod === 'pay-later'
        ? 'Bookings confirmed! Calendar updated. We\'ll contact you about payment arrangements.'
        : 'Bookings created successfully. Proceed to payment.'
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