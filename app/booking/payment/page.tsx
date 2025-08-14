'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SecurePaymentFlow from '../../../components/payment/SecurePaymentFlow';
import { Loader2, AlertCircle } from 'lucide-react';

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  const [bookingExists, setBookingExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (bookingId) {
      // Verify booking exists before showing payment form
      verifyBooking(bookingId);
    }
  }, [bookingId]);

  const verifyBooking = async (id) => {
    try {
      const response = await fetch(`/api/booking/${id}`);
      if (response.ok) {
        setBookingExists(true);
      } else {
        setBookingExists(false);
      }
    } catch (error) {
      console.error('Error verifying booking:', error);
      setBookingExists(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <Loader2 className="animate-spin text-emerald-600 mx-auto mb-4" size={32} />
            <p className="text-gray-600">Verifying booking details...</p>
          </div>
        </div>
      </main>
    );
  }
  
  if (!bookingId || !bookingExists) {
    return (
      <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <AlertCircle className="text-red-600 mx-auto mb-4" size={32} />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {!bookingId ? 'Missing Booking Information' : 'Booking Not Found'}
            </h1>
            <p className="text-gray-600 mb-6">
              {!bookingId 
                ? 'No booking ID was provided. Please return to the booking page and try again.'
                : 'The booking you\'re trying to pay for could not be found. It may have been cancelled or already paid for.'
              }
            </p>
            <a
              href="/booking"
              className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Return to Booking
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Complete Your Payment</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            You're just one step away from confirming your booking at our historic wellness sanctuary.
          </p>
        </div>
        
        <SecurePaymentFlow bookingId={bookingId} />
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <Loader2 className="animate-spin text-emerald-600 mx-auto mb-4" size={32} />
            <p className="text-gray-600">Loading payment page...</p>
          </div>
        </div>
      </main>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}