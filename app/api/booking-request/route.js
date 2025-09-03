// app/api/booking-request/route.js
// SECURED VERSION with rate limiting and enhanced validation

import { v4 as uuidv4 } from 'uuid';
import { createBooking, updateBookingWithCalendarEvent } from '../../lib/database.js';
import { createCalendarEvent } from '../../lib/calendar.js';
import { sendConfirmationEmails } from '../../lib/email.js';
import { withApiSecurity } from '../../lib/middleware/apiSecurity.js';
import { z } from 'zod';

// Enhanced validation schema
const BookingSchema = z.object({
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
  
  eventName: z.string()
    .min(1, 'Event name is required')
    .max(100, 'Event name too long')
    .regex(/^[a-zA-Z0-9\s\-_.,!?()&]+$/, 'Event name contains invalid characters'),
  
  eventType: z.enum([
    'yoga-class', 'meditation', 'workshop', 'retreat',
    'sound-bath', 'private-event', 'other'
  ]),
  
  attendees: z.coerce.number()
    .int('Attendees must be a whole number')
    .min(1, 'At least 1 attendee required')
    .max(100, 'Maximum 100 attendees allowed'),
  
  duration: z.string().max(50, 'Duration too long').optional(),
  
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
  
  specialRequests: z.string()
    .max(1000, 'Special requests too long')
    .optional(),
  
  total: z.number()
    .min(0, 'Total cannot be negative')
    .max(10000, 'Total exceeds maximum allowed'),
  
  paymentMethod: z.string().optional(),
});

// Sanitization functions
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

function sanitizeBookingData(data) {
  const sanitized = { ...data };
  
  // Sanitize string fields
  ['eventName', 'contactName', 'email', 'phone', 'specialRequests', 'duration'].forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeString(sanitized[field]);
    }
  });
  
  return sanitized;
}

async function bookingHandler(request) {
  try {
    const rawData = await request.json();
    
    // Sanitize input data
    const sanitizedData = sanitizeBookingData(rawData);
    
    // Validate input data
    const validatedData = BookingSchema.parse(sanitizedData);
    
    // Check for duplicate bookings (basic check)
    const duplicateCheck = await checkForDuplicateBooking(
      validatedData.selectedDate,
      validatedData.selectedTime,
      validatedData.email
    );
    
    if (duplicateCheck.exists) {
      return Response.json({
        success: false,
        error: 'A booking already exists for this date, time, and email address',
        code: 'DUPLICATE_BOOKING'
      }, { status: 409 });
    }
    
    const bookingId = uuidv4();
    
    // Create booking in database with retry logic
    let booking;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        booking = await createBooking({
          ...validatedData,
          id: bookingId
        });
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error('Failed to create booking after multiple attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    // Create calendar event (optional, don't fail booking if it errors)
    let calendarEventId = null;
    try {
      const calendarEvent = await createCalendarEvent(booking, true);
      calendarEventId = calendarEvent.id;
      await updateBookingWithCalendarEvent(bookingId, calendarEventId);
    } catch (calendarError) {
      // Log error but continue
      console.warn('Calendar event creation failed:', calendarError.message);
    }

    // Send confirmation emails (optional, don't fail booking if it errors)
    try {
      await sendConfirmationEmails(booking);
    } catch (emailError) {
      // Log error but continue
      console.warn('Email sending failed:', emailError.message);
    }

    return Response.json({ 
      success: true, 
      id: bookingId,
      booking: {
        id: booking.id,
        eventName: booking.event_name,
        eventDate: booking.event_date,
        eventTime: booking.event_time,
        status: booking.status,
      },
      calendarEventId,
      message: 'Booking created successfully'
    });
    
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
    console.error('Booking creation error:', error);
    
    return Response.json({ 
      success: false,
      error: 'Failed to create booking',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Check for duplicate bookings
async function checkForDuplicateBooking(date, time, email) {
  try {
    // This is a basic check - in production you'd want more sophisticated logic
    // that considers time conflicts and availability windows
    const existingBooking = await getBookingByDateTimeEmail(date, time, email);
    return { exists: !!existingBooking };
  } catch (error) {
    // If we can't check for duplicates, allow the booking but log the error
    console.warn('Duplicate check failed:', error.message);
    return { exists: false };
  }
}

// Helper function (you'd implement this in your database module)
async function getBookingByDateTimeEmail(date, time, email) {
  // Implement this based on your database setup
  // Return existing booking if found, null otherwise
  return null;
}

// Export with security middleware
export const POST = withApiSecurity(bookingHandler, { 
  rateLimit: 'booking' 
});