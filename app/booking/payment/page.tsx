'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SecurePaymentFlow from '../../components/payment/SecurePaymentFlow';

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');
  
  if (!bookingId) {
    return <div>Error: No booking ID provided</div>;
  }

  return (
    <main className="pt-24 pb-20 bg-gray-50 min-h-screen">
      <SecurePaymentFlow bookingId={bookingId} />
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}