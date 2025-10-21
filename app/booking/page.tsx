'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Mail, Phone, CreditCard, CheckCircle, MapPin, ArrowRight, Loader2, AlertCircle, Star, TrendingUp, Plus, Minus, DollarSign, Info } from 'lucide-react';

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
    homeAddress: '', // NEW: Added home address
    businessName: '',
    websiteUrl: '',
    isRecurring: false,
    recurringDetails: '',
    paymentMethod: 'card'
  });

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

  // ENHANCED: Check if date is Saturday
  const isSaturday = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date.getDay() === 6;
  };

  // ENHANCED: Check if time is after 4 PM
  const isAfter4PM = (timeString) => {
    if (!timeString) return false;
    const [time, period] = timeString.split(' ');
    const [hours] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) {
      return hours >= 4;
    }
    return false;
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
        
        // NEW: Validate Saturday special requirements
        if (isSaturday(booking.selectedDate)) {
          const hours = parseFloat(booking.hoursRequested) || 0;
          const afterFour = isAfter4PM(booking.selectedTime);
          
          if (!afterFour && hours < 8) {
            errors[`booking_${index}_hoursRequested`] = 'Saturday all-day events (before 4 PM) require minimum 8 hours';
          }
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ENHANCED: Pricing calculations with Saturday rates and setup/teardown
  const HOURLY_RATE = 95;
  const SATURDAY_EVENING_SURCHARGE = 35; // After 4 PM
  const SATURDAY_ALL_DAY_RATE = 200; // Before 4 PM, 8+ hours
  const SETUP_TEARDOWN_FEE = 50; // Per service
  const STRIPE_FEE_PERCENTAGE = 3;

  const calculatePricing = () => {
    let totalHours = 0;
    let totalBookings = 0;
    let minimumApplied = false;
    let saturdayCharges = 0;
    let setupTeardownFees = 0;

    bookings.forEach(booking => {
      if (booking.hoursRequested) {
        let hours = parseFloat(booking.hoursRequested) || 0;
        const isSat = isSaturday(booking.selectedDate);
        const afterFour = isAfter4PM(booking.selectedTime);

        // Apply minimums per booking
        if (!formData.isRecurring && hours < 4) {
          hours = 4;
          minimumApplied = true;
        }

        // Calculate Saturday charges
        if (isSat) {
          if (afterFour) {
            // Saturday evening: $95 + $35/hr
            saturdayCharges += hours * SATURDAY_EVENING_SURCHARGE;
          } else if (hours >= 8) {
            // Saturday all-day: $200/hr (replaces base rate)
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
      }
    });

    const baseAmount = totalHours * HOURLY_RATE;
    const subtotal = baseAmount + saturdayCharges + setupTeardownFees;
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

  const getInputClassName = (fieldName, baseClassName = "w-full p-3 border rounded-lg transition-colors") => {
    const hasError = validationErrors[fieldName];
    return hasError
      ? `${baseClassName} border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500`
      : `${baseClassName} border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`;
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

        if (formData.paymentMethod === 'pay-later') {
          window.location.href = `/booking/success?booking_id=${bookingResult.id}`;
        } else {
          window.location.href = `/booking/payment?booking_id=${bookingResult.id}`;
        }
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
    <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-light mb-4 text-gray-900">Reserve Your Sacred Space</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join our community of wellness professionals in Denver's most inspiring historic sanctuary.
            <span className="font-semibold text-emerald-700"> $95/hour • Flexible pricing for partners</span>
          </p>
        </div>

        {/* NEW: Important Rental Information */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 mt-1 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-amber-900 mb-3">Important Rental Information</h3>
              <ul className="space-y-2 text-amber-800">
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
                  <span><strong>Saturday Rentals:</strong> Evening events (after 4 PM) are $130/hr ($95 + $35/hr supervision). All-day Saturday events (before 4 PM) require 8+ hours at $200/hr.</span>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Calendar className="text-emerald-700" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Live Availability Calendar</h2>
                <div className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
                  Public Access
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <iframe
                  src="https://calendar.google.com/calendar/embed?src=c_3b551f029c24c4bae5c74fd94ba5f8bbfae09ddf059090837f29c284fca7bf9f%40group.calendar.google.com&ctz=America%2FDenver"
                  className="w-full h-96"
                  title="Public Live Availability Calendar"
                />
              </div>
            </div>

            {/* Multiple Bookings Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="text-blue-700" size={20} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Your Booking(s)</h2>
                  {bookings.length > 1 && (
                    <div className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                      {bookings.length} Classes
                    </div>
                  )}
                </div>
                <button
                  onClick={addBooking}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  disabled={bookings.length >= 10}
                >
                  <Plus size={16} />
                  Add Class
                </button>
              </div>

              {/* Individual Bookings */}
              {bookings.map((booking, index) => (
                <div key={booking.id} className="border border-gray-200 rounded-xl p-6 mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Class #{index + 1}</h3>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            className="mr-3 text-emerald-600"
                          />
                          <span>Setup assistance needed (+$50)</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={booking.needsTeardownHelp}
                            onChange={(e) => updateBooking(booking.id, 'needsTeardownHelp', e.target.checked)}
                            className="mr-3 text-emerald-600"
                          />
                          <span>Teardown assistance needed (+$50)</span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Each service includes 1 hour of assistance. By default, you're responsible for your own setup/cleanup.
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Special Notes for This Class
                      </label>
                      <textarea
                        value={booking.specialRequests}
                        onChange={(e) => updateBooking(booking.id, 'specialRequests', e.target.value)}
                        rows={3}
                        placeholder="Equipment needs, setup requirements, etc."
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                        maxLength={500}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {bookings.length < 10 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <div className="text-gray-500 mb-2">Planning multiple classes?</div>
                  <button
                    onClick={addBooking}
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    + Add another class to save time
                  </button>
                </div>
              )}
            </div>

            {/* Contact & Payment Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Mail className="text-purple-700" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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

                {/* Enhanced Payment Method Selection */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-colors ${formData.paymentMethod === 'card'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                      }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                        className="mt-1 mr-3 text-emerald-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="text-emerald-600" size={20} />
                          <span className="font-medium">Pay Online Now</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Secure card payment via Stripe • Instant confirmation
                        </p>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Info className="text-orange-600 mt-0.5" size={16} />
                            <div>
                              <p className="text-sm text-orange-800 font-medium">3% Processing Fee</p>
                              <p className="text-xs text-orange-700">
                                Required by Stripe for card processing. Choose "Pay Later" to avoid this fee.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-colors ${formData.paymentMethod === 'pay-later'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                      }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="pay-later"
                        checked={formData.paymentMethod === 'pay-later'}
                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                        className="mt-1 mr-3 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="text-blue-600" size={20} />
                          <span className="font-medium">Pay Later</span>
                          <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                            NO FEES
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Book now, pay with alternative methods
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">💰 Zero Processing Fees!</p>
                            <ul className="text-xs space-y-1">
                              <li>• Phone: (720) 357-9499</li>
                              <li>• Venmo/Zelle: Contact us!</li>
                              <li>• Check payments welcome</li>
                              <li>• Bank transfer options</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
                  disabled={isSubmitting}
                  className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition-all duration-200 ${!isSubmitting
                      ? 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105 shadow-lg hover:shadow-xl'
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
                      {formData.paymentMethod === 'pay-later' ? (
                        <CheckCircle size={20} />
                      ) : (
                        <CreditCard size={20} />
                      )}
                      {formData.paymentMethod === 'pay-later'
                        ? 'Confirm Booking (Pay Later)'
                        : 'Proceed to Secure Payment'}
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                <p className="text-sm text-gray-500 mt-3 text-center max-w-md">
                  {formData.paymentMethod === 'pay-later'
                    ? 'We\'ll contact you within 24 hours about payment arrangements. No processing fees!'
                    : 'You\'ll be redirected to our secure Stripe payment page'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1">
            {/* Pricing Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="mr-2" size={20} />
                Pricing Summary
              </h3>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">Total Classes</span>
                  <span className="text-xl font-bold text-blue-900">{pricing.totalBookings}</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  {pricing.totalHours} total hours • $95/hour base
                </p>
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

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <span className="font-medium text-gray-900">Total Amount</span>
                <span className="text-xl font-bold text-gray-900">
                  ${pricing.total.toFixed(2)}
                </span>
              </div>

              <div className="mt-3 text-xs">
                {formData.paymentMethod === 'card' ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-orange-800">
                      <strong>💳 Card Payment:</strong> 3% processing fee applies (Stripe requirement).
                      Total you pay: <strong>${pricing.total.toFixed(2)}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-800">
                      <strong>💰 Pay Later - No Fees!</strong>
                      Alternative payment methods available.
                      Total you pay: <strong>${pricing.subtotal.toFixed(2)}</strong>
                    </p>
                  </div>
                )}
              </div>

              {pricing.minimumApplied && (
                <div className="mt-3 text-xs bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800">
                    <strong>ℹ️ Minimums Applied:</strong> 4-hour minimum per single event
                  </p>
                </div>
              )}
            </div>

            {/* Security & Trust */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Security & Trust</h3>
              <div className="space-y-3 text-sm text-gray-600">
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
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Questions?</h3>
              <p className="text-sm text-gray-600 mb-4">
                We're here to help create the perfect experience for your classes.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={14} />
                  <span>(720) 357-9499</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail size={14} />
                  <span>manager@merrittfitness.net</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                💡 Call for partnership pricing & bulk discounts!
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}