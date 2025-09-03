// app/api/booking-request/route.js
// FIXED VERSION - Handles multiple bookings with proper validation

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// FIXED: Updated validation schema to match frontend data structure
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

// Sanitization functions
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .substring(0, 1000);
}

function sanitizeBookingData(data) {
  try {
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Sanitize contact info
    if (sanitized.contactInfo) {
      Object.keys(sanitized.contactInfo).forEach(key => {
        if (typeof sanitized.contactInfo[key] === 'string') {
          sanitized.contactInfo[key] = sanitizeString(sanitized.contactInfo[key]);
        }
      });
    }
    
    // Sanitize individual bookings
    if (sanitized.bookings && Array.isArray(sanitized.bookings)) {
      sanitized.bookings = sanitized.bookings.map(booking => ({
        ...booking,
        eventName: sanitizeString(booking.eventName || ''),
        specialRequests: sanitizeString(booking.specialRequests || '')
      }));
    }
    
    return sanitized;
  } catch (error) {
    console.error('Sanitization error:', error);
    return data;
  }
}

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

// Create booking in database
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
          phone: bookingData.phone,
          business_name: bookingData.businessName,
          website_url: bookingData.websiteUrl,
          special_requests: bookingData.specialRequests,
          payment_method: bookingData.paymentMethod,
          total_amount: parseFloat(bookingData.total),
          subtotal: parseFloat(bookingData.subtotal),
          stripe_fee: parseFloat(bookingData.stripeFee || 0),
          status: bookingData.status,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('Create booking error:', error);
    throw error;
  }
}

// Send confirmation emails
async function sendConfirmationEmails(booking) {
  try {
    console.log('📧 Sending confirmation emails for booking:', booking.id);
    
    // Import email functions
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    if (!process.env.RESEND_API_KEY) {
      console.warn('No Resend API key found, skipping emails');
      return;
    }

    // Send customer confirmation
    await resend.emails.send({
      from: 'Merritt Fitness <bookings@merrittfitness.net>',
      to: [booking.email],
      replyTo: 'merrittfitnessmanager@gmail.com',
      subject: `Booking Confirmed: ${booking.event_name}`,
      html: generateConfirmationEmail(booking)
    });

    // Send manager notification
    await resend.emails.send({
      from: 'Merritt Fitness <bookings@merrittfitness.net>',
      to: ['merrittfitnessmanager@gmail.com'],
      replyTo: booking.email,
      subject: `🆕 New Booking: ${booking.event_name}`,
      html: generateManagerNotificationEmail(booking)
    });

    console.log('✅ Confirmation emails sent successfully');
  } catch (error) {
    console.warn('📧 Email sending failed:', error.message);
    // Don't fail the whole booking if emails fail
  }
}

function generateConfirmationEmail(booking) {
  const paymentMethodText = booking.payment_method === 'pay-later' 
    ? 'We\'ll contact you about payment arrangements'
    : 'Payment confirmation will follow';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #10b981; text-align: center;">🎉 Booking Confirmed!</h1>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #059669;">Event Details</h2>
        <p><strong>Event:</strong> ${booking.event_name}</p>
        <p><strong>Date:</strong> ${booking.event_date}</p>
        <p><strong>Time:</strong> ${booking.event_time}</p>
        <p><strong>Duration:</strong> ${booking.hours_requested} hours</p>
        <p><strong>Total:</strong> $${booking.total_amount}</p>
        <p><strong>Payment:</strong> ${paymentMethodText}</p>
      </div>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px;">
        <h3 style="color: #92400e;">Contact Information</h3>
        <p><strong>Name:</strong> ${booking.contact_name}</p>
        <p><strong>Email:</strong> ${booking.email}</p>
        <p><strong>Phone:</strong> ${booking.phone || 'Not provided'}</p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #6b7280;">Questions? Contact us at:</p>
        <p><strong>(720) 357-9499</strong></p>
        <p><strong>merrittfitnessmanager@gmail.com</strong></p>
      </div>
    </div>
  `;
}

function generateManagerNotificationEmail(booking) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #3b82f6;">🆕 New Booking Alert</h1>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
        <h2>Booking Details:</h2>
        <p><strong>Event:</strong> ${booking.event_name}</p>
        <p><strong>Type:</strong> ${booking.event_type}</p>
        <p><strong>Date:</strong> ${booking.event_date}</p>
        <p><strong>Time:</strong> ${booking.event_time}</p>
        <p><strong>Duration:</strong> ${booking.hours_requested} hours</p>
        <p><strong>Payment Method:</strong> ${booking.payment_method}</p>
        <p><strong>Total:</strong> $${booking.total_amount}</p>
        <p><strong>Status:</strong> ${booking.status}</p>
      </div>
      
      <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2>Customer Information:</h2>
        <p><strong>Name:</strong> ${booking.contact_name}</p>
        <p><strong>Email:</strong> ${booking.email}</p>
        <p><strong>Phone:</strong> ${booking.phone || 'Not provided'}</p>
        <p><strong>Business:</strong> ${booking.business_name || 'Not provided'}</p>
        ${booking.special_requests ? `<p><strong>Special Requests:</strong> ${booking.special_requests}</p>` : ''}
      </div>
      
      <p><strong>Booking ID:</strong> ${booking.id}</p>
    </div>
  `;
}

