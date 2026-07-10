'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Mail, Phone, CreditCard, CheckCircle, MapPin, ArrowRight, Loader2, AlertCircle, Star, TrendingUp, Plus, Minus, DollarSign, Info, Tag, Repeat, CalendarDays, Banknote, Wine, FileText } from 'lucide-react';

type ApplicationType = 'single' | 'recurring';
type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';
type PaymentPreference = 'ach' | 'card';

type RecurringSlot = {
  id: number;
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  startTime: string;
  durationHours: string;
  frequency: RecurringFrequency;
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BookingPage() {
  const [availableSlots, setAvailableSlots] = useState({});
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Application type — the very first choice: single event vs. recurring series.
  const [applicationType, setApplicationType] = useState<ApplicationType>('single');

  // Enhanced multiple bookings state (single-event path)
  const [bookings, setBookings] = useState([{
    id: 1,
    eventName: '',
    eventType: '',
    eventVisibility: '', // Required: 'public' (open to the community → collaborative marketing) or 'private'
    selectedDate: '',
    selectedTime: '',
    hoursRequested: '',
    specialRequests: '',
    needsTables: false,
    needsChairs: false,
    needsMat: false, // Optional: rent the full-floor roll-out mat ($100, waived for partners)
    expectedAttendees: '' // Required: used to determine if on-site event supervision is needed (40+ attendees on first booking)
  }]);

  // Recurring-series state (recurring path)
  const [recurringDetails, setRecurringDetails] = useState({
    eventName: '',
    eventType: '',
    eventVisibility: '', // Required: 'public' (community → collaborative marketing) or 'private'
    expectedAttendees: '',
    startDate: '',
    endDate: '',
    paymentPreference: 'ach' as PaymentPreference,
    specialRequests: '',
    needsMat: false // Optional: full-floor mat. Free for partners (recurring renters); they handle their own setup/breakdown within booked time.
  });
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlot[]>([
    { id: 1, dayOfWeek: 3, startTime: '6:00 PM', durationHours: '2', frequency: 'weekly' }
  ]);

  // Per-date overrides chosen during the conflict-resolution step. Keyed by
  // `${date}|${slotIdx}` so it's cheap to look up while rendering the modal.
  type RecurringException = {
    date: string;
    slotIdx: number | null;
    action: 'skip' | 'reschedule';
    newDate?: string;
    newStartTime?: string;
    reason?: string;
  };
  type RecurringConflict = {
    date: string;
    slotIdx: number | null;
    startTime: string | null;
    durationHours: number;
    rescheduledFrom: string | null;
    conflictWith: { summary: string; startMinutes: number; endMinutes: number };
  };
  const [recurringExceptions, setRecurringExceptions] = useState<RecurringException[]>([]);
  const [recurringConflicts, setRecurringConflicts] = useState<RecurringConflict[] | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    phone: '',
    homeAddress: '',
    businessName: '',
    websiteUrl: '',
    isRecurring: false,
    recurringDetails: '',
    paymentMethod: 'card',
    agreedToTerms: false, // NEW: Terms agreement
    isFirstEvent: null as boolean | null, // Required: Is this their first event?
    wantsOnsiteAssistance: false, // Optional: Add on-site assistance if not first event
    hasAlcohol: null as boolean | null // Required: Will alcohol be present at the event? Drives the COI requirement.
  });

  // Required government-issued ID photo (base64 data URL + metadata)
  const [idPhoto, setIdPhoto] = useState<{
    dataUrl: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  // Applies to the photo AFTER client-side compression, not the raw file the
  // renter picks — modern phone/camera photos routinely exceed 8 MB but shrink
  // to a few hundred KB once downscaled, so the raw size is never the blocker.
  const ID_PHOTO_MAX_BYTES = 8 * 1024 * 1024; // 8 MB

  // Certificate of Insurance (COI) for general liability incl. liquor — required
  // before submission whenever the renter answers "yes" to alcohol at the event.
  // Accepts a PDF or an image (base64 data URL + metadata).
  const [coiDocument, setCoiDocument] = useState<{
    dataUrl: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  const COI_MAX_BYTES = 10 * 1024 * 1024; // 10 MB — COIs are often multi-page PDFs

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeApplied, setPromoCodeApplied] = useState(false);
  const [promoCodeError, setPromoCodeError] = useState('');

  // Valid promo codes configuration. Mirrors VALID_PROMO_CODES in
  // app/lib/booking-pricing.js (the server re-validates). The `sponsored` flag
  // comps the entire booking — $0 total, no fees, no card required.
  const VALID_PROMO_CODES = {
    // `partner: true` marks the 20% partnership code as a "recurring partner"
    // (8+ hrs/month). Recurring partners are exempt from mandatory on-site staff
    // coverage on repeat events — but everyone, partners included, pays on their
    // first event. Mirrors VALID_PROMO_CODES in app/lib/booking-pricing.js.
    'MerrittMagic': { discount: 0.20, description: 'Partnership Discount (20% off)', partner: true },
    'EXTENDED15': { discount: 0.15, description: 'Extended Booking Discount (15% off)', minHours: 8 },
    'MerrittSponsor100': { discount: 1.0, description: 'Sponsored — Complimentary Event', sponsored: true }
  };

  // Event types aligned with our four business focus areas
  const eventTypes = [
    {
      id: 'wellness',
      name: 'Wellness',
      description: 'Yoga, meditation, sound baths'
    },
    {
      id: 'fitness-class',
      name: 'Fitness Class',
      description: 'Dance, martial arts, group fitness'
    },
    {
      id: 'social-event',
      name: 'Social Event',
      description: 'Fundraisers, markets, concerts'
    },
    {
      id: 'private-event',
      name: 'Private Event',
      description: 'Weddings, celebrations of life, parties'
    },
    {
      id: 'other',
      name: 'Other',
      description: ''
    }
  ];

  const timeSlots = [
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM'
  ];

  // ENHANCED: Check if date is Saturday (timezone-safe)
  const isSaturday = (dateString) => {
    if (!dateString) return false;
    // Parse date string directly to avoid timezone issues
    // dateString format: "YYYY-MM-DD"
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in JS
    return date.getDay() === 6;
  };

  // Parse "YYYY-MM-DD" into a local Date without timezone drift.
  const parseLocalDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  // Count how many times a weekday falls within [start, end] inclusive at a
  // given frequency (weekly, biweekly from the first occurrence, or monthly —
  // one per calendar month).
  const countOccurrencesInRange = (
    dayOfWeek: number,
    frequency: RecurringFrequency,
    start: Date,
    end: Date
  ): number => {
    if (start > end) return 0;
    // Walk to the first matching weekday on/after start.
    const first = new Date(start);
    const offset = (dayOfWeek - first.getDay() + 7) % 7;
    first.setDate(first.getDate() + offset);
    if (first > end) return 0;

    if (frequency === 'monthly') {
      let count = 0;
      const cursor = new Date(first);
      while (cursor <= end) {
        count++;
        // Advance to same weekday next month (first occurrence).
        const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        const nmOffset = (dayOfWeek - nextMonth.getDay() + 7) % 7;
        nextMonth.setDate(nextMonth.getDate() + nmOffset);
        cursor.setTime(nextMonth.getTime());
      }
      return count;
    }

    const step = frequency === 'biweekly' ? 14 : 7;
    const diffDays = Math.floor((end.getTime() - first.getTime()) / (24 * 60 * 60 * 1000));
    return Math.floor(diffDays / step) + 1;
  };

  // First day of the month containing `date`.
  const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

  // Last day of the month containing `date`.
  const lastOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

  // Check if booking ends by 10 PM (all events must end by 10 PM)
  const endsBy10PM = (startTime, hoursRequested) => {
    if (!startTime || !hoursRequested) return true; // Can't validate without both

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
  };


  // FIXED: Enhanced email validation
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  // FIXED: Enhanced phone validation
  const validatePhone = (phone) => {
    if (!phone.trim()) return false; // Phone is required
    const phoneRegex = /^[\+]?[1-9]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.trim());
  };

  // Parse a fetch Response body defensively. Infrastructure-level failures
  // (e.g. the host rejecting an oversized upload with a 413) return HTML or
  // plain-text bodies — calling response.json() on those throws, and Safari
  // surfaces it as the cryptic "The string did not match the expected
  // pattern." Returns null when the body isn't valid JSON so callers can
  // build a real message from the status code instead.
  const parseJsonSafely = async (response: Response) => {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };

  // The hosting platform (Vercel) rejects request bodies over ~4.5 MB before
  // our API route ever runs, so uploads are downscaled client-side and the
  // final payload is checked against this slightly-lower ceiling.
  const MAX_REQUEST_BYTES = 4 * 1024 * 1024; // 4 MB
  const IMAGE_MAX_DIMENSION = 1600; // px, longest edge — plenty for a legible ID
  const IMAGE_JPEG_QUALITY = 0.8;

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read the selected file'));
      reader.readAsDataURL(file);
    });

  // Downscale + re-encode an image file as JPEG. Phone photos are routinely
  // 3–8 MB, and base64-encoding inflates that by ~33% — enough to blow past
  // the request body limit on its own. An ID photo or COI scan only needs to
  // be legible, not print-resolution.
  const compressImageToDataUrl = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not decode image'));
        img.src = objectUrl;
      });
      const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const encode = (quality: number) => {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const size = Math.floor((base64Length * 3) / 4);
        return { dataUrl, type: 'image/jpeg', size };
      };
      let result = encode(IMAGE_JPEG_QUALITY);
      // A 1600px JPEG at 0.8 quality almost never exceeds ~1.5 MB, but leave
      // headroom under the 4 MB request ceiling for the rest of the payload
      // (a COI upload may ride along in the same request).
      if (result.size > 2 * 1024 * 1024) {
        result = encode(0.6);
      }
      return result;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  // Prepare an uploaded document for submission: images are downscaled and
  // re-encoded (keeping whichever version is smaller); PDFs and images the
  // browser can't decode (e.g. HEIC outside Safari) pass through as-is.
  const prepareUploadedFile = async (file: File) => {
    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageToDataUrl(file);
        if (compressed.size < file.size) {
          return { dataUrl: compressed.dataUrl, name: file.name, type: compressed.type, size: compressed.size };
        }
      } catch {
        // Fall through to the uncompressed original.
      }
    }
    const dataUrl = await readFileAsDataUrl(file);
    return { dataUrl, name: file.name, type: file.type, size: file.size };
  };

  // CRITICAL: Enhanced availability checking with strict error handling
  const checkAvailability = async (date) => {
    if (!date) return;

    setIsCheckingAvailability(true);
    setAvailableSlots({});

    try {
      console.log('🔍 Checking availability for:', date);
      const response = await fetch(`/api/check-availability?date=${date}`);
      const data = await parseJsonSafely(response);

      if (response.ok && data?.availability) {
        setAvailableSlots(data.availability);
        console.log('✅ Availability loaded:', data.availability);

        const newErrors = { ...validationErrors };
        delete newErrors.calendar;
        setValidationErrors(newErrors);
      } else {
        console.error('Calendar availability check failed:', data);
        setAvailableSlots({});
        setValidationErrors(prev => ({
          ...prev,
          calendar: data?.message || 'Unable to check availability. Please try a different date or contact us.'
        }));
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailableSlots({});
      setValidationErrors(prev => ({
        ...prev,
        calendar: 'Calendar service temporarily unavailable. Please try again later.'
      }));
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // ENHANCED: Comprehensive form validation
  const validateForm = () => {
    const errors = {};

    // Validate contact information
    if (!formData.contactName.trim()) {
      errors.contactName = 'Contact name is required';
    } else if (formData.contactName.trim().length < 2) {
      errors.contactName = 'Contact name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address (e.g., name@example.com)';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Validate terms agreement
    if (!formData.agreedToTerms) {
      errors.agreedToTerms = 'You must agree to the Terms and Conditions to proceed';
    }

    // Validate first event question (required)
    if (formData.isFirstEvent === null) {
      errors.isFirstEvent = 'Please indicate if this is your first event at Merritt Wellness';
    }

    // NEW: Validate home address
    if (!formData.homeAddress.trim()) {
      errors.homeAddress = 'Home address is required';
    } else if (formData.homeAddress.trim().length < 10) {
      errors.homeAddress = 'Please enter a complete address';
    }

    // Require a government-issued ID photo
    if (!idPhoto) {
      errors.idPhoto = 'A photo of your government-issued ID is required';
    } else if (!idPhoto.type.startsWith('image/')) {
      errors.idPhoto = 'ID photo must be an image file (JPG, PNG, HEIC, etc.)';
    } else if (idPhoto.size > ID_PHOTO_MAX_BYTES) {
      errors.idPhoto = "Your ID photo couldn't be shrunk automatically. Please save it as a JPG or PNG and upload that instead.";
    }

    // Alcohol at the event is a required yes/no question. When the renter
    // answers "yes", a Certificate of Insurance (general liability incl. liquor)
    // must be uploaded before they can submit/pay.
    if (formData.hasAlcohol === null) {
      errors.hasAlcohol = 'Please indicate whether alcohol will be present at your event';
    } else if (formData.hasAlcohol === true) {
      if (!coiDocument) {
        errors.coiDocument = 'A Certificate of Insurance (COI) is required when alcohol is present at your event';
      } else if (!(coiDocument.type === 'application/pdf' || coiDocument.type.startsWith('image/'))) {
        errors.coiDocument = 'COI must be a PDF or image file';
      } else if (coiDocument.size > COI_MAX_BYTES) {
        errors.coiDocument = 'COI must be smaller than 10 MB';
      }
    }

    // Recurring-path validation short-circuits the per-date booking checks.
    if (applicationType === 'recurring') {
      if (!recurringDetails.eventName.trim()) {
        errors.recurring_eventName = 'Event / series name is required';
      }
      if (!recurringDetails.eventType) {
        errors.recurring_eventType = 'Event type is required';
      }
      if (!recurringDetails.eventVisibility) {
        errors.recurring_eventVisibility = 'Please select whether this is a public or private event';
      }
      if (!recurringDetails.startDate) {
        errors.recurring_startDate = 'Start date is required';
      } else {
        const start = parseLocalDate(recurringDetails.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (start && start < today) {
          errors.recurring_startDate = 'Start date cannot be in the past';
        }
      }
      if (recurringDetails.endDate) {
        const start = parseLocalDate(recurringDetails.startDate);
        const end = parseLocalDate(recurringDetails.endDate);
        if (start && end && end < start) {
          errors.recurring_endDate = 'End date must be on or after the start date';
        }
      }
      if (!recurringDetails.expectedAttendees) {
        errors.recurring_expectedAttendees = 'Expected attendee count is required';
      } else {
        const n = parseInt(recurringDetails.expectedAttendees, 10);
        if (isNaN(n) || n < 1) {
          errors.recurring_expectedAttendees = 'Please enter a valid attendee count (1 or more)';
        } else if (n > 130) {
          errors.recurring_expectedAttendees = 'Maximum capacity is 130 attendees (standing room)';
        }
      }
      if (recurringSlots.length === 0) {
        errors.recurring_slots = 'Add at least one recurring slot';
      }
      recurringSlots.forEach((slot, idx) => {
        if (!slot.startTime) {
          errors[`recurring_slot_${idx}_startTime`] = 'Start time is required';
        }
        const duration = parseFloat(slot.durationHours);
        if (!slot.durationHours || isNaN(duration) || duration < 0.5) {
          errors[`recurring_slot_${idx}_durationHours`] = 'Duration must be at least 30 minutes';
        } else if (!endsBy10PM(slot.startTime, slot.durationHours)) {
          errors[`recurring_slot_${idx}_durationHours`] = 'All events must end by 10 PM';
        }
      });
      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    }

    // Validate at least one complete booking
    const validBookings = bookings.filter(booking =>
      booking.eventName.trim() &&
      booking.eventType &&
      booking.selectedDate &&
      booking.selectedTime &&
      booking.hoursRequested
    );

    if (validBookings.length === 0) {
      errors.bookings = 'Please complete at least one booking';
    }

    // Validate individual bookings
    bookings.forEach((booking, index) => {
      if (booking.eventName.trim() || booking.eventType || booking.selectedDate) {
        if (!booking.eventName.trim()) {
          errors[`booking_${index}_eventName`] = 'Event name is required';
        }
        if (!booking.eventType) {
          errors[`booking_${index}_eventType`] = 'Event type is required';
        }
        if (!booking.eventVisibility) {
          errors[`booking_${index}_eventVisibility`] = 'Please select whether this is a public or private event';
        }
        if (!booking.selectedDate) {
          errors[`booking_${index}_selectedDate`] = 'Date is required';
        } else {
          const selectedDate = new Date(booking.selectedDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            errors[`booking_${index}_selectedDate`] = 'Date cannot be in the past';
          }
        }
        if (!booking.selectedTime) {
          errors[`booking_${index}_selectedTime`] = 'Time is required';
        } else {
          const isAvailable = availableSlots[booking.selectedTime] !== false;
          const hasAvailabilityData = Object.keys(availableSlots).length > 0;

          if (!hasAvailabilityData && booking.selectedDate) {
            errors[`booking_${index}_selectedTime`] = 'Please wait for availability check to complete.';
          } else if (!isAvailable) {
            errors[`booking_${index}_selectedTime`] = 'This time slot is no longer available. Please choose another time.';
          }
        }
        if (!booking.hoursRequested) {
          errors[`booking_${index}_hoursRequested`] = 'Duration is required';
        } else if (parseFloat(booking.hoursRequested) < 0.5) {
          errors[`booking_${index}_hoursRequested`] = 'Minimum duration is 30 minutes';
        } else if (booking.selectedTime && !endsBy10PM(booking.selectedTime, booking.hoursRequested)) {
          errors[`booking_${index}_hoursRequested`] = 'All events must end by 10 PM. Please select an earlier start time or shorter duration.';
        }
        if (!booking.expectedAttendees || booking.expectedAttendees === '') {
          errors[`booking_${index}_expectedAttendees`] = 'Expected attendee count is required';
        } else {
          const attendeeCount = parseInt(booking.expectedAttendees, 10);
          if (isNaN(attendeeCount) || attendeeCount < 1) {
            errors[`booking_${index}_expectedAttendees`] = 'Please enter a valid attendee count (1 or more)';
          } else if (attendeeCount > 130) {
            errors[`booking_${index}_expectedAttendees`] = 'Maximum capacity is 130 attendees (standing room)';
          }
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Promo code validation function
  const applyPromoCode = () => {
    setPromoCodeError('');

    if (!promoCode.trim()) {
      setPromoCodeError('Please enter a promo code');
      return;
    }

    const promoData = VALID_PROMO_CODES[promoCode.trim()];
    if (promoData) {
      // Check minimum hours requirement if applicable
      if (promoData.minHours) {
        const pricing = calculatePricing();
        if (pricing.totalHours < promoData.minHours) {
          setPromoCodeApplied(false);
          setPromoCodeError(`This code requires a reservation of ${promoData.minHours}+ hours. Your current booking is ${pricing.totalHours} hour${pricing.totalHours !== 1 ? 's' : ''}.`);
          return;
        }
      }
      setPromoCodeApplied(true);
      setPromoCodeError('');
    } else {
      setPromoCodeApplied(false);
      setPromoCodeError('Invalid promo code');
    }
  };

  const removePromoCode = () => {
    setPromoCode('');
    setPromoCodeApplied(false);
    setPromoCodeError('');
  };

  // Pricing calculations with Saturday rates
  const HOURLY_RATE = 95;    // Base weekday rate (0–30 guests)
  const SATURDAY_RATE = 200; // Base Saturday rate (0–30 guests)
  // Guest-based rate tiers (mirror app/lib/booking-pricing.js):
  //   Guests   Weekday   Saturday
  //   0–30      $95       $200
  //   30–60     $125      $260
  //   60+       $155      $320
  const RATE_TIER_INCREMENT = 30;      // Per-band increase, weekdays
  const SATURDAY_RATE_INCREMENT = 60;  // Per-band increase, Saturdays
  const RATE_TIER_MID_THRESHOLD = 30;  // >= this many guests → middle band
  const RATE_TIER_HIGH_THRESHOLD = 60; // >= this many guests → top band
  const rateTierFor = (attendees) => {
    const n = parseInt(attendees, 10) || 0;
    if (n >= RATE_TIER_HIGH_THRESHOLD) return 2;
    if (n >= RATE_TIER_MID_THRESHOLD) return 1;
    return 0;
  };
  const hourlyRateFor = (attendees, isSat = false) => {
    const tier = rateTierFor(attendees);
    return isSat
      ? SATURDAY_RATE + tier * SATURDAY_RATE_INCREMENT
      : HOURLY_RATE + tier * RATE_TIER_INCREMENT;
  };
  const ON_SITE_ASSISTANCE_FEE = 35; // First-hour onboarding/setup help (flat, once per submission)
  const MAT_RENTAL_FEE = 100; // Full-floor roll-out mat: $100/booking, waived for partners (MerrittMagic)
  const EVENT_SUPERVISION_RATE = 30; // Per hour — on-site supervisor for 40+ attendee events, billed for the entire event
  const EVENT_SUPERVISION_GROUP_THRESHOLD = 40; // Attendee count that triggers supervision requirement
  const TABLES_CHAIRS_FEE_SMALL = 25; // Tables/chairs equipment fee per item type, <40 attendees
  const TABLES_CHAIRS_FEE_LARGE = 50; // Tables/chairs equipment fee per item type, 40+ attendees
  const TABLES_CHAIRS_GROUP_THRESHOLD = 40; // Attendee count that bumps each equipment fee from $25 to $50
  const STRIPE_FEE_PERCENTAGE = 3;

  const calculatePricing = () => {
    let totalHours = 0;
    let totalBookings = 0;
    let minimumApplied = false;
    let baseAmount = 0;
    let topHourlyRate = HOURLY_RATE; // Highest weekday band rate seen — used for display
    let saturdayCharges = 0;
    let onsiteAssistanceFee = 0;
    let eventSupervisionFee = 0;
    let eventSupervisionHours = 0;
    let eventSupervisionApplies = false;
    let tablesChairsFees = 0;
    let matRentalFee = 0;
    let matRentalCount = 0;

    // A recurring partner (renter on the 20% partnership code) is exempt from
    // mandatory on-site staff coverage — but NOT on their first event, which
    // everyone pays for. Returning-renter status alone does not grant the
    // exemption; only the partnership code does.
    const appliedPromo = promoCodeApplied && promoCode.trim()
      ? VALID_PROMO_CODES[promoCode.trim() as keyof typeof VALID_PROMO_CODES]
      : undefined;
    const isRecurringPartner = (appliedPromo as { partner?: boolean } | undefined)?.partner === true;
    const exemptFromStaffCoverage = isRecurringPartner && formData.isFirstEvent !== true;

    // The MerrittMagic partnership code waives the tables/chairs equipment fees
    // for everyone who applies it — no first-event caveat, unlike staff coverage.
    const waivesEquipmentFees = isRecurringPartner;

    // Recurring partners get the full-floor mat for free (regardless of whether
    // it's their first event); everyone else pays the flat fee per booking that
    // uses it. Mirrors the server in app/lib/booking-pricing.js.
    const matWaived = isRecurringPartner;

    bookings.forEach(booking => {
      if (booking.hoursRequested) {
        let hours = parseFloat(booking.hoursRequested) || 0;
        const isSat = isSaturday(booking.selectedDate);
        const attendees = parseInt(booking.expectedAttendees, 10) || 0;

        // Apply minimums per booking (2-hour minimum for all events)
        if (!formData.isRecurring && hours < 2) {
          hours = 2;
          minimumApplied = true;
        }

        // Base venue time billed at the weekday rate for the booking's guest
        // band; Saturdays add that band's Saturday premium as a surcharge.
        const weekdayRate = hourlyRateFor(attendees, false);
        baseAmount += hours * weekdayRate;
        if (weekdayRate > topHourlyRate) topHourlyRate = weekdayRate;

        if (isSat) {
          saturdayCharges += hours * (hourlyRateFor(attendees, true) - weekdayRate);
        }

        // Full-floor mat rental ($100/booking, waived for partners)
        if (booking.needsMat) {
          matRentalCount++;
          if (!matWaived) {
            matRentalFee += MAT_RENTAL_FEE;
          }
        }

        // On-site event supervision: required when any booking has 40+ expected
        // attendees and the renter isn't an exempt recurring partner. The
        // supervisor stays for the ENTIRE event — bill the full requested hours.
        if (!exemptFromStaffCoverage && attendees >= EVENT_SUPERVISION_GROUP_THRESHOLD) {
          eventSupervisionFee += hours * EVENT_SUPERVISION_RATE;
          eventSupervisionHours += hours;
          eventSupervisionApplies = true;
        }

        // Tables / chairs equipment fees: each item type is billed separately and
        // scaled by group size, and they stack when both are used. Waived for
        // renters on the MerrittMagic partnership code.
        if (!waivesEquipmentFees) {
          const equipmentFeePerItem = attendees >= TABLES_CHAIRS_GROUP_THRESHOLD
            ? TABLES_CHAIRS_FEE_LARGE
            : TABLES_CHAIRS_FEE_SMALL;
          if (booking.needsTables) tablesChairsFees += equipmentFeePerItem;
          if (booking.needsChairs) tablesChairsFees += equipmentFeePerItem;
        }

        totalHours += hours;
        totalBookings++;
      }
    });

    // First-hour onboarding/setup assistance ($35, once) is a one-time
    // first-event fee, charged when no supervisor applies. Required on the
    // renter's first event; returning renters (who've been to the space before)
    // are not charged unless they opt in. Mutually exclusive with the
    // supervisor — a booking never pays for both.
    if (!eventSupervisionApplies && (formData.isFirstEvent === true || formData.wantsOnsiteAssistance)) {
      onsiteAssistanceFee = ON_SITE_ASSISTANCE_FEE;
    }

    const preDiscountSubtotal = baseAmount + saturdayCharges + onsiteAssistanceFee + eventSupervisionFee + tablesChairsFees + matRentalFee;

    // Apply promo code discount
    let promoDiscount = 0;
    let promoDescription = '';
    let sponsored = false;
    if (promoCodeApplied && promoCode.trim() && VALID_PROMO_CODES[promoCode.trim()]) {
      const promoData = VALID_PROMO_CODES[promoCode.trim()];
      // Enforce minimum hours requirement (e.g., EXTENDED15 requires 8+ hours)
      if (!promoData.minHours || totalHours >= promoData.minHours) {
        promoDiscount = Math.round(preDiscountSubtotal * promoData.discount);
        promoDescription = promoData.description;
        sponsored = promoData.sponsored === true;
      }
    }

    const subtotal = preDiscountSubtotal - promoDiscount;
    const stripeFee = formData.paymentMethod === 'card'
      ? Math.round(subtotal * (STRIPE_FEE_PERCENTAGE / 100))
      : 0;
    const total = subtotal + stripeFee;

    return {
      totalHours,
      totalBookings,
      hourlyRate: topHourlyRate,
      baseAmount,
      saturdayCharges,
      onsiteAssistanceFee,
      eventSupervisionFee,
      eventSupervisionHours,
      eventSupervisionApplies,
      matRentalFee,
      matRentalCount,
      matWaived: matWaived && matRentalCount > 0,
      eventSupervisionRate: EVENT_SUPERVISION_RATE,
      eventSupervisionThreshold: EVENT_SUPERVISION_GROUP_THRESHOLD,
      tablesChairsFees,
      isFirstEvent: formData.isFirstEvent,
      isRecurringPartner,
      wantsOnsiteAssistance: formData.wantsOnsiteAssistance,
      preDiscountSubtotal,
      promoDiscount,
      promoDescription,
      sponsored,
      promoCode: promoCodeApplied ? promoCode.trim() : '',
      subtotal,
      stripeFee,
      total,
      minimumApplied,
      paymentMethod: formData.paymentMethod
    };
  };

  // ===== Recurring schedule helpers =====

  // Weekly hours across the configured slots (a biweekly slot contributes half,
  // a monthly slot ≈ 1/4.33). Returned as a plain weekly-average.
  const calculateWeeklyHours = () => {
    return recurringSlots.reduce((sum, slot) => {
      const hours = parseFloat(slot.durationHours) || 0;
      const multiplier = slot.frequency === 'weekly' ? 1 : slot.frequency === 'biweekly' ? 0.5 : 1 / 4.33;
      return sum + hours * multiplier;
    }, 0);
  };

  // Minimum / maximum hours in any calendar month based on how many times each
  // slot's weekday can appear. A weekly slot shows up 4–5 times per month, a
  // biweekly slot 2–3 times, a monthly slot exactly once.
  const calculateMonthlyHourRange = () => {
    const ranges = recurringSlots.map(slot => {
      const hours = parseFloat(slot.durationHours) || 0;
      if (slot.frequency === 'weekly') return { min: hours * 4, max: hours * 5 };
      if (slot.frequency === 'biweekly') return { min: hours * 2, max: hours * 3 };
      return { min: hours, max: hours };
    });
    return ranges.reduce(
      (acc, r) => ({ min: acc.min + r.min, max: acc.max + r.max }),
      { min: 0, max: 0 }
    );
  };

  // Hours in the first (possibly partial) month given the renter's start date.
  const calculateFirstMonthHours = () => {
    const start = parseLocalDate(recurringDetails.startDate);
    if (!start) return 0;
    const end = lastOfMonth(start);
    return recurringSlots.reduce((sum, slot) => {
      const occurrences = countOccurrencesInRange(slot.dayOfWeek, slot.frequency, start, end);
      return sum + occurrences * (parseFloat(slot.durationHours) || 0);
    }, 0);
  };

  const calculateRecurringPricing = () => {
    const weeklyHours = calculateWeeklyHours();
    const monthlyRange = calculateMonthlyHourRange();
    const firstMonthHours = calculateFirstMonthHours();

    // Recurring billing is keyed to the typical guest band: a larger class is
    // billed at the higher tier. Slots that land on a Saturday (dayOfWeek 6)
    // carry the Saturday premium; every other day uses the weekday rate.
    const recurringHourlyRate = hourlyRateFor(recurringDetails.expectedAttendees, false);
    const saturdayHourlyRate = hourlyRateFor(recurringDetails.expectedAttendees, true);
    const hasSaturdaySlot = recurringSlots.some(slot => Number(slot.dayOfWeek) === 6);
    const rateForSlot = (slot) =>
      Number(slot.dayOfWeek) === 6 ? saturdayHourlyRate : recurringHourlyRate;

    // Monthly charge range: each slot's hours × its per-day rate, summed across
    // the band of 4–5 (weekly) / 2–3 (biweekly) / 1 (monthly) occurrences.
    let monthlyMinCharge = 0;
    let monthlyMaxCharge = 0;
    recurringSlots.forEach(slot => {
      const hours = parseFloat(slot.durationHours) || 0;
      const rate = rateForSlot(slot);
      const [minOcc, maxOcc] = slot.frequency === 'weekly'
        ? [4, 5]
        : slot.frequency === 'biweekly'
        ? [2, 3]
        : [1, 1];
      monthlyMinCharge += hours * minOcc * rate;
      monthlyMaxCharge += hours * maxOcc * rate;
    });
    const monthlyAvgCharge = (monthlyMinCharge + monthlyMaxCharge) / 2;

    // First (possibly partial) month: actual occurrences per slot × its rate.
    const start = parseLocalDate(recurringDetails.startDate);
    let firstMonthCharge = 0;
    if (start) {
      const end = lastOfMonth(start);
      recurringSlots.forEach(slot => {
        const occurrences = countOccurrencesInRange(slot.dayOfWeek, slot.frequency, start, end);
        firstMonthCharge += occurrences * (parseFloat(slot.durationHours) || 0) * rateForSlot(slot);
      });
    }

    // ACH avoids the 3% card fee; monthly auto-debit is the recommended default.
    const firstMonthFee = recurringDetails.paymentPreference === 'card'
      ? Math.round(firstMonthCharge * (STRIPE_FEE_PERCENTAGE / 100))
      : 0;

    return {
      weeklyHours,
      monthlyMinHours: monthlyRange.min,
      monthlyMaxHours: monthlyRange.max,
      monthlyMinCharge,
      monthlyMaxCharge,
      monthlyAvgCharge,
      firstMonthHours,
      firstMonthCharge,
      firstMonthFee,
      firstMonthTotal: firstMonthCharge + firstMonthFee,
      hourlyRate: recurringHourlyRate,
      saturdayHourlyRate,
      hasSaturdaySlot,
      paymentPreference: recurringDetails.paymentPreference
    };
  };

  const addRecurringSlot = () => {
    const newId = Math.max(0, ...recurringSlots.map(s => s.id)) + 1;
    setRecurringSlots([
      ...recurringSlots,
      { id: newId, dayOfWeek: 3, startTime: '6:00 PM', durationHours: '2', frequency: 'weekly' }
    ]);
  };

  const removeRecurringSlot = (id: number) => {
    if (recurringSlots.length > 1) {
      setRecurringSlots(recurringSlots.filter(s => s.id !== id));
    }
  };

  const updateRecurringSlot = (id: number, field: keyof RecurringSlot, value: string | number) => {
    setRecurringSlots(slots => slots.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const updateRecurringDetails = (field: keyof typeof recurringDetails, value: string | boolean) => {
    setRecurringDetails(prev => ({ ...prev, [field]: value }));
    if (validationErrors[`recurring_${field}`]) {
      const next = { ...validationErrors };
      delete next[`recurring_${field}`];
      setValidationErrors(next);
    }
  };

  // Look up the renter's recorded exception for a specific (date, slotIdx).
  // Used by the conflict modal to render the current resolution state of
  // each row.
  const getException = (date: string, slotIdx: number | null) => {
    return recurringExceptions.find(
      (e) => e.date === date && (e.slotIdx ?? null) === (slotIdx ?? null)
    );
  };

  const setException = (next: RecurringException) => {
    setRecurringExceptions((prev) => {
      const filtered = prev.filter(
        (e) => !(e.date === next.date && (e.slotIdx ?? null) === (next.slotIdx ?? null))
      );
      return [...filtered, next];
    });
  };

  const clearException = (date: string, slotIdx: number | null) => {
    setRecurringExceptions((prev) =>
      prev.filter((e) => !(e.date === date && (e.slotIdx ?? null) === (slotIdx ?? null)))
    );
  };

  // Run the calendar conflict check for the proposed recurring schedule.
  // Returns true if the call succeeded, false otherwise. Sets the conflict
  // list and opens the modal when conflicts are found.
  const runRecurringConflictCheck = async (): Promise<boolean> => {
    if (!recurringDetails.startDate || recurringSlots.length === 0) return false;
    setIsCheckingConflicts(true);
    try {
      const response = await fetch('/api/recurring-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: recurringDetails.startDate,
          endDate: recurringDetails.endDate || null,
          slots: recurringSlots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            durationHours: parseFloat(s.durationHours) || 0,
            frequency: s.frequency,
          })),
          exceptions: recurringExceptions,
          horizonMonths: 3,
        }),
      });
      const data = await parseJsonSafely(response);
      if (!response.ok || !data?.success) {
        // Calendar service hiccup: don't block the renter, just let them
        // submit. The monthly invoicer will still expand occurrences correctly.
        console.warn('Conflict check unavailable:', data?.error || data?.details || response.status);
        setRecurringConflicts(null);
        return true;
      }
      setRecurringConflicts(data.conflicts || []);
      if ((data.conflicts || []).length > 0) {
        setConflictModalOpen(true);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Conflict check failed:', err);
      setRecurringConflicts(null);
      return true; // fail open — never block submission on a transient error
    } finally {
      setIsCheckingConflicts(false);
    }
  };

  // Multiple booking management functions
  const addBooking = () => {
    const newId = Math.max(...bookings.map(b => b.id)) + 1;
    setBookings([...bookings, {
      id: newId,
      eventName: '',
      eventType: '',
      eventVisibility: '',
      selectedDate: '',
      selectedTime: '',
      hoursRequested: '',
      specialRequests: '',
      needsTables: false,
      needsChairs: false,
      needsMat: false,
      expectedAttendees: ''
    }]);
  };

  const removeBooking = (id) => {
    if (bookings.length > 1) {
      setBookings(bookings.filter(b => b.id !== id));
      const newErrors = { ...validationErrors };
      const bookingIndex = bookings.findIndex(b => b.id === id);
      Object.keys(newErrors).forEach(key => {
        if (key.includes(`booking_${bookingIndex}_`)) {
          delete newErrors[key];
        }
      });
      setValidationErrors(newErrors);
    }
  };

  const updateBooking = (id, field, value) => {
    setBookings(bookings.map(booking =>
      booking.id === id ? { ...booking, [field]: value } : booking
    ));

    const bookingIndex = bookings.findIndex(b => b.id === id);
    const errorKey = `booking_${bookingIndex}_${field}`;
    if (validationErrors[errorKey]) {
      const newErrors = { ...validationErrors };
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
    }

    if (field === 'selectedDate' && value) {
      checkAvailability(value);
    }

    if (field === 'selectedTime' && value) {
      const isAvailable = availableSlots[value] !== false;
      const hasAvailabilityData = Object.keys(availableSlots).length > 0;

      if (hasAvailabilityData && !isAvailable) {
        setValidationErrors(prev => ({
          ...prev,
          [`booking_${bookingIndex}_selectedTime`]: 'This time slot is no longer available. Please choose another time.'
        }));
        return;
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  const handleIdPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setIdPhoto(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setValidationErrors(prev => ({ ...prev, idPhoto: 'Please upload an image file (JPG, PNG, HEIC, etc.)' }));
      setIdPhoto(null);
      event.target.value = '';
      return;
    }

    try {
      // Downscale/re-encode so the photo fits within the request body limit.
      // No size check on the raw file — big phone/camera photos compress down
      // to a few hundred KB, so size only matters after preparation.
      const prepared = await prepareUploadedFile(file);
      if (prepared.size > ID_PHOTO_MAX_BYTES) {
        // Only reachable when the browser couldn't decode the image (e.g. HEIC
        // outside Safari) and the untouched original is too large to send.
        setValidationErrors(prev => ({
          ...prev,
          idPhoto: "We couldn't shrink that photo automatically. Please save it as a JPG or PNG and upload that instead."
        }));
        setIdPhoto(null);
        event.target.value = '';
        return;
      }
      setIdPhoto(prepared);
      setValidationErrors(prev => {
        if (!prev.idPhoto) return prev;
        const newErrors = { ...prev };
        delete newErrors.idPhoto;
        return newErrors;
      });
    } catch {
      setIdPhoto(null);
      setValidationErrors(prev => ({ ...prev, idPhoto: 'Failed to read the selected file. Please try again.' }));
    }
  };

  const handleCoiDocumentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCoiDocument(null);
      return;
    }

    const isAllowedType = file.type === 'application/pdf' || file.type.startsWith('image/');
    if (!isAllowedType) {
      setValidationErrors(prev => ({ ...prev, coiDocument: 'Please upload a PDF or image file' }));
      setCoiDocument(null);
      event.target.value = '';
      return;
    }

    // PDFs pass through unchanged, so their raw size is what gets sent. Images
    // are compressed first, so their size is checked after preparation instead.
    if (file.type === 'application/pdf' && file.size > COI_MAX_BYTES) {
      setValidationErrors(prev => ({ ...prev, coiDocument: 'COI must be smaller than 10 MB' }));
      setCoiDocument(null);
      event.target.value = '';
      return;
    }

    try {
      // Images are downscaled/re-encoded; PDFs pass through unchanged.
      const prepared = await prepareUploadedFile(file);
      if (prepared.size > COI_MAX_BYTES) {
        setValidationErrors(prev => ({
          ...prev,
          coiDocument: "We couldn't shrink that image automatically. Please save it as a JPG, PNG, or PDF and upload that instead."
        }));
        setCoiDocument(null);
        event.target.value = '';
        return;
      }
      setCoiDocument(prepared);
      setValidationErrors(prev => {
        if (!prev.coiDocument) return prev;
        const newErrors = { ...prev };
        delete newErrors.coiDocument;
        return newErrors;
      });
    } catch {
      setCoiDocument(null);
      setValidationErrors(prev => ({ ...prev, coiDocument: 'Failed to read the selected file. Please try again.' }));
    }
  };

  const pricing = calculatePricing();
  const recurringPricing = calculateRecurringPricing();

  // A renter is exempt from mandatory on-site staff coverage only as a recurring
  // partner (20% partnership code) on a repeat event — never on a first event.
  // Drives the live per-booking supervision/assistance notices below.
  const exemptFromStaffCoverage = pricing.isRecurringPartner && formData.isFirstEvent !== true;

  // MerrittMagic (the partnership code) waives the tables/chairs equipment fees
  // for everyone who applies it — drives the live per-booking fee labels below.
  const waivesEquipmentFees = pricing.isRecurringPartner;

  const getFieldError = (fieldName) => {
    return validationErrors[fieldName];
  };

  const getInputClassName = (fieldName, baseClassName = "w-full p-3 border rounded-xl transition-colors") => {
    const hasError = validationErrors[fieldName];
    return hasError
      ? `${baseClassName} border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500`
      : `${baseClassName} border-[#735e59]/20 focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59]`;
  };

  // `skipConflictCheck` lets the conflict modal's "Submit anyway" button
  // bypass the pre-flight calendar scan after the renter has acknowledged
  // their conflicts.
  const handleSubmit = async (skipConflictCheck = false) => {
    setSubmitMessage('');
    setValidationErrors({});

    if (!validateForm()) {
      setSubmitMessage('❌ Please fix the errors below');
      setTimeout(() => {
        const firstError = document.querySelector('.border-red-500, .text-red-600');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    // Recurring applications get a calendar scan first. If conflicts are
    // found we open the modal and stop here; the renter resolves each row
    // (Skip / Move to / Keep), then clicks "Submit Anyway" to proceed with
    // exceptions baked into the payload.
    if (applicationType === 'recurring' && !skipConflictCheck) {
      const cleared = await runRecurringConflictCheck();
      if (!cleared) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const idPhotoPayload = idPhoto ? {
        dataUrl: idPhoto.dataUrl,
        name: idPhoto.name,
        type: idPhoto.type,
        size: idPhoto.size
      } : null;

      // COI is only sent when the renter indicated alcohol will be present.
      const coiDocumentPayload = (formData.hasAlcohol === true && coiDocument) ? {
        dataUrl: coiDocument.dataUrl,
        name: coiDocument.name,
        type: coiDocument.type,
        size: coiDocument.size
      } : null;

      let submissionData;

      if (applicationType === 'recurring') {
        const recurringPricing = calculateRecurringPricing();
        submissionData = {
          applicationType: 'recurring',
          contactInfo: {
            ...formData,
            isRecurring: true,
            paymentMethod: recurringDetails.paymentPreference === 'ach' ? 'ach' : 'card'
          },
          recurringSchedule: {
            eventName: recurringDetails.eventName,
            eventType: recurringDetails.eventType,
            eventVisibility: recurringDetails.eventVisibility,
            expectedAttendees: parseInt(recurringDetails.expectedAttendees, 10) || 0,
            startDate: recurringDetails.startDate,
            endDate: recurringDetails.endDate || null,
            paymentPreference: recurringDetails.paymentPreference,
            specialRequests: recurringDetails.specialRequests,
            needsMat: recurringDetails.needsMat,
            slots: recurringSlots.map(s => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              durationHours: parseFloat(s.durationHours) || 0,
              frequency: s.frequency
            })),
            exceptions: recurringExceptions
          },
          pricing: recurringPricing,
          idPhoto: idPhotoPayload,
          coiDocument: coiDocumentPayload
        };
      } else {
        const validBookings = bookings.filter(booking =>
          booking.eventName.trim() &&
          booking.eventType &&
          booking.selectedDate &&
          booking.selectedTime &&
          booking.hoursRequested
        );

        if (validBookings.length === 0) {
          throw new Error('Please complete at least one booking');
        }

        submissionData = {
          applicationType: 'single',
          bookings: validBookings,
          contactInfo: formData,
          pricing: pricing,
          idPhoto: idPhotoPayload,
          coiDocument: coiDocumentPayload
        };
      }

      console.log('🚀 Submitting booking data:', {
        applicationType,
        email: formData.email,
        paymentMethod: applicationType === 'recurring' ? recurringDetails.paymentPreference : formData.paymentMethod
      });

      const requestBody = JSON.stringify(submissionData);

      // Catch oversized uploads before the platform rejects the request with a
      // non-JSON 413 error page (which Safari surfaces as "The string did not
      // match the expected pattern").
      if (requestBody.length > MAX_REQUEST_BYTES) {
        throw new Error(
          'Your uploaded documents are too large to submit together (about 4 MB max). ' +
          'Please upload a smaller or lower-resolution ID photo' +
          (coiDocumentPayload ? ' and/or COI file' : '') +
          ' and try again.'
        );
      }

      const bookingResponse = await fetch('/api/booking-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const bookingResult = await parseJsonSafely(bookingResponse);

      if (bookingResponse.ok && bookingResult?.success) {
        console.log('✅ Booking created successfully:', bookingResult);
        // Sponsored bookings are comped and already confirmed server-side —
        // skip checkout entirely and go straight to the confirmation page.
        // Recurring applications skip the single-payment checkout — pass an
        // `application_type` flag so the payment page can render the ACH
        // auto-debit setup flow instead of a one-time Stripe charge.
        let redirect;
        if (bookingResult.sponsored) {
          redirect = `/booking/success?booking_id=${bookingResult.id}`;
        } else if (applicationType === 'recurring') {
          redirect = `/booking/payment?booking_id=${bookingResult.id}&application_type=recurring`;
        } else {
          redirect = `/booking/payment?booking_id=${bookingResult.id}`;
        }
        window.location.href = redirect;
      } else if (bookingResponse.status === 413) {
        throw new Error(
          'Your uploaded documents are too large to submit (about 4 MB max). ' +
          'Please upload a smaller or lower-resolution ID photo or COI file and try again.'
        );
      } else {
        throw new Error(
          bookingResult?.error ||
          `Failed to create booking (server responded with status ${bookingResponse.status}). Please try again or call (720) 357-9499.`
        );
      }
    } catch (error) {
      console.error('❌ Booking submission error:', error);
      setSubmitMessage(`❌ ${error.message}`);
      setTimeout(() => {
        const errorElement = document.querySelector('[role="alert"]');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="pt-32 pb-20 bg-[#faf8f5] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-light mb-4 text-[#4a3f3c] font-serif">
            Reserve Your <span className="font-bold text-[#735e59]">Sacred Space</span>
          </h1>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#735e59] to-transparent mx-auto mb-6"></div>
          <p className="text-xl text-[#6b5f5b] max-w-3xl mx-auto">
            Join our community of wellness professionals in Denver's most inspiring historic sanctuary.
            <span className="font-semibold text-[#735e59]"> From $95/hour • Flexible pricing for partners</span>
          </p>
        </div>

        {/* Important Rental Information */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 mt-1 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-amber-900 mb-3 font-serif">Important Rental Information</h3>
              <ul className="space-y-2 text-amber-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Standard Rate (by guest count):</strong> $95/hour for 0–30 guests, $125/hour for 30–60, and $155/hour for 60+. A 2-hour minimum applies to all events.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Saturday Rentals:</strong> $200/hour for 0–30 guests, $260/hour for 30–60, and $320/hour for 60+ (2-hour minimum).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Events Under 40 Attendees:</strong> First-hour onboarding/setup assistance ($35) helps with wifi, speakers, building access, and any questions. This is a one-time fee charged on your first event only — returning renters who&apos;ve been here before are not charged, though they can opt in.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Events With 40+ Attendees:</strong> A Facility Host is required at $30/hour for the entire event, in place of onboarding assistance — you are never charged for both. Recurring partners (8+ hrs/month, 20% partner discount) are exempt on repeat events, but every renter pays for their first event.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Tables &amp; Chairs:</strong> Add tables and/or chairs per booking. Each is $25 for events under 40 guests and $50 for 40+ guests, charged separately (so a 40+ event using both adds $100). Waived for partners.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Full-Floor Mat:</strong> Our roll-out mat that fills the main hall is $100 per booking — our team sets it up and breaks it down within your reserved time. Included free for partners, who handle their own setup and breakdown.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Alcohol:</strong> If alcohol will be present, a Certificate of Insurance (COI) for general liability including liquor is required and must be uploaded with your application before the booking can be confirmed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Setup & Cleanup:</strong> All rental times must include your own setup and cleanup. Space must be returned in the condition you found it. There is no arriving early or staying late — please keep everything within your booked window.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Partnership Pricing:</strong> Regular partners booking 2+ hours weekly can start at reduced rates and grow to full rate. Call (720) 357-9499 for details.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Summary Display */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8" role="alert">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-red-600" size={24} />
              <h3 className="text-lg font-semibold text-red-900">Please fix the following errors:</h3>
            </div>
            <ul className="text-red-800 space-y-1">
              {Object.entries(validationErrors).map(([field, error]) => (
                <li key={field}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Calendar Error Display */}
        {validationErrors.calendar && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-yellow-600" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900">Calendar System Notice</h3>
                <p className="text-yellow-800">{validationErrors.calendar}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Booking Form */}
          <div className="lg:col-span-2">
            {/* Application Type — first question a renter answers. Drives the
                rest of the form: a single booking collects specific dates, a
                recurring series collects weekdays + frequency. */}
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#735e59]/10 rounded-xl">
                  <CalendarDays className="text-[#735e59]" size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#4a3f3c] font-serif">What Are You Booking?</h2>
                <div className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full">
                  Required
                </div>
              </div>

              <p className="text-sm text-[#6b5f5b] mb-4">
                Choose the type of application that best describes your booking. You can switch between options at any time before submitting.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setApplicationType('single')}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${
                    applicationType === 'single'
                      ? 'border-[#735e59] bg-[#735e59]/5 shadow-md'
                      : 'border-[#735e59]/20 bg-white hover:border-[#735e59]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${applicationType === 'single' ? 'bg-[#735e59] text-white' : 'bg-[#735e59]/10 text-[#735e59]'}`}>
                      <Calendar size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#4a3f3c]">Single Event Booking</span>
                        <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Default</span>
                      </div>
                      <p className="text-sm text-[#6b5f5b]">
                        Booking one event (can span multiple days). Pay once at checkout — great for workshops, retreats, private events, and one-time classes.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setApplicationType('recurring')}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${
                    applicationType === 'recurring'
                      ? 'border-[#735e59] bg-[#735e59]/5 shadow-md'
                      : 'border-[#735e59]/20 bg-white hover:border-[#735e59]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${applicationType === 'recurring' ? 'bg-[#735e59] text-white' : 'bg-[#735e59]/10 text-[#735e59]'}`}>
                      <Repeat size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#4a3f3c]">Recurring Events</span>
                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Monthly Auto-Pay</span>
                      </div>
                      <p className="text-sm text-[#6b5f5b]">
                        Classes that repeat on a consistent schedule — e.g. every Wednesday + every other Friday. Billed automatically on the 1st of each month.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {applicationType === 'recurring' && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">How recurring billing works</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
                        <li>Charged on the 1st of every month for that month's scheduled hours.</li>
                        <li>Your first month is prorated — you only pay for occurrences from your start date onward.</li>
                        <li>Months with an extra week (5 Wednesdays instead of 4) are billed at the higher total — you only ever pay for hours actually scheduled.</li>
                        <li>Both you and the Merritt Wellness team receive a billing summary at the start of each month.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Public Calendar Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#735e59]/10 rounded-xl">
                  <Calendar className="text-[#735e59]" size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#4a3f3c] font-serif">Live Availability Calendar</h2>
                <div className="bg-[#735e59]/10 text-[#735e59] text-xs font-medium px-3 py-1 rounded-full">
                  Public Access
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#735e59]/10 overflow-hidden mb-6">
                <iframe
                  src="https://calendar.google.com/calendar/embed?src=c_002ae67fc0cd95665a26d4183a61597bd74447d4760b239bd5135518cf978704%40group.calendar.google.com&ctz=America%2FDenver"
                  className="w-full h-96"
                  title="Public Live Availability Calendar"
                />
              </div>
            </div>

            {/* Multiple Bookings Section — only for single-event applications. */}
            {applicationType === 'single' && (
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#a08b84]/20 rounded-xl">
                    <Users className="text-[#735e59]" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-[#4a3f3c] font-serif">Your Booking(s)</h2>
                  {bookings.length > 1 && (
                    <div className="bg-[#735e59]/10 text-[#735e59] text-xs font-medium px-3 py-1 rounded-full">
                      {bookings.length} Classes
                    </div>
                  )}
                </div>
                <button
                  onClick={addBooking}
                  className="flex items-center gap-2 px-4 py-2 bg-[#735e59] text-[#f2eee9] rounded-xl hover:bg-[#5a4a46] transition-colors"
                  disabled={bookings.length >= 10}
                >
                  <Plus size={16} />
                  Add Class
                </button>
              </div>

              {/* Individual Bookings */}
              {bookings.map((booking, index) => (
                <div key={booking.id} className="border border-[#735e59]/10 rounded-2xl p-6 mb-6 last:mb-0 bg-[#faf8f5]/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[#4a3f3c] font-serif">Class #{index + 1}</h3>
                    {bookings.length > 1 && (
                      <button
                        onClick={() => removeBooking(booking.id)}
                        className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Minus size={14} />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                        Class/Event Name *
                      </label>
                      <input
                        type="text"
                        value={booking.eventName}
                        onChange={(e) => updateBooking(booking.id, 'eventName', e.target.value)}
                        placeholder="e.g., Morning Flow Yoga"
                        className={getInputClassName(`booking_${index}_eventName`)}
                        maxLength={100}
                      />
                      {getFieldError(`booking_${index}_eventName`) && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError(`booking_${index}_eventName`)}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                        Event Type *
                      </label>
                      <select
                        value={booking.eventType}
                        onChange={(e) => updateBooking(booking.id, 'eventType', e.target.value)}
                        className={getInputClassName(`booking_${index}_eventType`)}
                      >
                        <option value="">Select event type...</option>
                        {eventTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                            {type.description ? ` (${type.description})` : ''}
                          </option>
                        ))}
                      </select>
                      {getFieldError(`booking_${index}_eventType`) && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError(`booking_${index}_eventType`)}</p>
                      )}
                    </div>

                    {/* Public vs Private — public events qualify for our collaborative marketing effort */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                        Event Type — Public or Private? *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateBooking(booking.id, 'eventVisibility', 'private')}
                          className={`text-left p-4 rounded-xl border-2 transition-colors ${
                            booking.eventVisibility === 'private'
                              ? 'border-[#735e59] bg-[#735e59]/5'
                              : 'border-[#735e59]/20 hover:border-[#735e59]/40'
                          }`}
                        >
                          <div className="font-semibold text-[#4a3f3c]">🔒 Private</div>
                          <div className="text-xs text-gray-600 mt-1">
                            Invite-only or personal. Not promoted publicly.
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateBooking(booking.id, 'eventVisibility', 'public')}
                          className={`text-left p-4 rounded-xl border-2 transition-colors ${
                            booking.eventVisibility === 'public'
                              ? 'border-[#10b981] bg-[#10b981]/5'
                              : 'border-[#735e59]/20 hover:border-[#10b981]/40'
                          }`}
                        >
                          <div className="font-semibold text-[#4a3f3c]">📣 Public</div>
                          <div className="text-xs text-gray-600 mt-1">
                            Open to the community. Eligible for free collaborative marketing.
                          </div>
                        </button>
                      </div>
                      {getFieldError(`booking_${index}_eventVisibility`) && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError(`booking_${index}_eventVisibility`)}</p>
                      )}

                      {/* Collaborative marketing details — shown once "Public" is chosen */}
                      {booking.eventVisibility === 'public' && (
                        <div className="mt-3 bg-[#10b981]/5 border border-[#10b981]/30 rounded-xl p-4">
                          <div className="flex items-start gap-2">
                            <Info className="text-[#059669] mt-0.5 flex-shrink-0" size={16} />
                            <div className="text-sm text-[#374151]">
                              <p className="font-semibold text-[#059669] mb-1">
                                Great — we'd love to help promote your public event, free of charge.
                              </p>
                              <p className="mb-2"><strong>What we offer:</strong></p>
                              <ul className="list-disc pl-5 space-y-1 mb-2">
                                <li>A printed flyer on the community bulletin board in our wellness space</li>
                                <li>A feature on the "Upcoming Events" tab of our website</li>
                                <li>Help advertising your event on our social media</li>
                              </ul>
                              <p className="mb-1"><strong>What we'll need from you:</strong> a print-ready PDF flyer; an event description, your social media handles, a ticket-purchase link, and an event image (16:10, ~1600×1000px) for the website; and either a collaborator tag or content to share on social.</p>
                              <p className="text-xs text-gray-600 mt-2">
                                No need to gather these now — after you book, we'll email you these exact instructions and the image specs so you can reply with your materials.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={booking.selectedDate}
                        onChange={(e) => {
                          updateBooking(booking.id, 'selectedDate', e.target.value);
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className={getInputClassName(`booking_${index}_selectedDate`)}
                      />
                      {getFieldError(`booking_${index}_selectedDate`) && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError(`booking_${index}_selectedDate`)}</p>
                      )}
                      {/* NEW: Saturday notice */}
                      {isSaturday(booking.selectedDate) && (
                        <p className="text-blue-600 text-sm mt-1 flex items-center gap-1">
                          <Info size={14} />
                          Saturday: Special rates apply
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                        Start Time *
                        {isCheckingAvailability && (
                          <span className="text-sm text-blue-600 ml-2">
                            <Loader2 className="inline w-3 h-3 animate-spin mr-1" />
                            Checking...
                          </span>
                        )}
                      </label>
                      <select
                        value={booking.selectedTime}
                        onChange={(e) => updateBooking(booking.id, 'selectedTime', e.target.value)}
                        className={getInputClassName(`booking_${index}_selectedTime`)}
                        disabled={isCheckingAvailability || Object.keys(availableSlots).length === 0}
                      >
                        <option value="">
                          {isCheckingAvailability ? 'Checking availability...' : 'Select time...'}
                        </option>
                        {timeSlots.map(time => {
                          const isAvailable = availableSlots[time] !== false;
                          const hasAvailabilityData = Object.keys(availableSlots).length > 0;

                          return (
                            <option
                              key={time}
                              value={time}
                              disabled={!isAvailable || !hasAvailabilityData}
                              style={{
                                color: !isAvailable ? '#dc2626' : '#374151',
                                textDecoration: !isAvailable ? 'line-through' : 'none'
                              }}
                            >
                              {time} {!isAvailable ? '(Unavailable - Already Booked)' : hasAvailabilityData ? '' : '(Loading...)'}
                            </option>
                          );
                        })}
                      </select>
                      {getFieldError(`booking_${index}_selectedTime`) && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError(`booking_${index}_selectedTime`)}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                        Duration *
                      </label>
                      <select
                        value={booking.hoursRequested}
                        onChange={(e) => updateBooking(booking.id, 'hoursRequested', e.target.value)}
                        className={getInputClassName(`booking_${index}_hoursRequested`)}
                      >
                        <option value="">Select duration...</option>
                        {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(hours => (
                          <option key={hours} value={hours}>
                            {hours === 0.5 ? '30 minutes' : hours === 1 ? '1 hour' : `${hours} hours`}
                          </option>
                        ))}
                      </select>
                      {getFieldError(`booking_${index}_hoursRequested`) && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError(`booking_${index}_hoursRequested`)}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Please include <strong>all setup and breakdown time</strong> within your booked window. Arriving early or staying past your reserved time may incur additional fees. We share this space as one community—being mindful of your window helps the next group enjoy theirs, just as others will respect yours.
                      </p>
                    </div>

                    {/* Expected Attendees */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                        Expected Attendees *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={130}
                        value={booking.expectedAttendees}
                        onChange={(e) => updateBooking(booking.id, 'expectedAttendees', e.target.value)}
                        placeholder="e.g., 25"
                        className={getInputClassName(`booking_${index}_expectedAttendees`)}
                      />
                      {getFieldError(`booking_${index}_expectedAttendees`) && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError(`booking_${index}_expectedAttendees`)}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Venue capacity: 100 seated / 130 standing. Bookings with <strong>40+ attendees</strong> include a Facility Host (+$30/hr for the entire event) to help the event run smoothly. Recurring partners are exempt on repeat events.
                      </p>
                      {/* Live notice when supervision will apply for this specific booking */}
                      {!exemptFromStaffCoverage &&
                        parseInt(booking.expectedAttendees, 10) >= 40 &&
                        booking.hoursRequested && (
                          <div className="mt-3 bg-teal-50 border border-teal-200 rounded-xl p-3">
                            <div className="flex items-start gap-2">
                              <Users className="text-teal-700 mt-0.5 flex-shrink-0" size={16} />
                              <p className="text-xs text-teal-800">
                                <strong>Facility Host included for this event.</strong>{' '}
                                {`A Facility Host will be on-site for the entire ${booking.hoursRequested}-hour event (+$${(parseFloat(booking.hoursRequested) * 30).toFixed(0)}).`}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Tables & Chairs equipment fees. Each item type is $25 for
                        events under 40 attendees and $50 for 40+, billed per
                        booking and stacking when both are used. Waived on
                        MerrittMagic. */}
                    {(() => {
                      const equipmentFee = (parseInt(booking.expectedAttendees, 10) || 0) >= 40 ? 50 : 25;
                      return (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Tables & Chairs
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={booking.needsTables}
                                onChange={(e) => updateBooking(booking.id, 'needsTables', e.target.checked)}
                                className="mr-3 text-[#735e59]"
                              />
                              <span>Tables needed{waivesEquipmentFees ? '' : ` (+$${equipmentFee})`}</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={booking.needsChairs}
                                onChange={(e) => updateBooking(booking.id, 'needsChairs', e.target.checked)}
                                className="mr-3 text-[#735e59]"
                              />
                              <span>Chairs needed{waivesEquipmentFees ? '' : ` (+$${equipmentFee})`}</span>
                            </label>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {waivesEquipmentFees
                              ? 'Tables and chairs are included at no extra charge with your MerrittMagic partnership.'
                              : 'Each is $25 for events under 40 attendees and $50 for 40+ attendees. Fees stack if you use both.'}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Full-floor mat rental. $100/booking — covers our staff setting
                        up and breaking down the mat — unless the renter is a partner
                        (MerrittMagic), in which case it's free but self-serviced. Either
                        way the setup/breakdown happens within the booked window. */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Full-Floor Mat
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={booking.needsMat}
                          onChange={(e) => updateBooking(booking.id, 'needsMat', e.target.checked)}
                          className="mr-3 text-[#735e59]"
                        />
                        <span>
                          Rent the full-floor roll-out mat{' '}
                          {promoCodeApplied && promoCode.trim() === 'MerrittMagic'
                            ? '(included with partnership)'
                            : '(+$100)'}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        {promoCodeApplied && promoCode.trim() === 'MerrittMagic'
                          ? 'Included at no charge for partners. As a partner, setup and breakdown of the mat are your responsibility and must happen within your reserved time.'
                          : 'A traditional roll-out mat that fills the main hall — great for martial arts, yoga, and sound baths. The $100 fee includes our team setting it up and breaking it down, all within your reserved time.'}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                        Special Notes for This Class
                      </label>
                      <textarea
                        value={booking.specialRequests}
                        onChange={(e) => updateBooking(booking.id, 'specialRequests', e.target.value)}
                        rows={3}
                        placeholder="Equipment needs, setup requirements, etc."
                        className="w-full p-3 border border-[#735e59]/20 rounded-xl focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59] transition-colors resize-none"
                        maxLength={500}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {bookings.length < 10 && (
                <div className="border-2 border-dashed border-[#735e59]/20 rounded-2xl p-6 text-center">
                  <div className="text-[#6b5f5b] mb-2">Planning multiple classes?</div>
                  <button
                    onClick={addBooking}
                    className="text-[#735e59] hover:text-[#5a4a46] font-medium"
                  >
                    + Add another class to save time
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Recurring Schedule Section — only for recurring applications. */}
            {applicationType === 'recurring' && (
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#a08b84]/20 rounded-xl">
                  <Repeat className="text-[#735e59]" size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#4a3f3c] font-serif">Recurring Schedule</h2>
                <div className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                  Monthly Billing
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                    Series / Class Name *
                  </label>
                  <input
                    type="text"
                    value={recurringDetails.eventName}
                    onChange={(e) => updateRecurringDetails('eventName', e.target.value)}
                    placeholder="e.g., Denver Dance Collective"
                    className={getInputClassName('recurring_eventName')}
                    maxLength={100}
                  />
                  {validationErrors.recurring_eventName && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.recurring_eventName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                    Event Type *
                  </label>
                  <select
                    value={recurringDetails.eventType}
                    onChange={(e) => updateRecurringDetails('eventType', e.target.value)}
                    className={getInputClassName('recurring_eventType')}
                  >
                    <option value="">Select event type...</option>
                    {eventTypes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.description ? ` (${t.description})` : ''}
                      </option>
                    ))}
                  </select>
                  {validationErrors.recurring_eventType && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.recurring_eventType}</p>
                  )}
                </div>

                {/* Public vs Private — public series qualify for our collaborative marketing effort */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                    Event Type — Public or Private? *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateRecurringDetails('eventVisibility', 'private')}
                      className={`text-left p-4 rounded-xl border-2 transition-colors ${
                        recurringDetails.eventVisibility === 'private'
                          ? 'border-[#735e59] bg-[#735e59]/5'
                          : 'border-[#735e59]/20 hover:border-[#735e59]/40'
                      }`}
                    >
                      <div className="font-semibold text-[#4a3f3c]">🔒 Private</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Invite-only or personal. Not promoted publicly.
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRecurringDetails('eventVisibility', 'public')}
                      className={`text-left p-4 rounded-xl border-2 transition-colors ${
                        recurringDetails.eventVisibility === 'public'
                          ? 'border-[#10b981] bg-[#10b981]/5'
                          : 'border-[#735e59]/20 hover:border-[#10b981]/40'
                      }`}
                    >
                      <div className="font-semibold text-[#4a3f3c]">📣 Public</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Open to the community. Eligible for free collaborative marketing.
                      </div>
                    </button>
                  </div>
                  {validationErrors.recurring_eventVisibility && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.recurring_eventVisibility}</p>
                  )}

                  {/* Collaborative marketing details — shown once "Public" is chosen */}
                  {recurringDetails.eventVisibility === 'public' && (
                    <div className="mt-3 bg-[#10b981]/5 border border-[#10b981]/30 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <Info className="text-[#059669] mt-0.5 flex-shrink-0" size={16} />
                        <div className="text-sm text-[#374151]">
                          <p className="font-semibold text-[#059669] mb-1">
                            Great — we'd love to help promote your public event series, free of charge.
                          </p>
                          <p className="mb-2"><strong>What we offer:</strong></p>
                          <ul className="list-disc pl-5 space-y-1 mb-2">
                            <li>A printed flyer on the community bulletin board in our wellness space</li>
                            <li>A feature on the "Upcoming Events" tab of our website</li>
                            <li>Help advertising your event on our social media</li>
                          </ul>
                          <p className="mb-1"><strong>What we'll need from you:</strong> a print-ready PDF flyer; an event description, your social media handles, a ticket-purchase link, and an event image (16:10, ~1600×1000px) for the website; and either a collaborator tag or content to share on social.</p>
                          <p className="text-xs text-gray-600 mt-2">
                            No need to gather these now — once your series is set up, we'll email you these exact instructions and the image specs so you can reply with your materials.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                    Typical Expected Attendees *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={130}
                    value={recurringDetails.expectedAttendees}
                    onChange={(e) => updateRecurringDetails('expectedAttendees', e.target.value)}
                    placeholder="e.g., 20"
                    className={getInputClassName('recurring_expectedAttendees')}
                  />
                  {validationErrors.recurring_expectedAttendees && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.recurring_expectedAttendees}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={recurringDetails.startDate}
                    onChange={(e) => updateRecurringDetails('startDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={getInputClassName('recurring_startDate')}
                  />
                  {validationErrors.recurring_startDate && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.recurring_startDate}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={recurringDetails.endDate}
                    onChange={(e) => updateRecurringDetails('endDate', e.target.value)}
                    min={recurringDetails.startDate || new Date().toISOString().split('T')[0]}
                    className={getInputClassName('recurring_endDate')}
                  />
                  <p className="text-xs text-[#6b5f5b] mt-1">
                    Leave blank to book indefinitely. You can cancel the auto-pay at any time by contacting us.
                  </p>
                  {validationErrors.recurring_endDate && (
                    <p className="text-red-600 text-sm mt-1">{validationErrors.recurring_endDate}</p>
                  )}
                </div>
              </div>

              {/* Slot builder — one row per "every X on day Y at time Z". Users
                  can stack multiple slots to model schedules like
                  "every Wed 2hrs + every other Fri 4hrs". */}
              <div className="border-t border-[#735e59]/10 pt-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#4a3f3c] font-serif">Weekly Slots</h3>
                  <button
                    type="button"
                    onClick={addRecurringSlot}
                    className="flex items-center gap-2 px-4 py-2 bg-[#735e59] text-[#f2eee9] rounded-xl hover:bg-[#5a4a46] transition-colors"
                  >
                    <Plus size={16} />
                    Add Slot
                  </button>
                </div>

                <p className="text-sm text-[#6b5f5b] mb-4">
                  Add one row for every repeating time. For example: a slot for "Every Wednesday, 6:00 PM, 2 hours, weekly" and another for "Every Friday, 6:00 PM, 4 hours, every other week".
                </p>

                {recurringSlots.map((slot, idx) => (
                  <div key={slot.id} className="border border-[#735e59]/10 rounded-2xl p-4 mb-3 bg-[#faf8f5]/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-[#4a3f3c]">Slot #{idx + 1}</span>
                      {recurringSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRecurringSlot(slot.id)}
                          className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
                        >
                          <Minus size={14} />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#4a3f3c] mb-1">Day</label>
                        <select
                          value={slot.dayOfWeek}
                          onChange={(e) => updateRecurringSlot(slot.id, 'dayOfWeek', parseInt(e.target.value, 10))}
                          className="w-full p-2 border border-[#735e59]/20 rounded-lg text-sm focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59]"
                        >
                          {DAY_LABELS.map((d, i) => (
                            <option key={i} value={i}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#4a3f3c] mb-1">Start Time</label>
                        <select
                          value={slot.startTime}
                          onChange={(e) => updateRecurringSlot(slot.id, 'startTime', e.target.value)}
                          className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59] ${
                            validationErrors[`recurring_slot_${idx}_startTime`] ? 'border-red-500' : 'border-[#735e59]/20'
                          }`}
                        >
                          {timeSlots.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#4a3f3c] mb-1">Duration (hrs)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="12"
                          value={slot.durationHours}
                          onChange={(e) => updateRecurringSlot(slot.id, 'durationHours', e.target.value)}
                          className={`w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59] ${
                            validationErrors[`recurring_slot_${idx}_durationHours`] ? 'border-red-500' : 'border-[#735e59]/20'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#4a3f3c] mb-1">Frequency</label>
                        <select
                          value={slot.frequency}
                          onChange={(e) => updateRecurringSlot(slot.id, 'frequency', e.target.value as RecurringFrequency)}
                          className="w-full p-2 border border-[#735e59]/20 rounded-lg text-sm focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59]"
                        >
                          <option value="weekly">Every week</option>
                          <option value="biweekly">Every other week</option>
                          <option value="monthly">Once a month</option>
                        </select>
                      </div>
                    </div>

                    {validationErrors[`recurring_slot_${idx}_durationHours`] && (
                      <p className="text-red-600 text-xs mt-2">{validationErrors[`recurring_slot_${idx}_durationHours`]}</p>
                    )}

                    <p className="text-xs text-[#6b5f5b] mt-2">
                      {`${slot.frequency === 'weekly' ? 'Every' : slot.frequency === 'biweekly' ? 'Every other' : 'Once a month on'} ${DAY_LABELS[slot.dayOfWeek]} at ${slot.startTime} for ${slot.durationHours || '—'} hrs`}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                  Special Requests (optional)
                </label>
                <textarea
                  value={recurringDetails.specialRequests}
                  onChange={(e) => updateRecurringDetails('specialRequests', e.target.value)}
                  rows={3}
                  placeholder="Equipment needs, setup requirements, anything we should know about the series..."
                  className="w-full p-3 border border-[#735e59]/20 rounded-xl focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59] resize-none"
                  maxLength={500}
                />
              </div>

              {/* Full-floor mat — free for recurring partners. They handle their
                  own setup/breakdown, always within their reserved time. */}
              <div>
                <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                  Full-Floor Mat
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={recurringDetails.needsMat}
                    onChange={(e) => updateRecurringDetails('needsMat', e.target.checked)}
                    className="mr-3 text-[#735e59]"
                  />
                  <span>Use the full-floor roll-out mat (included for partners)</span>
                </label>
                <p className="text-xs text-[#6b5f5b] mt-2">
                  The traditional roll-out mat that fills the main hall is included at no charge with your recurring partnership. As a partner, setup and breakdown of the mat are your responsibility and must happen within your reserved time.
                </p>
              </div>

              {/* Payment preference — push ACH because it avoids the monthly 3% fee. */}
              <div className="border-t border-[#735e59]/10 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-[#4a3f3c] mb-2 font-serif">Monthly Payment Method</h3>
                <p className="text-sm text-[#6b5f5b] mb-4">
                  You'll be auto-charged on the 1st of every month for that month's hours. We strongly recommend ACH auto-debit to avoid the 3% card processing fee on every monthly charge.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => updateRecurringDetails('paymentPreference', 'ach')}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${
                      recurringDetails.paymentPreference === 'ach'
                        ? 'border-emerald-600 bg-emerald-50 shadow-md'
                        : 'border-[#735e59]/20 bg-white hover:border-[#735e59]/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl ${recurringDetails.paymentPreference === 'ach' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                        <Banknote size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#4a3f3c]">ACH Auto-Debit</span>
                          <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">No Fee</span>
                        </div>
                        <p className="text-sm text-[#6b5f5b]">
                          Connect a bank account once. Monthly charges go through with no 3% processing fee. Recommended for recurring renters.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateRecurringDetails('paymentPreference', 'card')}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${
                      recurringDetails.paymentPreference === 'card'
                        ? 'border-[#735e59] bg-[#735e59]/5 shadow-md'
                        : 'border-[#735e59]/20 bg-white hover:border-[#735e59]/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl ${recurringDetails.paymentPreference === 'card' ? 'bg-[#735e59] text-white' : 'bg-[#735e59]/10 text-[#735e59]'}`}>
                        <CreditCard size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#4a3f3c]">Credit / Debit Card</span>
                          <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">+3% Fee</span>
                        </div>
                        <p className="text-sm text-[#6b5f5b]">
                          Card on file, auto-charged monthly. Stripe adds a 3% processing fee on every monthly charge.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Contact & Payment Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#735e59]/10 rounded-xl">
                  <Mail className="text-[#735e59]" size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#4a3f3c] font-serif">Contact Information</h2>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      className={getInputClassName('contactName')}
                      maxLength={50}
                      placeholder="Your full name"
                    />
                    {getFieldError('contactName') && (
                      <p className="text-red-600 text-sm mt-1">{getFieldError('contactName')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={getInputClassName('email')}
                      maxLength={255}
                      placeholder="your.name@example.com"
                    />
                    {getFieldError('email') && (
                      <p className="text-red-600 text-sm mt-1">{getFieldError('email')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(720) 555-0123"
                      className={getInputClassName('phone')}
                      maxLength={20}
                    />
                    {getFieldError('phone') && (
                      <p className="text-red-600 text-sm mt-1">{getFieldError('phone')}</p>
                    )}
                  </div>

                  {/* NEW: Home Address Field */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                      Home Address *
                    </label>
                    <input
                      type="text"
                      value={formData.homeAddress}
                      onChange={(e) => handleInputChange('homeAddress', e.target.value)}
                      placeholder="123 Main St, Denver, CO 80202"
                      className={getInputClassName('homeAddress')}
                      maxLength={200}
                    />
                    {getFieldError('homeAddress') && (
                      <p className="text-red-600 text-sm mt-1">{getFieldError('homeAddress')}</p>
                    )}
                  </div>

                  {/* Government-issued ID Photo — required */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                      Photo of Government-Issued ID *
                    </label>
                    <p className="text-xs text-[#6b5f5b] mb-2">
                      Upload a clear photo of your driver's license, state ID, or passport. This is required for all renters and is shared only with the Merritt Wellness team.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIdPhotoChange}
                      className={getInputClassName('idPhoto', 'w-full p-3 border rounded-xl transition-colors bg-white file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#735e59] file:text-white file:cursor-pointer')}
                    />
                    {idPhoto && (
                      <div className="mt-2 flex items-center gap-3">
                        {idPhoto.type.startsWith('image/') && (
                          <img
                            src={idPhoto.dataUrl}
                            alt="ID preview"
                            className="h-16 w-16 object-cover rounded-lg border border-[#735e59]/30"
                          />
                        )}
                        <div className="text-xs text-[#4a3f3c]">
                          <div className="font-medium">{idPhoto.name}</div>
                          <div className="text-[#6b5f5b]">{(idPhoto.size / 1024).toFixed(0)} KB</div>
                        </div>
                      </div>
                    )}
                    {getFieldError('idPhoto') && (
                      <p className="text-red-600 text-sm mt-1">{getFieldError('idPhoto')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                      Business Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      placeholder="e.g., Serene Soul Yoga"
                      className={getInputClassName('businessName')}
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* First Event Question - Required */}
                <div className={`border-2 rounded-2xl p-5 ${validationErrors.isFirstEvent ? 'border-red-500 bg-red-50' : 'border-[#735e59]/20 bg-[#faf8f5]'}`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-[#735e59]/10 rounded-xl flex-shrink-0">
                      <Info className="text-[#735e59]" size={18} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-1">
                        Is this your first event at Merritt Wellness? *
                      </label>
                      <p className="text-xs text-[#6b5f5b]">
                        First-hour onboarding assistance ($35) is a one-time fee charged on your first event only — returning renters aren&apos;t charged. Events with 40+ attendees require an on-site supervisor ($30/hr for the entire event) instead. Everyone pays for their first event.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 ml-11">
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                      formData.isFirstEvent === true
                        ? 'bg-[#735e59] text-white'
                        : 'bg-white border border-[#735e59]/20 text-[#4a3f3c] hover:border-[#735e59]/40'
                    }`}>
                      <input
                        type="radio"
                        name="isFirstEvent"
                        checked={formData.isFirstEvent === true}
                        onChange={() => {
                          handleInputChange('isFirstEvent', true);
                          handleInputChange('wantsOnsiteAssistance', false);
                        }}
                        className="sr-only"
                      />
                      <span className="font-medium">Yes, this is my first event</span>
                    </label>

                    <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                      formData.isFirstEvent === false
                        ? 'bg-[#735e59] text-white'
                        : 'bg-white border border-[#735e59]/20 text-[#4a3f3c] hover:border-[#735e59]/40'
                    }`}>
                      <input
                        type="radio"
                        name="isFirstEvent"
                        checked={formData.isFirstEvent === false}
                        onChange={() => handleInputChange('isFirstEvent', false)}
                        className="sr-only"
                      />
                      <span className="font-medium">No, I&apos;ve been here before</span>
                    </label>
                  </div>

                  {validationErrors.isFirstEvent && (
                    <p className="text-red-600 text-sm mt-3 ml-11">{validationErrors.isFirstEvent}</p>
                  )}

                  {/* Required first-hour onboarding box — the $35 onboarding fee
                      is a one-time first-event charge, so this only shows on a
                      first event. Hidden when any booking has 40+ attendees,
                      since the Facility Host replaces onboarding assistance for
                      those events (surfaced inline by the per-booking
                      supervision notice). */}
                  {formData.isFirstEvent === true &&
                    !bookings.some(b => parseInt(b.expectedAttendees, 10) >= EVENT_SUPERVISION_GROUP_THRESHOLD) && (
                    <div className="mt-4 ml-11 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="text-emerald-600 mt-0.5 flex-shrink-0" size={16} />
                        <div>
                          <p className="text-sm font-medium text-emerald-800">First-Hour Onboarding Assistance Included (+$35)</p>
                          <p className="text-xs text-emerald-700 mt-1">
                            A staff member will be available for the first hour to assist with wifi setup, speaker connections, building access, and any questions. We want your first experience to be seamless! This first-event onboarding fee is a one-time charge — you won&apos;t pay it on return visits.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Returning renters aren't charged the onboarding fee, but may
                      opt in to first-hour assistance (unless a 40+ Facility Host
                      already applies). */}
                  {formData.isFirstEvent === false &&
                    !bookings.some(b => parseInt(b.expectedAttendees, 10) >= EVENT_SUPERVISION_GROUP_THRESHOLD) && (
                    <div className="mt-4 ml-11">
                      <label className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                        formData.wantsOnsiteAssistance
                          ? 'bg-[#735e59]/10 border-2 border-[#735e59]'
                          : 'bg-white border-2 border-[#735e59]/20 hover:border-[#735e59]/40'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.wantsOnsiteAssistance}
                          onChange={(e) => handleInputChange('wantsOnsiteAssistance', e.target.checked)}
                          className="mt-1 text-[#735e59] w-5 h-5"
                        />
                        <div>
                          <span className="font-medium text-[#4a3f3c]">Add On-Site Assistance (+$35)</span>
                          <p className="text-xs text-[#6b5f5b] mt-1">
                            Optional for returning renters: the first-event onboarding fee doesn&apos;t apply to you, but you can still have a staff member available to help with wifi, speakers, building access, and any questions during setup. Recommended for events with new equipment or special requirements.
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* REMOVED: Partnership discount section - replaced with informational text */}
                <div className="border-t border-gray-100 pt-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Partnership Pricing Available</h3>
                    <p className="text-blue-800 text-sm mb-2">
                      Regular partners booking 2+ hours per week can benefit from flexible pricing. We can start at a reduced rate and grow with your program to the full rate.
                    </p>
                    <p className="text-blue-800 text-sm font-medium">
                      📞 Call (720) 357-9499 for partnership pricing details
                    </p>
                  </div>
                </div>

                {/* Payment Section — single-event card checkout. Recurring
                    applications pick ACH or card inside the Recurring Schedule
                    card above and skip this block. */}
                {applicationType === 'single' && (
                <div className="border-t border-[#735e59]/10 pt-6">
                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-4 font-serif">Payment</h3>
                  <div className="bg-[#735e59]/5 border-2 border-[#735e59] rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <CreditCard className="text-[#735e59]" size={24} />
                      <div>
                        <span className="font-medium text-[#4a3f3c]">Secure Online Payment</span>
                        <p className="text-sm text-gray-600">Pay securely via Stripe • Instant confirmation</p>
                      </div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="text-orange-600 mt-0.5" size={16} />
                        <div>
                          <p className="text-sm text-orange-800 font-medium">3% Processing Fee</p>
                          <p className="text-xs text-orange-700">
                            Required by Stripe for secure card processing.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>

            {/* Alcohol & Insurance (COI) Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#735e59]/10 rounded-xl">
                  <Wine className="text-[#735e59]" size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#4a3f3c] font-serif">Alcohol at Your Event</h2>
                <div className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full">
                  Required
                </div>
              </div>

              <div className={`border-2 rounded-2xl p-5 ${validationErrors.hasAlcohol ? 'border-red-500 bg-red-50' : 'border-[#735e59]/20 bg-[#faf8f5]'}`}>
                <label className="block text-sm font-medium text-[#4a3f3c] mb-1">
                  Will alcohol be present at your event? *
                </label>
                <p className="text-xs text-[#6b5f5b] mb-4">
                  This includes alcohol that is served, provided, or brought by guests (BYOB).
                </p>

                <div className="flex gap-4">
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                    formData.hasAlcohol === false
                      ? 'bg-[#735e59] text-white'
                      : 'bg-white border border-[#735e59]/20 text-[#4a3f3c] hover:border-[#735e59]/40'
                  }`}>
                    <input
                      type="radio"
                      name="hasAlcohol"
                      checked={formData.hasAlcohol === false}
                      onChange={() => {
                        handleInputChange('hasAlcohol', false);
                        // Drop any uploaded COI + its error when alcohol is no longer present.
                        setCoiDocument(null);
                        setValidationErrors(prev => {
                          const next = { ...prev };
                          delete next.coiDocument;
                          return next;
                        });
                      }}
                      className="sr-only"
                    />
                    <span className="font-medium">No alcohol</span>
                  </label>

                  <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                    formData.hasAlcohol === true
                      ? 'bg-[#735e59] text-white'
                      : 'bg-white border border-[#735e59]/20 text-[#4a3f3c] hover:border-[#735e59]/40'
                  }`}>
                    <input
                      type="radio"
                      name="hasAlcohol"
                      checked={formData.hasAlcohol === true}
                      onChange={() => handleInputChange('hasAlcohol', true)}
                      className="sr-only"
                    />
                    <span className="font-medium">Yes, alcohol will be present</span>
                  </label>
                </div>

                {validationErrors.hasAlcohol && (
                  <p className="text-red-600 text-sm mt-3">{validationErrors.hasAlcohol}</p>
                )}

                {/* Rules + COI requirement — shown only when alcohol is present. */}
                {formData.hasAlcohol === true && (
                  <div className="mt-5 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                        <div className="text-sm text-amber-900">
                          <p className="font-semibold mb-2">Our alcohol policy</p>
                          <ul className="list-disc pl-5 space-y-1.5 text-amber-800">
                            <li><strong>No sales.</strong> Alcohol may not be sold in any way, to any extent, on the premises.</li>
                            <li><strong>Service.</strong> If alcohol is being served, it must be served by a TIPS-certified bartender.</li>
                            <li><strong>BYOB.</strong> Bring-your-own-beverage is allowed.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#4a3f3c] mb-2">
                        Certificate of Insurance (COI) *
                      </label>
                      <p className="text-xs text-[#6b5f5b] mb-2">
                        Because alcohol will be present, you must upload a Certificate of Insurance for general
                        liability that explicitly includes liquor liability, naming Merritt Wellness LLC as an
                        additional insured. This document is required before you can submit and pay for your booking.
                        Accepted formats: PDF or image (max 10 MB).
                      </p>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleCoiDocumentChange}
                        className={getInputClassName('coiDocument', 'w-full p-3 border rounded-xl transition-colors bg-white file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#735e59] file:text-white file:cursor-pointer')}
                      />
                      {coiDocument && (
                        <div className="mt-2 flex items-center gap-3">
                          {coiDocument.type.startsWith('image/') ? (
                            <img
                              src={coiDocument.dataUrl}
                              alt="COI preview"
                              className="h-16 w-16 object-cover rounded-lg border border-[#735e59]/30"
                            />
                          ) : (
                            <div className="h-16 w-16 flex items-center justify-center rounded-lg border border-[#735e59]/30 bg-[#faf8f5]">
                              <FileText className="text-[#735e59]" size={28} />
                            </div>
                          )}
                          <div className="text-xs text-[#4a3f3c]">
                            <div className="font-medium">{coiDocument.name}</div>
                            <div className="text-[#6b5f5b]">{(coiDocument.size / 1024).toFixed(0)} KB</div>
                          </div>
                        </div>
                      )}
                      {getFieldError('coiDocument') && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError('coiDocument')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cancellation Policy Notice */}
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl flex-shrink-0">
                  <CheckCircle className="text-emerald-700" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900 mb-2 font-serif">Cancellation Policy</h3>
                  <div className="space-y-2 text-emerald-800">
                    <p className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600">100% Refund:</span>
                      <span>Cancellations made 90+ days in advance receive a full refund.</span>
                    </p>
                    <p className="text-sm text-emerald-700">
                      For cancellations within 90 days of your event, please contact us directly at (303) 359-8337 to discuss options.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertCircle className="text-red-700" size={20} />
                </div>
                <h2 className="text-xl font-bold text-[#4a3f3c] font-serif">Terms and Conditions</h2>
                <div className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full">
                  Required
                </div>
              </div>

              <div className="border-2 border-[#735e59]/10 rounded-2xl p-6 bg-[#faf8f5] max-h-96 overflow-y-auto mb-4">
                <div className="prose prose-sm max-w-none text-[#6b5f5b] space-y-4">
                  <p className="italic">
                    Please read the material below to make sure all parties understand the requirements of providing for everyone's
                    safety and keeping Merritt Wellness maintained and a safe location for future use.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif">Facility Information & Booking Requirements</h3>

                  <p>
                    Merritt Wellness includes approximately 2,400 square feet total, including the main hall (~1,100 sq ft),
                    additional upstairs areas (bringing the upstairs total to ~1,600 sq ft), and a downstairs level. Seating for 100,
                    accommodates up to 130 standing. Due to the historic nature and value of the building, decorations, types of
                    events, and hours of operations may be handled on a case-by-case basis.
                  </p>

                  <ul className="list-disc pl-5 space-y-2">
                    <li>A signed agreement is due on day of booking for events more than 60 days out for guaranteed booking.</li>
                    <li>
                      The rental fee is due no later than thirty (30) days prior to the first reserved event and then on or before
                      the first for all recurring reservations.
                    </li>
                    <li>
                      Any event serving alcohol requires a Certificate of Insurance (COI) for general liability (see Insurance section
                      below), due no later than ten (10) days prior to your event. For all events, the credit card on file will be held
                      for damages should they occur.
                    </li>
                    <li>
                      Alcohol service is permitted with the proper general liability insurance certificate (COI) provided by you, the
                      Client. Alcohol must be served by TIPS certified bartenders and servers. Additional lawful requirements may apply.
                    </li>
                    <li>
                      The City of Denver's Registered Neighborhood Organization does not allow events to go past 10 P.M. However,
                      there may be some exceptions depending on the type of event.
                    </li>
                  </ul>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Payment Structure</h3>

                  <p>
                    Client agrees to pay Merritt Wellness an hourly rental rate for use of the Premises, based on the number of
                    guests. The standard weekday rate is <strong>$95/hour</strong> for 0–30 guests, <strong>$125/hour</strong> for
                    30–60 guests, and <strong>$155/hour</strong> for 60+ guests, with a two (2) hour minimum for all events.
                    Saturday events are billed at <strong>$200/hour</strong> for 0–30 guests, <strong>$260/hour</strong> for 30–60
                    guests, and <strong>$320/hour</strong> for 60+ guests, with a two (2) hour minimum. Payments made by credit card
                    are subject to a 3% processing surcharge. Payment for recurring rentals is due on or before the first of each month.
                    Failure to submit payment within 30 days of the due date will result in suspension or cancellation of the Client's
                    scheduled class sessions and/or termination of this Agreement at the sole discretion of Merritt Wellness. Any
                    outstanding balance must be paid in full prior to resuming use of the Premises.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">On-Site Assistance &amp; Event Supervision</h3>

                  <p>
                    To help with wifi, speakers, building access, and any questions, on-site support is provided as follows:
                  </p>

                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Events with fewer than 40 attendees:</strong> First-hour onboarding/setup assistance is a flat
                      <strong> $35</strong>, charged once on your first event only, to help with wifi, speakers, building access, and any
                      questions. Returning renters who have been to the space before are not charged this fee, though they may opt in to
                      first-hour assistance.
                    </li>
                    <li>
                      <strong>Events with 40 or more attendees:</strong> A dedicated Event Supervisor (Facility Host) is required at
                      <strong> $30/hour</strong> for the entire duration of the event, in place of standard onboarding assistance —
                      you are never charged for both. The Event Supervisor remains on site for the full length of the event.
                    </li>
                    <li>
                      <strong>Recurring partners:</strong> Renters who use the space 8+ hours per month and qualify for the 20%
                      partnership discount are exempt from the 40+ Event Supervisor requirement on their repeat events. This exemption
                      does not apply to a renter&apos;s first event — every renter, including recurring partners, pays for on-site
                      coverage on their first event. Being a returning renter alone does not make you a recurring partner.
                    </li>
                  </ul>

                  <p>
                    The Event Supervisor / Facility Host requirement is determined by the expected attendee count you provide at the
                    time of booking. Merritt Wellness reserves the right to require event supervision for any event in its sole
                    discretion. The Event Supervisor's role is to safeguard the facility and assist with logistics and does not relieve
                    the Client of responsibility for the conduct, supervision, and safety of their guests.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Missed Class / Cancellation Policy</h3>

                  <p>
                    <strong>Event Cancellations:</strong> Cancellations made 90 or more days in advance of the scheduled event date
                    receive a full refund. For cancellations made within 90 days of your event, please contact Merritt Wellness
                    directly to discuss options. If the full rental payment is not received 90 days prior to your event, Merritt
                    Wellness reserves the right to cancel your reservation without a deposit refund. If circumstances beyond the
                    control of Merritt Wellness force us to cancel your reservation, Merritt Wellness will refund all sums paid.
                  </p>

                  <p>
                    <strong>Recurring Class Sessions:</strong> Client must provide at least 30 days written notice to cancel or
                    reschedule a scheduled class session. If cancellation notice is provided less than 30 days prior to the scheduled
                    session, the full rental fee for that session will be charged. Merritt Wellness is not responsible for rescheduling
                    missed sessions due to late cancellations or participant absence.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Insurance</h3>

                  <p>
                    A Certificate of Insurance (COI) for general liability is required for any event at which alcohol is served, and is
                    due no later than ten (10) days prior to your event. Merritt Wellness may also, at its sole discretion, require a COI
                    for general liability for other higher-risk events. The insurance must, at client's sole expense, provide and
                    maintain public liability and personal property damage insurance, insuring Merritt Wellness LLC and Merritt Wellness
                    employees, contractors and contracted vendors against all bodily injury, property damage, personal injury and other
                    loss arising out of Client's use and occupancy of the premises, or any other occupant on the premises, including
                    appurtenances to the premises and sidewalks.
                  </p>

                  <p>
                    When a COI is required, the insurance shall have a single limit liability of no less than <strong>$1 Million</strong>,
                    and general aggregate liability of not less than <strong>$2 Million</strong>. Merritt Wellness LLC shall be named
                    as an additional insured of said policy. Any caterers and/or outside vendors, companies, and/or institutions serving
                    or providing alcohol MUST provide a copy of their Certificate of Insurance and applicable Catering/Liquor License to
                    Merritt Wellness at least one month prior to the event.
                  </p>

                  <p>
                    Events that do not serve alcohol are not required to carry special event liability insurance. For all events,
                    however, a valid credit card must remain on file for the duration of the event and may be held or charged for
                    damages should they occur.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Smoke-Free Facility</h3>

                  <p>
                    Merritt Wellness is a smoke-free facility. Although the building is equipped with fire sprinklers, the premises is
                    located in a potentially flammable historic building. There is no open flame or frying allowed on site or any
                    cooking that will create a large amount of smoke as our facility is not ventilated. No smoking in any restroom.
                    If smoking materials are discarded in planters, sidewalks or grounds, an extra cleanup charge will be imposed.
                    Any guests violating the smoking restrictions will be asked to leave the premises by the event staff.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Attorney Fees</h3>

                  <p>
                    In the event Merritt Wellness retains the services of an attorney to represent its interests in regard to the lease
                    or to bring an action for the recovery of damages or other charges, the Client agrees to pay a reasonable attorney
                    fee of not less than $500.00 or 20% of the sum sued for, whichever is greater, plus the costs of any legal action.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Lost and Found</h3>

                  <p>
                    Merritt Wellness takes no responsibility for personal effects and possessions left on premises during or after any
                    event. We do, however, maintain a lost and found and will hold recovered items up to 30 days. Every attempt will
                    be made to return any recovered item to its rightful owner.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Promotions and Copyright</h3>

                  <p>
                    It is important to us that you have a fantastic and successful event. Should Merritt Wellness LLC be engaged in
                    the promotion or co-production of your event, it is imperative that we see and approve all marketing messages and
                    communications 30 days prior to the event. We are happy to provide professionally created images and logos of
                    Merritt Wellness for promotional needs. We also reserve the right to take pictures of your event and use them for
                    our marketing and promotional purposes.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Catering, Cleaning, Trash and Equipment Removal</h3>

                  <p>
                    Merritt Wellness will be in a clean condition prior to your event. Upon additional planning with Merritt Wellness,
                    you will need to incorporate your set-up time and clean up time into the rental agreement. You are required to
                    return the space to the same clean condition in which it was found, unless payment for clean-up was made. Otherwise,
                    all trash must be collected, properly bagged and removed by the renter or the caterer and the furniture must be
                    rearranged. Any excessive cleaning required after a class session may result in additional cleaning fees charged
                    to the Client. All rental equipment must be removed that night unless approved otherwise by Merritt Wellness.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Site Decoration</h3>

                  <p>
                    Merritt Wellness wants every event to be a special and welcoming experience. Therefore, every effort will be made
                    to allow renter to prepare decorations reflecting their creative requirements. We ask that only the staff of
                    Merritt Wellness assist with rearranging and moving any furnishings, including artwork, lighting, antiques or
                    seating. No nails, screws, staples or penetrating items should be used on our walls, brick or fine wood. Any tape
                    or gummed backing materials must be properly removed and in an extreme case of any wall damage, the card on file
                    will be charged.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">City, County, State and Federal Laws</h3>

                  <p>
                    Renter agrees to comply with all applicable city, county, State, and Federal laws and shall conduct no illegal act
                    on the premises. This is a drug free and non-smoking facility at all times, NO EXCEPTIONS. Client shall not sell
                    alcohol on premises at any time. Client may not serve alcohol to minors on the premises at any time. Client agrees,
                    for everyone's safety, to ensure alcoholic beverages are consumed in a responsible manner. Merritt Wellness reserves
                    the right, in its exclusive discretion, to expel anyone who in its judgment is intoxicated or under the influence
                    of alcohol or drugs, or who shall in any manner do or participate in any act jeopardizing the rights, use permit,
                    or insurability of Merritt Wellness or the safety of its staff, guests, or building contents.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Liability</h3>

                  <p>
                    Renter agrees to indemnify, defend, and hold Merritt Wellness LLC, its landlord, building owners, officers,
                    employees, and agents harmless of and from any liabilities, costs, penalties, or expenses arising out of and/or
                    resulting from the rental and use of the premises, including but not limited to, the personal guarantee of
                    provision, service, and dispensing of payment by client, its employees, and agents of alcoholic beverages at
                    Merritt Wellness LLC.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Conduct</h3>

                  <p>
                    There is absolutely no drug use or smoking of any kind tolerated on premises or within 25 feet of the building
                    including loitering or congregating outside on the sidewalk at any time during the event. Disparaging remarks or
                    any type of physical violence will not be tolerated and will be cause for immediate expulsion. Client and guests
                    shall use the premises in a considerate manner at all times. Conduct deemed disorderly at the sole discretion of
                    Merritt Wellness LLC staff shall be grounds for immediate expulsion from the premises and conclusion of the rental
                    period. In such cases no refund of the rental fee shall be made.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Termination of Recurring Use Agreement</h3>

                  <p>
                    Either Merritt Wellness or the Client may terminate this recurring use agreement by providing 30 days written
                    notice to the other party. Any outstanding rental fees owed for previously scheduled or completed sessions must
                    be paid in full prior to termination of this Agreement.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Storage</h3>

                  <p>
                    Client may not store equipment, props, supplies, or other materials at Merritt Wellness unless prior written
                    permission has been granted by Merritt Wellness management. Merritt Wellness assumes no responsibility or liability
                    for any items left on the premises. Any unauthorized items left on site may be removed or discarded at the
                    discretion of Merritt Wellness.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Instructor Responsibility</h3>

                  <p>
                    Client assumes full responsibility for the conduct, supervision, and safety of all participants attending their
                    class or activity. Merritt Wellness LLC shall not be held responsible for injuries, accidents, or damages sustained
                    by participants during any class, workshop, or activity conducted by the Client.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Capacity Compliance</h3>

                  <p>
                    Client is responsible for ensuring that the number of participants in any class or session does not exceed the
                    maximum occupancy permitted by Merritt Wellness and local safety regulations.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Payment Regardless of Attendance</h3>

                  <p>
                    Rental fees are based on the reserved time and use of the space, not the number of participants attending the
                    class. Client remains responsible for payment of the full rental fee regardless of attendance levels.
                  </p>

                  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mt-6">
                    <p className="text-sm text-amber-900 font-semibold">
                      Merritt Wellness requires a credit card to be on file during the entirety of your event.
                    </p>
                  </div>

                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mt-6">
                    <p className="text-sm text-blue-900">
                      <strong>Contact Information:</strong><br />
                      Merritt Wellness<br />
                      2246 Irving St, Denver, CO 80211<br />
                      Phone: (303) 359-8337<br />
                      Email: clientservices@merrittwellness.net<br />
                      Web: MerrittWellness.net
                    </p>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className={`border-2 rounded-2xl p-4 ${validationErrors.agreedToTerms ? 'border-red-500 bg-red-50' : 'border-[#735e59]/20 bg-white'
                }`}>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreedToTerms}
                    onChange={(e) => handleInputChange('agreedToTerms', e.target.checked)}
                    className="mt-1 mr-3 text-[#735e59] w-5 h-5"
                  />
                  <span className="text-sm text-[#6b5f5b]">
                    I have read and agree to the <strong>Terms and Conditions</strong> outlined above. I understand the booking timeline,
                    insurance requirements, cancellation policy, and all facility rules. I agree to comply with all policies and acknowledge
                    my responsibilities as outlined in this agreement.
                  </span>
                </label>
                {validationErrors.agreedToTerms && (
                  <p className="text-red-600 text-sm mt-2 ml-8">{validationErrors.agreedToTerms}</p>
                )}
              </div>
            </div>

            {/* Submit Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6">
              <div className="flex flex-col items-center">
                {submitMessage && (
                  <div className={`mb-4 p-4 rounded-xl text-center max-w-md ${submitMessage.includes('✅')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                    }`} role="alert">
                    <p className="text-sm font-medium">{submitMessage}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || isCheckingConflicts || !formData.agreedToTerms}
                  className={`inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold transition-all duration-300 ${!isSubmitting && formData.agreedToTerms
                    ? 'bg-[#735e59] text-[#f2eee9] hover:bg-[#5a4a46] hover:scale-105 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {isCheckingConflicts ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Checking schedule for conflicts…
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {applicationType === 'recurring' ? 'Submitting Application...' : 'Creating Your Booking...'}
                    </>
                  ) : (
                    <>
                      {applicationType === 'recurring'
                        ? <Banknote size={20} />
                        : (applicationType === 'single' && pricing.sponsored)
                          ? <CheckCircle size={20} />
                          : <CreditCard size={20} />}
                      {applicationType === 'recurring'
                        ? 'Submit Recurring Application'
                        : (pricing.sponsored ? 'Confirm Sponsored Booking' : 'Proceed to Secure Payment')}
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                {!formData.agreedToTerms && (
                  <p className="text-sm text-red-600 mt-3 text-center font-medium">
                    Please agree to the Terms and Conditions to continue
                  </p>
                )}

                <p className="text-sm text-gray-500 mt-3 text-center max-w-md">
                  You'll be redirected to our secure Stripe payment page
                </p>
              </div>
            </div>
          </div>
          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1">
            {/* Pricing Summary */}
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6 mb-6 sticky top-24">
              <h3 className="text-lg font-bold text-[#4a3f3c] mb-4 flex items-center font-serif">
                <DollarSign className="mr-2 text-[#735e59]" size={20} />
                {applicationType === 'recurring' ? 'Monthly Billing Estimate' : 'Pricing Summary'}
              </h3>

              {applicationType === 'single' && (
              <div className="mb-4 p-3 bg-[#735e59]/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#4a3f3c]">Total Classes</span>
                  <span className="text-xl font-bold text-[#735e59]">{pricing.totalBookings}</span>
                </div>
                <p className="text-sm text-[#6b5f5b] mt-1">
                  {pricing.totalHours} total hours • $95–$155/hour by guest count
                </p>
              </div>
              )}

              {applicationType === 'recurring' && (
              <div className="mb-4 space-y-3">
                <div className="p-3 bg-[#735e59]/10 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[#4a3f3c]">Weekly Hours</span>
                    <span className="text-xl font-bold text-[#735e59]">{recurringPricing.weeklyHours.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-[#6b5f5b]">Across {recurringSlots.length} recurring slot{recurringSlots.length === 1 ? '' : 's'} at ${recurringPricing.hourlyRate}/hr{recurringPricing.hasSaturdaySlot ? ` • $${recurringPricing.saturdayHourlyRate}/hr Saturdays` : ''}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#735e59]/10">
                  <p className="text-sm font-medium text-[#4a3f3c] mb-2">Typical Monthly Charge</p>
                  <p className="text-sm text-[#6b5f5b]">
                    ${recurringPricing.monthlyMinCharge.toFixed(0)} – ${recurringPricing.monthlyMaxCharge.toFixed(0)}
                    <span className="text-xs text-[#a08b84]"> (varies w/ 4 vs 5-week months)</span>
                  </p>
                  <p className="text-xs text-[#6b5f5b] mt-1">
                    {recurringPricing.monthlyMinHours}–{recurringPricing.monthlyMaxHours} hours/month
                  </p>
                </div>

                {recurringDetails.startDate && recurringPricing.firstMonthHours > 0 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-sm font-medium text-emerald-900 mb-1">First Month (Prorated)</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-800">{recurringPricing.firstMonthHours.toFixed(1)} hrs{recurringPricing.hasSaturdaySlot ? ' (incl. Saturday rate)' : ` × $${recurringPricing.hourlyRate}`}</span>
                      <span className="font-bold text-emerald-900">${recurringPricing.firstMonthCharge.toFixed(2)}</span>
                    </div>
                    {recurringPricing.firstMonthFee > 0 && (
                      <p className="text-xs text-orange-700 mt-1">+${recurringPricing.firstMonthFee.toFixed(2)} Stripe fee (card)</p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-200">
                      <span className="text-sm font-medium text-emerald-900">Due at start</span>
                      <span className="font-bold text-emerald-900">${recurringPricing.firstMonthTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <p className="font-medium mb-1">
                    {recurringPricing.paymentPreference === 'ach' ? '🏦 ACH Auto-Debit Selected' : '💳 Card Auto-Charge Selected'}
                  </p>
                  <p className="text-blue-800">
                    {recurringPricing.paymentPreference === 'ach'
                      ? 'Charged on the 1st of each month. No processing fees.'
                      : 'Charged on the 1st of each month. A 3% Stripe fee is added to every charge — switch to ACH to avoid it.'}
                  </p>
                </div>
              </div>
              )}

              {/* Promo Code Section — single-event only. Recurring pricing is
                  hour-based monthly with no promo layer. */}
              {applicationType === 'single' && (
              <div className="mb-4 p-3 bg-[#faf8f5] rounded-xl border border-[#735e59]/10">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="text-[#735e59]" size={16} />
                  <span className="font-medium text-[#4a3f3c] text-sm">Promo Code</span>
                </div>
                {!promoCodeApplied ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value);
                          setPromoCodeError('');
                        }}
                        placeholder="Enter code"
                        className="flex-1 p-2 text-sm border border-[#735e59]/20 rounded-lg focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59]"
                      />
                      <button
                        onClick={applyPromoCode}
                        className="px-3 py-2 bg-[#735e59] text-white text-sm rounded-lg hover:bg-[#5a4a46] transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    {promoCodeError && (
                      <p className="text-red-600 text-xs">{promoCodeError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={16} />
                      <span className="text-green-800 text-sm font-medium">{promoCode}</span>
                    </div>
                    <button
                      onClick={removePromoCode}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              )}

              {applicationType === 'single' && (
              <>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Base Amount ({pricing.totalHours} hrs)</span>
                  <span className="font-medium">${pricing.baseAmount.toFixed(2)}</span>
                </div>

                {pricing.saturdayCharges > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Saturday Charges</span>
                    <span>+${pricing.saturdayCharges.toFixed(2)}</span>
                  </div>
                )}

                {pricing.matRentalFee > 0 && (
                  <div className="flex justify-between text-indigo-600">
                    <span>Full-Floor Mat{pricing.matRentalCount > 1 ? ` (×${pricing.matRentalCount})` : ''}</span>
                    <span>+${pricing.matRentalFee.toFixed(2)}</span>
                  </div>
                )}

                {pricing.matWaived && (
                  <div className="flex justify-between text-green-600">
                    <span>Full-Floor Mat (partner)</span>
                    <span>Included</span>
                  </div>
                )}

                {pricing.onsiteAssistanceFee > 0 && (
                  <div className="flex justify-between text-teal-600">
                    <span>Onboarding Assistance (First Hour){pricing.isFirstEvent ? ' — First Event' : ''}</span>
                    <span>+${pricing.onsiteAssistanceFee.toFixed(2)}</span>
                  </div>
                )}

                {pricing.eventSupervisionFee > 0 && (
                  <div className="flex justify-between text-teal-700">
                    <span>
                      Facility Host — entire event ({pricing.eventSupervisionHours} hr × ${pricing.eventSupervisionRate})
                    </span>
                    <span>+${pricing.eventSupervisionFee.toFixed(2)}</span>
                  </div>
                )}

                {pricing.tablesChairsFees > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Tables &amp; Chairs</span>
                    <span>+${pricing.tablesChairsFees.toFixed(2)}</span>
                  </div>
                )}

                {pricing.promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600 border-t pt-2">
                    <span>{pricing.promoDescription}</span>
                    <span>-${pricing.promoDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Subtotal</span>
                  <span>${pricing.subtotal.toFixed(2)}</span>
                </div>

                {formData.paymentMethod === 'card' && pricing.stripeFee > 0 && (
                  <div className="flex justify-between text-orange-600 border-t pt-2">
                    <span>Processing Fee (3% - Stripe)</span>
                    <span>+${pricing.stripeFee.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#735e59]/10">
                <span className="font-medium text-[#4a3f3c]">Total Amount</span>
                <span className="text-xl font-bold text-[#735e59]">
                  ${pricing.total.toFixed(2)}
                </span>
              </div>

              {pricing.sponsored ? (
                <div className="mt-3 text-xs bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3">
                  <p className="text-emerald-900">
                    <strong>🎁 Sponsored Event:</strong> This booking is fully sponsored — there are <strong>no fees</strong> and <strong>no card is required</strong>. Your total is <strong>$0.00</strong>. You&apos;ll be confirmed immediately, no payment step.
                  </p>
                </div>
              ) : (
                <>
                  {pricing.promoDiscount > 0 && (
                    <div className="mt-3 text-xs bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-green-800">
                        <strong>🎉 Promo Applied:</strong> You&apos;re saving ${pricing.promoDiscount.toFixed(2)} with code &quot;{pricing.promoCode}&quot;
                      </p>
                    </div>
                  )}

                  <div className="mt-3 text-xs">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-orange-800">
                        <strong>💳 Card Payment:</strong> 3% processing fee applies (Stripe requirement).
                        Total you pay: <strong>${pricing.total.toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>
                </>
              )}

              {pricing.minimumApplied && (
                <div className="mt-3 text-xs bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800">
                    <strong>ℹ️ Minimums Applied:</strong> 2-hour minimum per single event
                  </p>
                </div>
              )}

              {pricing.eventSupervisionFee > 0 && (
                <div className="mt-3 text-xs bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p className="text-teal-800">
                    <strong>👥 Facility Host Included:</strong> Because this booking has {pricing.eventSupervisionThreshold}+ attendees, a Facility Host is included at ${pricing.eventSupervisionRate}/hr for the entire event. Recurring partners are exempt on repeat events.
                  </p>
                </div>
              )}
              </>
              )}
            </div>

            {/* Security & Trust */}
            <div className="bg-white rounded-3xl shadow-lg border border-[#735e59]/10 p-6 mb-6">
              <h3 className="font-bold text-[#4a3f3c] mb-4 font-serif">Security & Trust</h3>
              <div className="space-y-3 text-sm text-[#6b5f5b]">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">🔒</span>
                  <span>SSL encrypted & PCI compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">🛡️</span>
                  <span>Stripe-powered security</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-600">📱</span>
                  <span>Multiple payment options</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-600">👥</span>
                  <span>Trusted by 500+ professionals</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gradient-to-br from-[#f2eee9] to-[#faf8f5] rounded-3xl p-6 border border-[#735e59]/10">
              <h3 className="font-bold text-[#4a3f3c] mb-3 font-serif">Questions?</h3>
              <p className="text-sm text-[#6b5f5b] mb-4">
                We're here to help create the perfect experience for your classes.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[#4a3f3c]">
                  <Phone size={14} className="text-[#735e59]" />
                  <span>(720) 357-9499</span>
                </div>
                <div className="flex items-center gap-2 text-[#4a3f3c]">
                  <Mail size={14} className="text-[#735e59]" />
                  <span>manager@merrittwellness.net</span>
                </div>
              </div>
              <p className="text-xs text-[#a08b84] mt-4">
                💡 Call for partnership pricing & bulk discounts!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Recurring schedule conflict modal =====
          Surfaced after the renter clicks Submit on a recurring application
          if the calendar scan finds overlaps in the next 3 months. Each row
          can be Skipped (drop the occurrence) or Moved (reschedule to a new
          date/time). "Submit Anyway" forwards the exceptions list with the
          booking and the monthly invoicer honors them. */}
      {conflictModalOpen && recurringConflicts && recurringConflicts.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl shadow-xl border border-[#735e59]/10 w-full max-w-3xl my-8">
            <div className="p-6 border-b border-[#735e59]/10 flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={24} />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[#4a3f3c] font-serif">Schedule Conflicts Found</h2>
                <p className="text-sm text-[#6b5f5b] mt-1">
                  We found {recurringConflicts.length} {recurringConflicts.length === 1 ? 'date' : 'dates'} in the next 3 months where your time would overlap an existing booking. Choose how to handle each — you can skip the date, move it, or keep it as-is and we&apos;ll sort it out together. <span className="font-medium text-[#4a3f3c]">Billing happens monthly on the 1st, so skipped dates are simply not billed.</span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setConflictModalOpen(false)}
                className="text-[#a08b84] hover:text-[#4a3f3c] text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
              {recurringConflicts.map((c, idx) => {
                const exception = getException(c.date, c.slotIdx);
                const action = exception?.action ?? 'keep';
                const niceDate = (() => {
                  const [y, m, d] = c.date.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  });
                })();
                const fmtMins = (mins: number) => {
                  const h24 = Math.floor(mins / 60);
                  const m = mins % 60;
                  const period = h24 >= 12 ? 'PM' : 'AM';
                  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
                  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
                };
                return (
                  <div key={`${c.date}-${c.slotIdx ?? 'all'}-${idx}`} className="border border-[#735e59]/10 rounded-2xl p-4 bg-[#faf8f5]">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
                      <div className="font-semibold text-[#4a3f3c]">{niceDate}</div>
                      <div className="text-sm text-[#6b5f5b]">
                        Your slot: {c.startTime} for {c.durationHours}h
                      </div>
                    </div>
                    <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                      Conflicts with <span className="font-medium">{c.conflictWith.summary}</span>
                      {' '}({fmtMins(c.conflictWith.startMinutes)}–{fmtMins(c.conflictWith.endMinutes)})
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => clearException(c.date, c.slotIdx)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          action === 'keep'
                            ? 'bg-[#735e59] text-white border-[#735e59]'
                            : 'bg-white text-[#4a3f3c] border-[#735e59]/20 hover:bg-[#735e59]/5'
                        }`}
                      >
                        Keep as scheduled
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setException({
                            date: c.date,
                            slotIdx: c.slotIdx,
                            action: 'skip',
                            reason: 'calendar conflict',
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          action === 'skip'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-[#4a3f3c] border-[#735e59]/20 hover:bg-red-50'
                        }`}
                      >
                        Skip this date
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setException({
                            date: c.date,
                            slotIdx: c.slotIdx,
                            action: 'reschedule',
                            newDate: exception?.newDate || c.date,
                            newStartTime: exception?.newStartTime || c.startTime || undefined,
                            reason: 'calendar conflict',
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          action === 'reschedule'
                            ? 'bg-[#735e59] text-white border-[#735e59]'
                            : 'bg-white text-[#4a3f3c] border-[#735e59]/20 hover:bg-[#735e59]/5'
                        }`}
                      >
                        Move to a different date
                      </button>
                    </div>

                    {action === 'reschedule' && (
                      <div className="mt-3 grid sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-xs text-[#6b5f5b] mb-1">New date</span>
                          <input
                            type="date"
                            value={exception?.newDate || ''}
                            onChange={(e) =>
                              setException({
                                date: c.date,
                                slotIdx: c.slotIdx,
                                action: 'reschedule',
                                newDate: e.target.value,
                                newStartTime: exception?.newStartTime || c.startTime || undefined,
                                reason: 'calendar conflict',
                              })
                            }
                            className="w-full p-2 border border-[#735e59]/20 rounded-lg text-sm focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59]"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-xs text-[#6b5f5b] mb-1">New start time</span>
                          <select
                            value={exception?.newStartTime || c.startTime || ''}
                            onChange={(e) =>
                              setException({
                                date: c.date,
                                slotIdx: c.slotIdx,
                                action: 'reschedule',
                                newDate: exception?.newDate || c.date,
                                newStartTime: e.target.value,
                                reason: 'calendar conflict',
                              })
                            }
                            className="w-full p-2 border border-[#735e59]/20 rounded-lg text-sm focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59]"
                          >
                            {[
                              '6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
                              '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
                              '6:00 PM','7:00 PM','8:00 PM',
                            ].map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-[#735e59]/10 flex flex-wrap gap-3 justify-end items-center bg-[#faf8f5] rounded-b-3xl">
              <p className="text-xs text-[#6b5f5b] mr-auto">
                We&apos;ll save your choices on this application. Skipped dates aren&apos;t billed; rescheduled dates take their place.
              </p>
              <button
                type="button"
                onClick={() => setConflictModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-[#735e59]/20 text-[#4a3f3c] hover:bg-[#735e59]/5"
              >
                Back to form
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setConflictModalOpen(false);
                  handleSubmit(true);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#735e59] text-white hover:bg-[#4a3f3c] disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}