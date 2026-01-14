'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Mail, Phone, CreditCard, CheckCircle, MapPin, ArrowRight, Loader2, AlertCircle, Star, TrendingUp, Plus, Minus, DollarSign, Info, Tag } from 'lucide-react';

export default function BookingPage() {
  const [availableSlots, setAvailableSlots] = useState({});
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Enhanced multiple bookings state
  const [bookings, setBookings] = useState([{
    id: 1,
    eventName: '',
    eventType: '',
    selectedDate: '',
    selectedTime: '',
    hoursRequested: '',
    specialRequests: '',
    needsSetupHelp: false,
    needsTeardownHelp: false
  }]);

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
    wantsOnsiteAssistance: false // Optional: Add on-site assistance if not first event
  });

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeApplied, setPromoCodeApplied] = useState(false);
  const [promoCodeError, setPromoCodeError] = useState('');

  // Valid promo codes configuration
  const VALID_PROMO_CODES = {
    'MerrittMagic': { discount: 0.20, description: 'Partnership Discount (20% off)' }
  };

  // Business-focused event types
  const eventTypes = [
    {
      id: 'yoga-class',
      name: 'Yoga Classes',
      description: 'Vinyasa, Hatha, Restorative, Hot Yoga',
      icon: '🧘‍♀️',
      popular: true
    },
    {
      id: 'meditation',
      name: 'Meditation & Mindfulness',
      description: 'Guided meditation, breathwork, sound healing',
      icon: '🕯️'
    },
    {
      id: 'fitness',
      name: 'Fitness Classes',
      description: 'Pilates, barre, strength training, cardio',
      icon: '💪'
    },
    {
      id: 'martial-arts',
      name: 'Martial Arts',
      description: 'Judo, BJJ, wrestling, self-defense',
      icon: '🥋',
      popular: true
    },
    {
      id: 'dance',
      name: 'Dance Classes',
      description: 'Contemporary, ballroom, salsa, hip-hop',
      icon: '💃'
    },
    {
      id: 'workshop',
      name: 'Workshops & Seminars',
      description: 'Educational events, team building',
      icon: '📚'
    },
    {
      id: 'therapy',
      name: 'Therapy & Healing',
      description: 'Art therapy, sound baths, energy work',
      icon: '🌟'
    },
    {
      id: 'private-event',
      name: 'Private Events',
      description: 'Birthday parties, celebrations, retreats',
      icon: '🎉'
    },
    {
      id: 'other',
      name: 'Other Wellness Practice',
      description: 'Tell us about your unique offering',
      icon: '✨'
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


  // FIXED: Enhanced email validation
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  // FIXED: Enhanced phone validation
  const validatePhone = (phone) => {
    if (!phone.trim()) return true; // Phone is optional
    const phoneRegex = /^[\+]?[1-9]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.trim());
  };

  // CRITICAL: Enhanced availability checking with strict error handling
  const checkAvailability = async (date) => {
    if (!date) return;

    setIsCheckingAvailability(true);
    setAvailableSlots({});

    try {
      console.log('🔍 Checking availability for:', date);
      const response = await fetch(`/api/check-availability?date=${date}`);
      const data = await response.json();

      if (response.ok && data.availability) {
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
          calendar: data.message || 'Unable to check availability. Please try a different date or contact us.'
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

    if (formData.phone.trim() && !validatePhone(formData.phone)) {
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

  // Pricing calculations with Saturday rates and setup/teardown
  const HOURLY_RATE = 95;
  const SATURDAY_RATE = 200; // All Saturday events
  const SETUP_TEARDOWN_FEE = 50; // Per service
  const ON_SITE_ASSISTANCE_FEE = 35; // First-time event or optional add-on
  const STRIPE_FEE_PERCENTAGE = 3;

  const calculatePricing = () => {
    let totalHours = 0;
    let totalBookings = 0;
    let minimumApplied = false;
    let saturdayCharges = 0;
    let setupTeardownFees = 0;
    let onsiteAssistanceFee = 0;

    bookings.forEach(booking => {
      if (booking.hoursRequested) {
        let hours = parseFloat(booking.hoursRequested) || 0;
        const isSat = isSaturday(booking.selectedDate);

        // Apply minimums per booking (2-hour minimum for all events)
        if (!formData.isRecurring && hours < 2) {
          hours = 2;
          minimumApplied = true;
        }

        // Calculate Saturday charges ($200/hr for all Saturday events)
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
      }
    });

    // Calculate on-site assistance fee (first event = required, otherwise optional)
    if (formData.isFirstEvent === true || formData.wantsOnsiteAssistance) {
      onsiteAssistanceFee = ON_SITE_ASSISTANCE_FEE;
    }

    const baseAmount = totalHours * HOURLY_RATE;
    const preDiscountSubtotal = baseAmount + saturdayCharges + setupTeardownFees + onsiteAssistanceFee;

    // Apply promo code discount
    let promoDiscount = 0;
    let promoDescription = '';
    if (promoCodeApplied && promoCode.trim() && VALID_PROMO_CODES[promoCode.trim()]) {
      const promoData = VALID_PROMO_CODES[promoCode.trim()];
      promoDiscount = Math.round(preDiscountSubtotal * promoData.discount);
      promoDescription = promoData.description;
    }

    const subtotal = preDiscountSubtotal - promoDiscount;
    const stripeFee = formData.paymentMethod === 'card'
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
      isFirstEvent: formData.isFirstEvent,
      wantsOnsiteAssistance: formData.wantsOnsiteAssistance,
      preDiscountSubtotal,
      promoDiscount,
      promoDescription,
      promoCode: promoCodeApplied ? promoCode.trim() : '',
      subtotal,
      stripeFee,
      total,
      minimumApplied,
      paymentMethod: formData.paymentMethod
    };
  };

  // Multiple booking management functions
  const addBooking = () => {
    const newId = Math.max(...bookings.map(b => b.id)) + 1;
    setBookings([...bookings, {
      id: newId,
      eventName: '',
      eventType: '',
      selectedDate: '',
      selectedTime: '',
      hoursRequested: '',
      specialRequests: '',
      needsSetupHelp: false,
      needsTeardownHelp: false
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

  const pricing = calculatePricing();

  const getFieldError = (fieldName) => {
    return validationErrors[fieldName];
  };

  const getInputClassName = (fieldName, baseClassName = "w-full p-3 border rounded-xl transition-colors") => {
    const hasError = validationErrors[fieldName];
    return hasError
      ? `${baseClassName} border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500`
      : `${baseClassName} border-[#735e59]/20 focus:ring-2 focus:ring-[#735e59] focus:border-[#735e59]`;
  };

  const handleSubmit = async () => {
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

    setIsSubmitting(true);

    try {
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

      const submissionData = {
        bookings: validBookings,
        contactInfo: formData,
        pricing: pricing
      };

      console.log('🚀 Submitting booking data:', {
        bookingCount: validBookings.length,
        email: formData.email,
        paymentMethod: formData.paymentMethod
      });

      const bookingResponse = await fetch('/api/booking-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const bookingResult = await bookingResponse.json();

      if (bookingResponse.ok && bookingResult.success) {
        console.log('✅ Booking created successfully:', bookingResult);
        window.location.href = `/booking/payment?booking_id=${bookingResult.id}`;
      } else {
        throw new Error(bookingResult.error || 'Failed to create booking');
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
            <span className="font-semibold text-[#735e59]"> $95/hour • Flexible pricing for partners</span>
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
                  <span><strong>Standard Rate:</strong> $95/hour with a 2-hour minimum for all events.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Saturday Rentals:</strong> All Saturday events are $200/hour with a 2-hour minimum.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>First-Time Users:</strong> On-site assistance ($35) is required for all first-time renters to help with wifi, speakers, building access, and any questions. Returning users can optionally add this service.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Setup & Cleanup:</strong> All rental times must include your own setup and cleanup. Space must be returned in the condition you found it.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">•</span>
                  <span><strong>Assistance Available:</strong> Need help? Setup and/or teardown assistance available for $50 each (1 hour per service) or $100 for both.</span>
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

            {/* Multiple Bookings Section */}
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
                        Practice Type *
                      </label>
                      <select
                        value={booking.eventType}
                        onChange={(e) => updateBooking(booking.id, 'eventType', e.target.value)}
                        className={getInputClassName(`booking_${index}_eventType`)}
                      >
                        <option value="">Select your practice...</option>
                        {eventTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.icon} {type.name}
                            {type.popular ? ' (Popular!)' : ''}
                          </option>
                        ))}
                      </select>
                      {getFieldError(`booking_${index}_eventType`) && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError(`booking_${index}_eventType`)}</p>
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
                        {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 11, 12].map(hours => (
                          <option key={hours} value={hours}>
                            {hours === 0.5 ? '30 minutes' : hours === 1 ? '1 hour' : `${hours} hours`}
                          </option>
                        ))}
                      </select>
                      {getFieldError(`booking_${index}_hoursRequested`) && (
                        <p className="text-red-600 text-sm mt-1">{getFieldError(`booking_${index}_hoursRequested`)}</p>
                      )}
                    </div>

                    {/* NEW: Setup/Teardown Options */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Setup & Teardown Assistance
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={booking.needsSetupHelp}
                            onChange={(e) => updateBooking(booking.id, 'needsSetupHelp', e.target.checked)}
                            className="mr-3 text-[#735e59]"
                          />
                          <span>Setup assistance needed (+$50)</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={booking.needsTeardownHelp}
                            onChange={(e) => updateBooking(booking.id, 'needsTeardownHelp', e.target.checked)}
                            className="mr-3 text-[#735e59]"
                          />
                          <span>Teardown assistance needed (+$50)</span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Each service includes 1 hour of assistance. By default, you're responsible for your own setup/cleanup.
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
                      Phone (Optional)
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
                        First-time events include on-site assistance ($35) to help with wifi, speakers, building access, and any questions during setup.
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

                  {/* First event info box */}
                  {formData.isFirstEvent === true && (
                    <div className="mt-4 ml-11 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="text-emerald-600 mt-0.5 flex-shrink-0" size={16} />
                        <div>
                          <p className="text-sm font-medium text-emerald-800">On-Site Assistance Included (+$35)</p>
                          <p className="text-xs text-emerald-700 mt-1">
                            A staff member will be available to assist with wifi setup, speaker connections, building access, and answer any questions during your event setup. We want your first experience to be seamless!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Optional on-site assistance for returning clients */}
                  {formData.isFirstEvent === false && (
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
                            Optional: Have a staff member available to help with wifi, speakers, building access, and any questions during setup. Recommended for events with new equipment or special requirements.
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

                {/* Payment Section - Card Only */}
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
                      <span>Cancellations made 60+ days in advance receive a full refund.</span>
                    </p>
                    <p className="text-sm text-emerald-700">
                      For cancellations within 60 days of your event, please contact us directly at (720) 357-9499 to discuss options.
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
                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif">Facility Information & Booking Terms</h3>

                  <p>
                    <strong>Facility Specifications:</strong> 2,000 square feet space with seating for 100, accommodates up to 130 standing room.
                    Due to the historical age and nature of our building and its historical value, accessibility, decorations, types of events,
                    and hours of operations will be handled on a case-by-case basis.
                  </p>

                  <p>
                    <strong>Booking Timeline:</strong> 60 days out for guaranteed booking. The balance of your space rental fee is due sixty (60)
                    days prior to your event. A copy of your Special Event Liability Insurance (see Insurance Section below) is due no later than
                    ten (10) days prior to your event. Otherwise, the credit card on file will be held for damages should they occur.
                  </p>

                  <p>
                    <strong>Alcohol Service:</strong> Alcohol service is permitted with the proper general liability insurance certificate provided
                    by you the client. The alcohol must be served by TIPS certified bartenders and servers.
                  </p>

                  <p>
                    <strong>Event Hours:</strong> The City of Denver registered Neighborhood Organization does not allow events to go past 10 P.M.
                    However, there may be some exceptions depending on the type of event.
                  </p>

                  <p>
                    <strong>Cancellation Policy:</strong> Neither the reservation deposit nor the final guaranteed booking payment is refundable.
                    Any cancellations may cause the loss of additional bookings or business on that previously reserved date by you. If circumstances
                    beyond the control of Merritt Wellness force us to cancel your reservation, Merritt Wellness will refund all sums paid. If the
                    full rental payment is not received 60 days prior to your event, Merritt Wellness reserves the right to cancel your reservation
                    without a deposit refund.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Insurance Requirements</h3>

                  <p>
                    <strong>Special Event Liability Insurance:</strong> Required of ALL clients and is due no later than ten (10) days prior to your
                    event. The insurance must, at client's sole expense, provide and maintain public liability and personal property damage insurance,
                    insuring Merritt Wellness LLC and Merritt Wellness employees, contractors and contracted vendors against all bodily injury,
                    property damage, personal injury and other loss arising out of client's use and occupancy of the premises, or any other occupant
                    on the premises, including appurtenances to the premises and sidewalks.
                  </p>

                  <p>
                    The insurance required hereunder shall have a single limit liability of no less than <strong>$1 Million</strong>, and general
                    aggregate liability of not less than <strong>$2 Million</strong>. Merritt Wellness LLC shall be named as an additional insured
                    of said policy.
                  </p>

                  <p>
                    Any caterers and/or outside vendors, companies, and/or institutions MUST provide a copy of their Certificate and Catering License
                    to Merritt Wellness at least one month prior to the event.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Facility Rules & Safety</h3>

                  <p>
                    <strong>Smoke-Free Facility:</strong> Merritt Wellness is a smoke-free facility. Although the building is equipped with fire
                    sprinklers, the premises is located in a potentially flammable historic building. There is no open flame or frying allowed on
                    site or any cooking that will create a large amount of smoke as our facility is not ventilated. No smoking in any restroom.
                    If smoking materials are discarded in planters, sidewalks or grounds, an extra cleanup charge will be imposed. Any guests
                    violating the smoking restrictions will be asked to leave the premises by the event staff.
                  </p>

                  <p>
                    <strong>Drug-Free Environment:</strong> There is absolutely no drug use or smoking of any kind tolerated on premises or within
                    25 feet of the building including loitering or congregating outside on the sidewalk at any time during the event.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Legal & Liability</h3>

                  <p>
                    <strong>Attorney Fees:</strong> In the event Merritt Wellness retains the services of an attorney to represent its interests
                    in regard to the lease or to bring an action for the recovery of damages or other charges, the Client agrees to pay a reasonable
                    attorney fee of not less than $500.00 or 20% of the sum sued for, whichever is greater, plus the costs of any legal action.
                  </p>

                  <p>
                    <strong>Lost and Found:</strong> Merritt Wellness takes no responsibility for personal effects and possessions left on premises
                    during or after any event. We do, however, maintain a lost and found and will hold recovered items up to 30 days.
                  </p>

                  <p>
                    <strong>City, County, State and Federal Laws:</strong> Renter agrees to comply with all applicable city, county, State, and
                    Federal laws and shall conduct no illegal act on the premises. This is a drug free and non-smoking facility at all times,
                    NO EXCEPTIONS. Client shall not sell alcohol on premises at any time. Client may not serve alcohol to minors on the premises
                    at any time. Client agrees, for everyone's safety, to ensure alcoholic beverages are consumed in a responsible manner.
                  </p>

                  <p>
                    Merritt Wellness reserves the right, in its exclusive discretion, to expel anyone who in its judgment is intoxicated or under
                    the influence of alcohol or drugs, or who shall in any manner do or participate in any act jeopardizing the rights, use permit,
                    or insurability of Merritt Wellness or the safety of its staff, guests, or building contents.
                  </p>

                  <p>
                    <strong>Liability:</strong> Renter agrees to indemnify, defend, and hold Merritt Wellness LLC, its landlord, building owners,
                    officers, employees, and agents harmless of and from any liabilities, costs, penalties, or expenses arising out of and/or
                    resulting from the rental and use of the premises, including but not limited to, the personal guarantee of provision, service,
                    and dispensing of payment by client, its employees, and agents of alcoholic beverages at Merritt Wellness LLC.
                  </p>

                  <p>
                    <strong>Conduct:</strong> Disparaging remarks or any type of physical violence will not be tolerated and will be cause for
                    immediate expulsion. Client and guests shall use the premises in a considerate manner at all times. Conduct deemed disorderly
                    at the sole discretion of Merritt Wellness LLC staff shall be grounds for immediate expulsion from the premises and conclusion
                    of the rental period. In such cases no refund of the rental fee shall be made.
                  </p>

                  <h3 className="text-lg font-semibold text-[#4a3f3c] mb-3 font-serif mt-6">Catering, Cleaning & Decorations</h3>

                  <p>
                    <strong>Promotions and Copyright:</strong> Should Merritt Wellness LLC be engaged in the promotion or co-production of your
                    event, it is imperative that we see and approve all marketing messages and communications 30 days prior to the event. We are
                    happy to provide professionally created images and logos of Merritt Wellness for promotional needs. We also reserve the right
                    to take pictures of your event and use them for our marketing and promotional purposes.
                  </p>

                  <p>
                    <strong>Catering, Cleaning, Trash and Equipment Removal:</strong> Merritt Wellness will be in a clean condition prior to your
                    event. Upon additional planning with Merritt Wellness, you will need to incorporate your set-up time and clean up time into the
                    rental agreement. You are required to return the space to the same clean condition in which it was found, unless payment for
                    clean-up was made. Otherwise, all trash must be collected, properly bagged and removed by the renter or the caterer and the
                    furniture must be rearranged. All rental equipment must be removed that night unless approved otherwise by Merritt Wellness.
                  </p>

                  <p>
                    <strong>Site Decoration:</strong> Merritt Wellness wants to make every event here a special and welcome experience. Therefore
                    every effort will be made to allow renter to prepare decorations reflecting their creative requirements. We ask that only the
                    staff of Merritt Wellness assist with rearranging and moving any furnishings, including artwork, lighting, antiques or seating.
                    No nails, screws, staples or penetrating items should be used on our walls, brick or fine wood. Any tape or gummed backing
                    materials must be properly removed and in an extreme case of any wall damage, the card on file will be charged.
                  </p>

                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mt-6">
                    <p className="text-sm text-blue-900">
                      <strong>Contact Information:</strong><br />
                      Merritt Wellness<br />
                      2246 Irving St, Denver, CO 80211<br />
                      Phone: (720) 357-9499<br />
                      Email: Manager@merrittwellness.net<br />
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
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.agreedToTerms}
                  className={`inline-flex items-center gap-3 px-8 py-4 rounded-full font-semibold transition-all duration-300 ${!isSubmitting && formData.agreedToTerms
                    ? 'bg-[#735e59] text-[#f2eee9] hover:bg-[#5a4a46] hover:scale-105 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Creating Your Booking...
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      Proceed to Secure Payment
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
                Pricing Summary
              </h3>

              <div className="mb-4 p-3 bg-[#735e59]/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#4a3f3c]">Total Classes</span>
                  <span className="text-xl font-bold text-[#735e59]">{pricing.totalBookings}</span>
                </div>
                <p className="text-sm text-[#6b5f5b] mt-1">
                  {pricing.totalHours} total hours • $95/hour base
                </p>
              </div>

              {/* Promo Code Section */}
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

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Base Amount ({pricing.totalHours} hrs × $95)</span>
                  <span className="font-medium">${pricing.baseAmount.toFixed(2)}</span>
                </div>

                {pricing.saturdayCharges > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Saturday Charges</span>
                    <span>+${pricing.saturdayCharges.toFixed(2)}</span>
                  </div>
                )}

                {pricing.setupTeardownFees > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Setup/Teardown Assistance</span>
                    <span>+${pricing.setupTeardownFees.toFixed(2)}</span>
                  </div>
                )}

                {pricing.onsiteAssistanceFee > 0 && (
                  <div className="flex justify-between text-teal-600">
                    <span>On-Site Assistance {pricing.isFirstEvent ? '(First Event)' : ''}</span>
                    <span>+${pricing.onsiteAssistanceFee.toFixed(2)}</span>
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

              {pricing.minimumApplied && (
                <div className="mt-3 text-xs bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800">
                    <strong>ℹ️ Minimums Applied:</strong> 2-hour minimum per single event
                  </p>
                </div>
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
    </main>
  );
}