// app/api/booking-request/route.js
// ENHANCED VERSION with multiple bookings and pay-later support

import { v4 as uuidv4 } from 'uuid';
import { createBooking, updateBookingWithCalendarEvent } from '../../lib/database.js';
import { createCalendarEvent } from '../../lib/calendar.js';
import { sendConfirmationEmails } from '../../lib/email.js';
import { withApiSecurity } from '../../lib/middleware/apiSecurity.js';
import { z } from 'zod';

// Enhanced validation schema for multiple bookings
const IndividualBookingSchema = z.object({
  id: z.number(),
  eventName: z.string()
    .min(1, 'Event name is required')
    .max(100, 'Event name too long')
    .regex(/^[a-zA-Z0-9\s\-_.,!?()&]+$/, 'Event name contains invalid characters'),
  
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
});

const MultipleBookingSchema = z.object({
  bookings: z.array(IndividualBookingSchema)
    .min(1, 'At least one booking required')
    .max(10, 'Maximum 10 bookings allowed'),
  
  contactInfo: z.object({
    contactName: z.string()
      .min(1, 'Contact name is required')
      .max(50, 'Contact name too long')
      .regex(/^[a-zA-Z\s\-'.]+$/, 'Invalid characters in name'),
    
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email too long')
      .toLowerCase(),
    
    phone: z.string()
      .regex(/^[\d\s\-\(\)\+\.]*$/, 'Invalid phone format')
      .max(20, 'Phone number too long')
      .optional(),
    
    businessName: z.string()
      .max(100, 'Business name too long')
      .optional(),
    
    websiteUrl: z.string()
      .max(200, 'URL too long')
      .optional(),
    
    isRecurring: z.boolean(),
    recurringDetails: z.string().optional(),
    
    paymentMethod: z.enum(['card', 'pay-later'])
  }),
  
  pricing: z.object({
    totalHours: z.number(),
    totalBookings: z.number(),
    subtotal: z.number(),
    total: z.number(),
    stripeFee: z.number().optional()
  })
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
  // Deep sanitization of nested booking data
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
      eventName: sanitizeString(booking.eventName),
      specialRequests: sanitizeString(booking.specialRequests || '')
    }));
  }
  
  return sanitized;
}

// Enhanced booking conflict detection
async function checkBookingConflicts(bookings) {
  const conflicts = [];
  
  for (const booking of bookings) {
    // Check if the time slot is available
    try {
      const response = await fetch(`/api/check-availability?date=${booking.selectedDate}`);
      const availability = await response.json();
      
      if (!availability[booking.selectedTime]) {
        conflicts.push({
          bookingId: booking.id,
          eventName: booking.eventName,
          date: booking.selectedDate,
          time: booking.selectedTime,
          reason: 'Time slot no longer available'
        });
      }
    } catch (error) {
      console.warn('Could not check availability for booking:', booking.id);
    }
  }
  
  return conflicts;
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
    const hasRecurringMultiple = contactInfo.isRecurring && contactInfo.recurringDetails?.includes('multiple');
    
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

async function bookingHandler(request) {
  try {
    const rawData = await request.json();
    
    // Sanitize input data
    const sanitizedData = sanitizeBookingData(rawData);
    
    // Validate input data
    const validatedData = MultipleBookingSchema.parse(sanitizedData);
    
    console.log('📝 Processing multiple bookings request:', {
      totalBookings: validatedData.bookings.length,
      paymentMethod: validatedData.contactInfo.paymentMethod,
      totalAmount: validatedData.pricing.total
    });
    
    // Check for booking conflicts
    const conflicts = await checkBookingConflicts(validatedData.bookings);
    
    if (conflicts.length > 0) {
      return Response.json({
        success: false,
        error: 'Some time slots are no longer available',
        conflicts: conflicts,
        code: 'BOOKING_CONFLICTS'
      }, { status: 409 });
    }
    
    // Recalculate pricing to ensure accuracy
    const accuratePricing = calculateAccuratePricing(validatedData.bookings, validatedData.contactInfo);
    
    // Create master booking ID
    const masterBookingId = uuidv4();
    
    // Create individual bookings in database
    const createdBookings = [];
    let bookingErrors = [];
    
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
            : 'pending_payment'
        };
        
        const createdBooking = await createBooking(bookingData);
        createdBookings.push(createdBooking);
        
        console.log('✅ Individual booking created:', {
          id: individualBookingId,
          eventName: booking.eventName,
          date: booking.selectedDate,
          time: booking.selectedTime
        });
        
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
    
    // Create calendar events for all successful bookings
    let calendarErrors = [];
    
    for (const booking of createdBookings) {
      try {
        const calendarEvent = await createCalendarEvent(booking, true);
        await updateBookingWithCalendarEvent(booking.id, calendarEvent.id);
        
        console.log('📅 Calendar event created for booking:', booking.id);
      } catch (calendarError) {
        console.warn('📅 Calendar event creation failed for booking:', booking.id, calendarError.message);
        calendarErrors.push({
          bookingId: booking.id,
          error: calendarError.message
        });
      }
    }
    
    // Send confirmation emails
    try {
      // Send a master confirmation email with all bookings
      const masterBookingData = {
        ...createdBookings[0], // Use first booking as template
        masterBookingId: masterBookingId,
        allBookings: createdBookings,
        totalBookings: createdBookings.length,
        totalAmount: accuratePricing.total,
        paymentMethod: validatedData.contactInfo.paymentMethod
      };
      
      await sendConfirmationEmails(masterBookingData);
      console.log('✅ Confirmation emails sent successfully');
      
    } catch (emailError) {
      console.warn('📧 Email sending failed:', emailError.message);
    }
    
    // Prepare response
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
    
    if (calendarErrors.length > 0) {
      response.warnings = {
        ...response.warnings,
        calendarErrors: calendarErrors,
        calendarMessage: `${calendarErrors.length} calendar events failed to create`
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
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: 'Validation failed',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }, { status: 400 });
    }
    
    // Handle other errors
    console.error('❌ Multiple booking creation error:', error);
    
    return Response.json({ 
      success: false,
      error: 'Failed to create bookings',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Export with enhanced security middleware
export const POST = withApiSecurity(bookingHandler, { 
  rateLimit: 'booking' 
});