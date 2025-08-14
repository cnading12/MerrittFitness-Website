'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Calendar, Mail, Phone, Download, ArrowRight } from 'lucide-react';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const [bookingData, setBookingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      fetchBookingData(bookingId);
    }
  }, [bookingId]);

  const fetchBookingData = async (id) => {
    try {
      const response = await fetch(`/api/booking/${id}`);
      if (response.ok) {
        const data = await response.json();
        setBookingData(data);
      }
    } catch (error) {
      console.error('Error fetching booking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-6"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-emerald-600" size={40} />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-xl text-gray-600 mb-2">
            Your wellness experience is confirmed
          </p>
          <p className="text-gray-500">
            Welcome to the Merritt Fitness community
          </p>
        </div>

        {/* Booking Details */}
        {bookingData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Booking Details</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <h3 className="font-semibold text-emerald-900 mb-2">Event Information</h3>
                  <p className="text-emerald-800 font-medium text-lg">{bookingData.event_name}</p>
                  <p className="text-emerald-700 text-sm capitalize">
                    {bookingData.event_type?.replace('-', ' ')}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl">
                  <h3 className="font-semibold text-blue-900 mb-2">Date & Time</h3>
                  <p className="text-blue-800 font-medium">
                    {formatDate(bookingData.event_date)}
                  </p>
                  <p className="text-blue-700">{bookingData.event_time}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <h3 className="font-semibold text-purple-900 mb-2">Location</h3>
                  <p className="text-purple-800 font-medium">Historic Merritt Space</p>
                  <p className="text-purple-700 text-sm">
                    2246 Irving Street<br />
                    Denver, CO 80211
                  </p>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl">
                  <h3 className="font-semibold text-amber-900 mb-2">Attendees</h3>
                  <p className="text-amber-800 font-medium">{bookingData.attendees} people</p>
                  <p className="text-amber-700 text-sm">Booking ID: {bookingData.id}</p>
                </div>
              </div>
            </div>

            {bookingData.special_requests && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-2">Special Requests</h3>
                <p className="text-gray-700">{bookingData.special_requests}</p>
              </div>
            )}
          </div>
        )}

        {/* What's Next */}
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">What Happens Next?</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-emerald-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Confirmation Email</h3>
              <p className="text-gray-600 text-sm">
                Check your inbox for detailed event information and calendar invitation
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Calendar Event</h3>
              <p className="text-gray-600 text-sm">
                Event automatically added to your calendar with all details
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="text-purple-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Personal Touch</h3>
              <p className="text-gray-600 text-sm">
                We'll contact you 24 hours before to ensure everything is perfect
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.href = '/booking'}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-emerald-700 transition-all hover:scale-105 shadow-lg"
          >
            <Calendar size={20} />
            Book Another Event
          </button>

          <a
            href="/contact"
            className="flex items-center justify-center gap-2 border-2 border-gray-300 text-gray-700 font-semibold px-8 py-4 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all"
          >
            Questions? Contact Us
            <ArrowRight size={20} />
          </a>
        </div>

        {/* Support Info */}
        <div className="text-center mt-8 p-6 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-600 mb-2">Need immediate assistance?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
            <a href="tel:303-359-8337" className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700">
              <Phone size={16} />
              (303) 359-8337
            </a>
            <a href="mailto:merrittfitnessmanager@gmail.com" className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700">
              <Mail size={16} />
              merrittfitnessmanager@gmail.com
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}