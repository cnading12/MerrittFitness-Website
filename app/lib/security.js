import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

// Enhanced validation schemas
export const validationSchemas = {
  booking: z.object({
    eventName: z.string()
      .min(1, 'Event name is required')
      .max(100, 'Event name too long')
      .regex(/^[a-zA-Z0-9\s\-_.,!?()]+$/, 'Invalid characters in event name'),
    
    contactName: z.string()
      .min(1, 'Contact name is required')
      .max(50, 'Contact name too long')
      .regex(/^[a-zA-Z\s\-'.]+$/, 'Invalid characters in name'),
    
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email too long')
      .toLowerCase(),
    
    phone: z.string()
      .regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Invalid phone format (XXX) XXX-XXXX')
      .optional(),
    
    attendees: z.number()
      .int('Attendees must be a whole number')
      .min(1, 'At least 1 attendee required')
      .max(100, 'Maximum 100 attendees allowed'),
    
    specialRequests: z.string()
      .max(1000, 'Special requests too long')
      .optional(),
    
    selectedDate: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    
    selectedTime: z.string()
      .regex(/^\d{1,2}:\d{2} (AM|PM)$/, 'Invalid time format'),
    
    eventType: z.enum([
      'yoga-class', 'meditation', 'workshop', 'retreat',
      'sound-bath', 'private-event', 'other'
    ])
  }),
  
  payment: z.object({
    bookingId: z.string().uuid('Invalid booking ID'),
    amount: z.number()
      .min(0.50, 'Minimum amount is $0.50')
      .max(5000, 'Maximum amount is $5,000'),
    paymentMethod: z.enum(['card', 'ach'])
  })
};

// Sanitization functions
export const sanitize = {
  // Remove potential XSS and injection attacks
  input: (input) => {
    if (typeof input !== 'string') return input;
    
    // Remove HTML tags and scripts
    const cleaned = DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [] 
    });
    
    // Remove SQL injection patterns
    const sqlPatterns = [
      /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT( +INTO)?|MERGE|SELECT|UPDATE|UNION( +ALL)?)\b)/gi,
      /((\%27)|(\'))/gi, // SQL apostrophe
      /((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi, // OR
      /((\%3D)|=)[^\n]*((\%27)|(\')|(--)|(\%3B)|(;))/gi // Equals sign
    ];
    
    let sanitized = cleaned;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized.trim();
  },
  
  // Email-specific sanitization
  email: (email) => {
    if (typeof email !== 'string') return '';
    return email.toLowerCase().trim().replace(/[^\w@.-]/g, '');
  },
  
  // Phone number sanitization
  phone: (phone) => {
    if (typeof phone !== 'string') return '';
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }
};