// Main booking handler
async function bookingHandler(request) {
  try {
    const rawData = await request.json();
    console.log('📝 Raw booking data received:', {
      hasBookings: !!rawData.bookings,
      bookingCount: rawData.bookings?.length,
      hasContactInfo: !!rawData.contactInfo,
      paymentMethod: rawData.contactInfo?.paymentMethod
    });
    
    // Sanitize input data
    const sanitizedData = sanitizeBookingData(rawData);
    
    // FIXED: Validate with detailed error logging
    let validatedData;
    try {
      validatedData = MultipleBookingSchema.parse(sanitizedData);
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError.errors || validationError.message);
      
      return Response.json({
        success: false,
        error: 'Validation failed',
        details: validationError.errors || [{ message: validationError.message }],
        code: 'VALIDATION_ERROR'
      }, { status: 400 });
    }
    
    console.log('✅ Data validated successfully');
    
    // Recalculate pricing to ensure accuracy
    const accuratePricing = calculateAccuratePricing(
      validatedData.bookings, 
      validatedData.contactInfo
    );
    
    // Create master booking ID for multiple bookings
    const masterBookingId = uuidv4();
    
    // Create individual bookings in database
    const createdBookings = [];
    let bookingErrors = [];
    
    for (const booking of validatedData.bookings) {
      try {
        const individualBookingId = uuidv4();
        
        // FIXED: Map frontend data structure to database structure
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
            : 'pending_payment'
        };
        
        const createdBooking = await createBooking(bookingData);
        createdBookings.push(createdBooking);
        
        console.log('✅ Individual booking created:', individualBookingId);
        
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
    
    // Send confirmation emails for each booking
    for (const booking of createdBookings) {
      try {
        await sendConfirmationEmails(booking);
      } catch (emailError) {
        console.warn('📧 Email sending failed for booking:', booking.id, emailError.message);
      }
    }
    
    // TODO: Create calendar events (implement if needed)
    
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
        ? 'Bookings confirmed! We\'ll contact you about payment arrangements.'
        : 'Bookings created successfully. Proceed to payment.'
    };
    
    // Add warnings if some operations failed
    if (bookingErrors.length > 0) {
      response.warnings = {
        bookingErrors: bookingErrors,
        message: `${bookingErrors.length} bookings failed to create`
      };
    }
    
    console.log('🎉 Multiple bookings processed successfully:', {
      masterBookingId: masterBookingId,
      successfulBookings: createdBookings.length,
      totalAmount: accuratePricing.total,
      paymentMethod: validatedData.contactInfo.paymentMethod
    });
    
    return Response.json(response);
    
  } catch (error) {
    // Handle unexpected errors
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
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const response = await bookingHandler(request);
    
    // Add CORS headers to response
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

// Handle OPTIONS for CORS preflight
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