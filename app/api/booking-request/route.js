// app/api/booking-request/route.js
// FIXED VERSION - Proper booking creation with calendar integration

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

// FIXED: Updated validation schema
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
    .default('')
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
  subtotal: z.number(),
  total: z.number(),
  stripeFee: z.number().optional().default(0)
});

const MultipleBookingSchema = z.object({
  bookings: z.array(IndividualBookingSchema)
    .min(1, 'At least one booking required')
    .max(10, 'Maximum 10 bookings allowed'),
  contactInfo: ContactInfoSchema,
  pricing: PricingSchema
});

// Calculate accurate pricing with fees
function calculateAccuratePricing(bookings, contactInfo) {
  const HOURLY_RATE = 95;
  const STRIPE_FEE_PERCENTAGE = 3;

  let totalHours = 0;
  let totalBookings = 0;

  bookings.forEach(booking => {
    let hours = parseFloat(booking.hoursRequested) || 0;

    // Apply minimums per booking
    const hasRecurringMultiple = contactInfo.isRecurring &&
      contactInfo.recurringDetails?.includes('multiple');

    if (!contactInfo.isRecurring && hours < 4) {
      hours = 4; // Single event: 4-hour minimum
    } else if (contactInfo.isRecurring && hasRecurringMultiple && hours < 2) {
      hours = 2; // Multiple events per week: 2-hour minimum
    }

    totalHours += hours;
    totalBookings++;
  });

  // Apply discounts
  let discount = 0;
  let savings = 0;

  if (contactInfo.isRecurring && contactInfo.recurringDetails?.includes('multiple')) {
    discount = 5; // 5% discount for multiple weekly bookings
    savings = (totalHours * HOURLY_RATE * discount) / 100;
  }

  const subtotal = totalHours * HOURLY_RATE - savings;
  const stripeFee = contactInfo.paymentMethod === 'card'
    ? Math.round(subtotal * (STRIPE_FEE_PERCENTAGE / 100))
    : 0;
  const total = subtotal + stripeFee;

  return {
    totalHours,
    totalBookings,
    hourlyRate: HOURLY_RATE,
    subtotal,
    discount,
    savings,
    stripeFee,
    total,
    paymentMethod: contactInfo.paymentMethod
  };
}

// FIXED: Create booking in database with proper field mapping
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
          business_name: bookingData.businessName || '',
          website_url: bookingData.websiteUrl || '',
          special_requests: bookingData.specialRequests || '',
          payment_method: bookingData.paymentMethod,
          total_amount: parseFloat(bookingData.total),
          subtotal: parseFloat(bookingData.subtotal),
          stripe_fee: parseFloat(bookingData.stripeFee || 0),
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

// Around line 200, in the bookingHandler function
// BEFORE creating payment intent, make sure booking exists in database

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

    // CRITICAL: Create ALL bookings in database FIRST
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
          contactName: validatedData.contactInfo.contactName,
          email: validatedData.contactInfo.email,
          phone: validatedData.contactInfo.phone,
          businessName: validatedData.contactInfo.businessName,
          websiteUrl: validatedData.contactInfo.websiteUrl,
          paymentMethod: validatedData.contactInfo.paymentMethod,
          total: accuratePricing.total,
          subtotal: accuratePricing.subtotal,
          stripeFee: accuratePricing.stripeFee,
          status: validatedData.contactInfo.paymentMethod === 'pay-later'
            ? 'confirmed_pay_later'
            : 'pending_payment'  // CRITICAL: This status for card payments
        };

        // Create booking in database
        const createdBooking = await createBooking(bookingData);
        createdBookings.push(createdBooking);

        console.log('✅ Booking created in DB:', {
          id: individualBookingId,
          status: createdBooking.status
        });

        // Create calendar event for pay-later bookings
        if (validatedData.contactInfo.paymentMethod === 'pay-later') {
          try {
            console.log('📅 Creating calendar event for pay-later booking');
            const calendarEvent = await createCalendarEvent(createdBooking);

            if (calendarEvent && calendarEvent.id) {
              await supabase
                .from('bookings')
                .update({
                  calendar_event_id: calendarEvent.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', individualBookingId);

              console.log('✅ Calendar event created:', calendarEvent.id);
            }
          } catch (calendarError) {
            console.warn('⚠️ Calendar event creation failed:', calendarError.message);
          }
        }
        // For card payments, calendar event will be created after payment success

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
      id: masterBookingId,
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
}// <-- ADDED THIS MISSING CLOSING BRACE

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