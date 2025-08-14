'use client';
import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Mail, Phone, CreditCard, CheckCircle, MapPin, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

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
    attendees: '',
    duration: '',
    contactName: '',
    email: '',
    phone: '',
    specialRequests: ''
  });

  const eventTypes = [
    { id: 'yoga-class', name: 'Yoga Class', duration: '60-90 min', basePrice: 150 },
    { id: 'meditation', name: 'Meditation Session', duration: '30-60 min', basePrice: 100 },
    { id: 'workshop', name: 'Workshop', duration: '2-4 hours', basePrice: 300 },
    { id: 'retreat', name: 'Mini Retreat', duration: 'Half/Full day', basePrice: 500 },
    { id: 'sound-bath', name: 'Sound Bath', duration: '60 min', basePrice: 120 },
    { id: 'private-event', name: 'Private Event', duration: 'Custom', basePrice: 250 },
    { id: 'other', name: 'Other', duration: 'Custom', basePrice: 200 }
  ];

  const timeSlots = [
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM'
  ];

  // Check availability when date changes
  useEffect(() => {
    if (selectedDate) {
      checkAvailability(selectedDate);
    }
  }, [selectedDate]);

  const checkAvailability = async (date) => {
    setIsCheckingAvailability(true);
    setSelectedTime(''); // Reset selected time when checking new date

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
      // Fallback: assume all slots available
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

  const calculateEstimatedPrice = () => {
    const selectedEventType = eventTypes.find(t => t.id === formData.eventType);
    if (!selectedEventType) return 0;

    const basePrice = selectedEventType.basePrice;
    const attendeeMultiplier = Math.max(1, Math.ceil((parseInt(formData.attendees) || 1) / 10));
    return basePrice * attendeeMultiplier;
  };

  const handleSubmit = async () => {
  setIsSubmitting(true);
  setSubmitMessage('');

  try {
    console.log('🚀 Submitting booking...');

    // Step 1: Create booking
    const bookingResponse = await fetch('/api/booking-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedDate,
        selectedTime,
        ...formData,
        total: calculateEstimatedPrice(),
        paymentMethod: 'pending'
      }),
    });

    const bookingResult = await bookingResponse.json();

    if (bookingResponse.ok && bookingResult.success) {
      // Redirect to payment page instead of showing confirmation
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
  const isFormValid = selectedDate && selectedTime && formData.eventName && formData.contactName && formData.email && formData.eventType && availableSlots[selectedTime];

  // Show confirmation screen after successful booking
  if (showConfirmation && bookingId) {
    return (
      <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-emerald-600" size={32} />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">Booking Request Created!</h1>

            <p className="text-lg text-gray-600 mb-6">
              Your event booking has been created and is pending payment confirmation.
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Booking Details</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Booking ID:</strong> <code className="bg-gray-200 px-2 py-1 rounded">{bookingId}</code></p>
                <p><strong>Date & Time:</strong> {selectedDate} at {selectedTime}</p>
                <p><strong>Estimated Total:</strong> ${calculateEstimatedPrice()}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600 mb-6">
              <p>📧 A confirmation email will be sent once payment is processed</p>
              <p>📅 Calendar event will be created automatically</p>
              <p>💳 Payment processing will be added in the next phase</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setBookingId('');
                  setSubmitMessage('');
                }}
                className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Book Another Event
              </button>

              <p className="text-xs text-gray-500">
                For immediate assistance, call (303) 359-8337
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-light mb-4 text-gray-900">Book Your Event</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Reserve our historic sanctuary with real-time availability and instant confirmation.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
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

              {selectedTime && !availableSlots[selectedTime] && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="text-amber-600" size={16} />
                  <span className="text-amber-800 text-sm">
                    This time slot is not available. Please select a different time.
                  </span>
                </div>
              )}
            </div>

            {/* Event Details Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="text-blue-700" size={20} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Name *</label>
                    <input
                      type="text"
                      value={formData.eventName}
                      onChange={(e) => handleInputChange('eventName', e.target.value)}
                      placeholder="e.g., Morning Flow Yoga"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Type *</label>
                    <select
                      value={formData.eventType}
                      onChange={(e) => handleInputChange('eventType', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      <option value="">Select type...</option>
                      {eventTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.duration}) - Starting at ${type.basePrice}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Attendees</label>
                    <input
                      type="number"
                      value={formData.attendees}
                      onChange={(e) => handleInputChange('attendees', e.target.value)}
                      placeholder="e.g., 15"
                      min="1"
                      max="50"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                    {formData.attendees && parseInt(formData.attendees) > 10 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Large group pricing applies (groups over 10)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      placeholder="e.g., 90 minutes"
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests or Notes</label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                    rows={3}
                    placeholder="Any special setup requirements, equipment needs, or other details..."
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
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
                        Creating Booking...
                      </>
                    ) : (
                      <>
                        <Mail size={20} />
                        Create Booking Request
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>

                  {isFormValid && (
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      Payment processing will be added in the next step
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Booking Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>

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
                  <Users size={16} />
                  <span>{formData.attendees ? `${formData.attendees} attendees` : 'Attendees TBD'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin size={16} />
                  <span>Historic Merritt Space</span>
                </div>
              </div>

              {formData.eventName && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="font-medium text-gray-900">{formData.eventName}</p>
                  {formData.eventType && (
                    <p className="text-sm text-gray-600 capitalize">
                      {eventTypes.find(t => t.id === formData.eventType)?.name}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="space-y-2 text-sm">
                  {formData.eventType && (
                    <>
                      <div className="flex justify-between">
                        <span>Base rate</span>
                        <span>${eventTypes.find(t => t.id === formData.eventType)?.basePrice || 0}</span>
                      </div>
                      {formData.attendees && parseInt(formData.attendees) > 10 && (
                        <div className="flex justify-between">
                          <span>Large group</span>
                          <span>+${(eventTypes.find(t => t.id === formData.eventType)?.basePrice || 0) * (Math.ceil(parseInt(formData.attendees) / 10) - 1)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                  <span className="font-medium text-gray-900">Estimated Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    ${calculateEstimatedPrice() || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Final pricing confirmed before payment
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Questions?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Our team is here to help you plan the perfect event.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={14} />
                  <span>(303) 359-8337</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail size={14} />
                  <span>manager@merritthouse.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}