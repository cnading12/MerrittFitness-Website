'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Mail, Phone, CreditCard, CheckCircle, MapPin, ArrowRight, Loader2, AlertCircle, Star, TrendingUp } from 'lucide-react';

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState({});
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [formData, setFormData] = useState({
    eventName: '',
    eventType: '',
    hoursRequested: '',
    duration: '',
    contactName: '',
    email: '',
    phone: '',
    specialRequests: '',
    isRecurring: false,
    recurringDetails: '',
    businessName: '',
    websiteUrl: ''
  });

  // Updated event types with real business focus
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

  // Pricing calculation based on actual business model
  const HOURLY_RATE = 95;
  const calculatePricing = () => {
    const hours = parseInt(formData.hoursRequested) || 0;
    const isRecurring = formData.isRecurring;
    const hasMultipleEvents = formData.recurringDetails.includes('multiple') || formData.recurringDetails.includes('weekly');
    
    // Apply business rules
    let totalHours = hours;
    let rate = HOURLY_RATE;
    let minimumApplied = false;
    let discount = 0;
    let savings = 0;
    
    // Single event: 4-hour minimum
    if (!isRecurring && hours < 4) {
      totalHours = 4;
      minimumApplied = true;
    }
    
    // Multiple events per week: 2-hour minimum
    if (isRecurring && hasMultipleEvents && hours < 2) {
      totalHours = 2;
      minimumApplied = true;
    }
    
    // Long-term client incentives
    if (isRecurring) {
      if (hasMultipleEvents) {
        discount = 5; // 5% discount for multiple weekly bookings
        savings = (totalHours * rate * discount) / 100;
      }
    }
    
    const subtotal = totalHours * rate;
    const total = subtotal - savings;
    
    return {
      requestedHours: hours,
      billedHours: totalHours,
      hourlyRate: rate,
      subtotal,
      discount,
      savings,
      total,
      minimumApplied,
      isRecurring,
      hasMultipleEvents
    };
  };

  // Check availability when date changes
  useEffect(() => {
    if (selectedDate) {
      checkAvailability(selectedDate);
    }
  }, [selectedDate]);

  const checkAvailability = async (date) => {
    setIsCheckingAvailability(true);
    setSelectedTime('');

    try {
      const response = await fetch(`/api/check-availability?date=${date}`);
      const availability = await response.json();

      if (response.ok) {
        setAvailableSlots(availability);
      } else {
        console.error('Availability check failed:', availability);
        // Fallback: assume all slots available
        const fallbackAvailability = {};
        timeSlots.forEach(time => {
          fallbackAvailability[time] = true;
        });
        setAvailableSlots(fallbackAvailability);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      const fallbackAvailability = {};
      timeSlots.forEach(time => {
        fallbackAvailability[time] = true;
      });
      setAvailableSlots(fallbackAvailability);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pricing = calculatePricing();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      console.log('🚀 Submitting booking...');

      const bookingResponse = await fetch('/api/booking-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedDate,
          selectedTime,
          ...formData,
          ...pricing,
          total: pricing.total,
          paymentMethod: 'pending'
        }),
      });

      const bookingResult = await bookingResponse.json();

      if (bookingResponse.ok && bookingResult.success) {
        window.location.href = `/booking/payment?booking_id=${bookingResult.id}`;
      } else {
        setSubmitMessage(`❌ ${bookingResult.error || 'Failed to create booking'}`);
        console.error('Booking creation error:', bookingResult);
      }
    } catch (error) {
      console.error('❌ Network/JSON error:', error);
      setSubmitMessage('❌ Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedDate && selectedTime && formData.eventName && formData.contactName && formData.email && formData.eventType && formData.hoursRequested && availableSlots[selectedTime];

  return (
    <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-light mb-4 text-gray-900">Reserve Your Sacred Space</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join our community of wellness professionals in Denver's most inspiring historic sanctuary. 
            <span className="font-semibold text-emerald-700"> $95/hour • Flexible long-term partnerships available</span>
          </p>
        </div>

        {/* Business Focus Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-6 mb-8 border border-emerald-100">
          <div className="flex items-center justify-center gap-4 mb-4">
            <TrendingUp className="text-emerald-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">We're Building Something Special</h2>
          </div>
          <p className="text-center text-gray-700 max-w-4xl mx-auto">
            Our vision: <span className="font-semibold">7-10 long-term wellness partners</span> who call Merritt Fitness home. 
            We're seeking dedicated practitioners ready to build their business in our beautiful 2,400 sq ft sanctuary with 24-foot ceilings, 
            original 1905 architecture, and perfect acoustics.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Booking Form */}
          <div className="lg:col-span-2">
            {/* Calendar Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Calendar className="text-emerald-700" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Available Dates & Times</h2>
              </div>

              {/* Embedded Google Calendar */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <iframe
                  src="https://calendar.google.com/calendar/embed?src=04ac99c7464fa75a7fe252eccd8fff5cffd50a9de27f25555cb8886708b8ef21@group.calendar.google.com&ctz=America/Denver&mode=WEEK&showTitle=0&showPrint=0&showCalendars=0&showTz=0"
                  className="w-full h-96"
                  title="Live Availability Calendar"
                />
              </div>

              {/* Date & Time Selection */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Available Times
                    {isCheckingAvailability && (
                      <span className="ml-2 text-emerald-600">
                        <Loader2 className="inline animate-spin" size={14} />
                      </span>
                    )}
                  </label>

                  {!selectedDate ? (
                    <div className="w-full p-8 border border-gray-200 rounded-lg bg-gray-50 text-center text-gray-500">
                      Select a date to see available times
                    </div>
                  ) : isCheckingAvailability ? (
                    <div className="w-full p-8 border border-gray-200 rounded-lg bg-gray-50 text-center">
                      <Loader2 className="animate-spin text-emerald-600 mx-auto" size={24} />
                      <p className="text-gray-600 mt-2">Checking availability...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {timeSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(availableSlots[time] ? time : '')}
                          disabled={!availableSlots[time]}
                          className={`p-2 text-sm rounded-lg border transition-all ${availableSlots[time]
                              ? selectedTime === time
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            }`}
                        >
                          {time}
                          {!availableSlots[time] && (
                            <div className="text-xs mt-1 text-red-500">Booked</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Event Details Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="text-blue-700" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Tell Us About Your Practice</h2>
              </div>

              <div className="space-y-6">
                {/* Business Information */}
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Business Information</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Practice/Business Name *</label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        placeholder="e.g., Serene Soul Yoga"
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website/Instagram (Optional)</label>
                      <input
                        type="url"
                        value={formData.websiteUrl}
                        onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
                        placeholder="www.example.com or @username"
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Class/Event Name *</label>
                    <input
                      type="text"
                      value={formData.eventName}
                      onChange={(e) => handleInputChange('eventName', e.target.value)}
                      placeholder="e.g., Morning Flow Yoga"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Practice Type *</label>
                    <select
                      value={formData.eventType}
                      onChange={(e) => handleInputChange('eventType', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      <option value="">Select your practice...</option>
                      {eventTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.icon} {type.name} - {type.description}
                          {type.popular ? ' (Popular!)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours Needed *</label>
                    <select
                      value={formData.hoursRequested}
                      onChange={(e) => handleInputChange('hoursRequested', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      <option value="">Select duration...</option>
                      {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8].map(hours => (
                        <option key={hours} value={hours}>
                          {hours === 1 ? '1 hour' : `${hours} hours`}
                          {hours < 4 && !formData.isRecurring ? ' (4hr minimum applies)' : ''}
                          {hours < 2 && formData.isRecurring && formData.recurringDetails.includes('multiple') ? ' (2hr minimum applies)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Format</label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="recurring"
                          value="single"
                          checked={!formData.isRecurring}
                          onChange={() => handleInputChange('isRecurring', false)}
                          className="mr-2 text-emerald-600"
                        />
                        <span>Single Event (4-hour minimum)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="recurring"
                          value="recurring"
                          checked={formData.isRecurring}
                          onChange={() => handleInputChange('isRecurring', true)}
                          className="mr-2 text-emerald-600"
                        />
                        <span className="text-emerald-700 font-medium">Long-term Partnership <Star className="inline ml-1" size={16} /></span>
                      </label>
                    </div>
                  </div>
                </div>

                {formData.isRecurring && (
                  <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
                    <h3 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center">
                      <Star className="mr-2" size={20} />
                      Partnership Details
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tell us about your needs</label>
                      <select
                        value={formData.recurringDetails}
                        onChange={(e) => handleInputChange('recurringDetails', e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors mb-3"
                      >
                        <option value="">Select partnership type...</option>
                        <option value="single-weekly">Single weekly class (2hr minimum)</option>
                        <option value="multiple-weekly">Multiple weekly classes (2hr minimum, 5% discount!)</option>
                        <option value="daily">Daily classes (Premium partnership)</option>
                        <option value="custom">Custom schedule - let's discuss</option>
                      </select>
                      <p className="text-sm text-emerald-700">
                        💡 Long-term partners get priority booking, marketing support, and potential revenue sharing opportunities!
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details</label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                    rows={4}
                    placeholder="Tell us about your practice, special equipment needs, setup requirements, target audience, or anything else that would help us support your success..."
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>

                {/* Contact Information */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={formData.contactName}
                        onChange={(e) => handleInputChange('contactName', e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(303) 555-0123"
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col items-center pt-6">
                  {submitMessage && (
                    <div className={`mb-4 p-4 rounded-xl text-center max-w-md ${submitMessage.includes('✅')
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                      <p className="text-sm font-medium">{submitMessage}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSubmitting}
                    className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition-all duration-200 ${isFormValid && !isSubmitting
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
                        <Mail size={20} />
                        Reserve Your Space
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>

                  {isFormValid && (
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      We'll contact you within 24 hours to confirm details
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1">
            {/* Pricing Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="mr-2" size={20} />
                Pricing Summary
              </h3>

              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar size={16} />
                  <span>{selectedDate || 'Date not selected'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock size={16} />
                  <span>
                    {selectedTime || 'Time not selected'}
                    {selectedTime && availableSlots[selectedTime] === false && (
                      <span className="text-red-500 ml-1">(Unavailable)</span>
                    )}
                    {selectedTime && availableSlots[selectedTime] === true && (
                      <span className="text-emerald-500 ml-1">✓</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin size={16} />
                  <span>Historic Merritt Space</span>
                </div>
              </div>

              {formData.eventName && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="font-medium text-gray-900">{formData.eventName}</p>
                  {formData.businessName && (
                    <p className="text-sm text-gray-600">{formData.businessName}</p>
                  )}
                  {formData.eventType && (
                    <p className="text-sm text-gray-600 capitalize">
                      {eventTypes.find(t => t.id === formData.eventType)?.name}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Hourly Rate</span>
                    <span className="font-medium">${HOURLY_RATE}/hour</span>
                  </div>
                  
                  {formData.hoursRequested && (
                    <>
                      <div className="flex justify-between">
                        <span>
                          Requested Hours
                          {pricing.minimumApplied && (
                            <span className="text-xs text-amber-600 block">
                              ({pricing.isRecurring && pricing.hasMultipleEvents ? '2hr' : '4hr'} minimum applied)
                            </span>
                          )}
                        </span>
                        <span>{pricing.requestedHours} hours</span>
                      </div>
                      
                      {pricing.minimumApplied && (
                        <div className="flex justify-between">
                          <span>Minimum Hours</span>
                          <span className="font-medium">{pricing.billedHours} hours</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${pricing.subtotal}</span>
                      </div>
                      
                      {pricing.savings > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Long-term Partner Discount ({pricing.discount}%)</span>
                          <span>-${pricing.savings}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    ${pricing.total || 0}
                  </span>
                </div>
                
                {formData.hoursRequested && (
                  <div className="mt-3 text-xs text-gray-500">
                    {pricing.isRecurring ? (
                      pricing.hasMultipleEvents ? (
                        <p className="text-emerald-600">
                          ✨ Multiple weekly bookings qualify for partnership rates!
                        </p>
                      ) : (
                        <p>Long-term partnership • 2-hour minimum</p>
                      )
                    ) : (
                      <p>Single event • 4-hour minimum</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Partnership Benefits */}
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Star className="mr-2 text-emerald-600" size={20} />
                Partnership Benefits
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span><strong>Priority Booking:</strong> First access to prime time slots</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span><strong>Marketing Support:</strong> Featured on our website & social media</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span><strong>Flexible Scheduling:</strong> 2-hour minimums for regular partners</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span><strong>Community Building:</strong> Cross-promotion with other practitioners</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span><strong>Revenue Sharing:</strong> Opportunities for joint workshops & events</span>
                </div>
              </div>
            </div>

            {/* Market Position */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Why Choose Merritt Fitness?</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600">🏛️</span>
                  <span>Historic 1905 church with 24-foot ceilings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600">☀️</span>
                  <span>Abundant natural light all day</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-600">🎵</span>
                  <span>Perfect acoustics for sound healing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">📍</span>
                  <span>Sloan's Lake location with easy parking</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600">💰</span>
                  <span>Competitive $95/hr rate (vs $65-120 market)</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Questions About Partnership?</h3>
              <p className="text-sm text-gray-600 mb-4">
                We'd love to discuss how we can support your wellness practice and build something amazing together.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={14} />
                  <span>(720)-357-9499</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail size={14} />
                  <span>merrittfitnessmanager@gmail.com</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                💡 Pro tip: Mention "long-term partnership" for priority consideration!
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}