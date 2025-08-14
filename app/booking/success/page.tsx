'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Calendar, Mail, Phone } from 'lucide-react';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  return (
    <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-emerald-600" size={32} />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-lg text-gray-600 mb-6">
            Your event booking has been confirmed and paid.
          </p>

          <div className="bg-emerald-50 rounded-xl p-6 mb-6 text-left">
            <h3 className="font-semibold text-emerald-900 mb-3">What's Next?</h3>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li>📧 Confirmation email sent to your inbox</li>
              <li>📅 Calendar invitation attached</li>
              <li>⏰ Reminder 24 hours before your event</li>
              <li>📞 We'll contact you if anything changes</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/booking'}
              className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Book Another Event
            </button>

            <p className="text-xs text-gray-500">
              Questions? Call (303) 359-8337 or email merrittfitnessmanager@gmail.com
            </p>
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