'use client';
import { useState } from 'react';
import { Calendar, Clock, Users, Mail, Phone, CreditCard, CheckCircle, MapPin, ArrowRight } from 'lucide-react';

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [eventType, setEventType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
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
    { id: 'yoga-class', name: 'Yoga Class', duration: '60-90 min' },
    { id: 'meditation', name: 'Meditation Session', duration: '30-60 min' },
    { id: 'workshop', name: 'Workshop', duration: '2-4 hours' },
    { id: 'retreat', name: 'Mini Retreat', duration: 'Half/Full day' },
    { id: 'sound-bath', name: 'Sound Bath', duration: '60 min' },
    { id: 'private-event', name: 'Private Event', duration: 'Custom' },
    { id: 'other', name: 'Other', duration: 'Custom' }
  ];

  const timeSlots = [
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage('');
    
    try {
      const response = await fetch('/api/booking-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedDate,
          selectedTime,
          ...formData
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitMessage('✅ Booking request sent successfully! Check your email for confirmation.');
        // Reset form
        setSelectedDate('');
        setSelectedTime('');
        setFormData({
          eventName: '',
          eventType: '',
          attendees: '',
          duration: '',
          contactName: '',
          email: '',
          phone: '',
          specialRequests: ''
        });
      } else {
        setSubmitMessage('❌ Failed to submit booking request. Please try again or call us directly.');
        console.error('API error:', result);
      }
    } catch (error) {
      setSubmitMessage('❌ Network error. Please check your connection and try again.');
      console.error('Network error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedDate && selectedTime && formData.eventName && formData.contactName && formData.email && formData.eventType;

  return (
    <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-light mb-4 text-gray-900">Book Your Event</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Reserve our historic sanctuary for your yoga class, workshop, or wellness event. 
            Choose your date and we'll guide you through the rest.
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
                  src="https://calendar.google.com/calendar/embed?src=YOUR_CALENDAR_ID_HERE&ctz=America/Denver&mode=WEEK&showTitle=0&showPrint=0&showCalendars=0&showTz=0"
                  className="w-full h-96"
                  title="Available booking times - Replace YOUR_CALENDAR_ID_HERE with your actual calendar ID"
                />
              </div>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  📅 <strong>Next:</strong> Replace "YOUR_CALENDAR_ID_HERE" in the calendar embed above with your actual Google Calendar ID
                </p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Start Time</label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  >
                    <option value="">Choose time...</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
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
                          {type.name} ({type.duration})
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
                    <div className={`mb-4 p-4 rounded-xl text-center max-w-md ${
                      submitMessage.includes('✅') 
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
                    className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold transition-all duration-200 ${
                      isFormValid && !isSubmitting
                        ? 'bg-gray-900 text-white hover:bg-gray-800 hover:scale-105 shadow-lg hover:shadow-xl' 
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Mail size={20} />
                        Submit Booking Request
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                  
                  {isFormValid && (
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      You'll receive a confirmation email with next steps
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
                  <span>{selectedTime || 'Time not selected'}</span>
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
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="text-lg font-bold text-gray-900">Quote on request</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Final pricing will be provided after review
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