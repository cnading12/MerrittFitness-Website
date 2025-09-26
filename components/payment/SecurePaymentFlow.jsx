// components/payment/SecurePaymentFlow.jsx
// FIXED VERSION - Complete payment flow that actually works

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { 
  CreditCard, 
  Shield, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  DollarSign
} from 'lucide-react';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Main payment flow component
export default function SecurePaymentFlow({ bookingId }) {
  const [clientSecret, setClientSecret] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bookingId) {
      initializePayment();
    }
  }, [bookingId]);

  const initializePayment = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Fetch booking data first
      const bookingResponse = await fetch(`/api/booking/${bookingId}`);
      const booking = await bookingResponse.json();

      if (!bookingResponse.ok) {
        throw new Error('Booking not found');
      }

      // Check if booking is already paid
      if (booking.status === 'confirmed') {
        window.location.href = `/booking/success?booking_id=${bookingId}`;
        return;
      }

      setBookingData(booking);

      // Create payment intent
      const paymentResponse = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingId,
          paymentMethod: 'card'
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentData.error || 'Failed to create payment intent');
      }

      setClientSecret(paymentData.clientSecret);
    } catch (err) {
      console.error('Payment initialization error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Loader2 className="animate-spin text-emerald-600 mx-auto mb-4" size={32} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Setting up secure payment</h2>
          <p className="text-gray-600">Please wait while we prepare your payment form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <AlertCircle className="text-red-600 mx-auto mb-4" size={32} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Setup Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/booking'}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Booking
            </button>
            <button
              onClick={initializePayment}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret || !bookingData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <AlertCircle className="text-amber-600 mx-auto mb-4" size={32} />
          <p className="text-gray-600">Payment information not available</p>
        </div>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#10b981',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#dc2626',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
    rules: {
      '.Input': {
        border: '1px solid #e5e7eb',
        padding: '12px',
      },
      '.Input:focus': {
        border: '2px solid #10b981',
        boxShadow: '0 0 0 1px #10b981',
      },
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
      {/* Booking Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-xl">
              <h4 className="font-medium text-emerald-900 mb-2">{bookingData.event_name}</h4>
              <p className="text-emerald-700 text-sm capitalize">
                {bookingData.event_type?.replace('-', ' ')}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="text-gray-400" size={16} />
                <span>{formatDate(bookingData.event_date)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-gray-400" size={16} />
                <span>{bookingData.event_time}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="text-gray-400" size={16} />
                <span>2246 Irving St, Denver, CO 80211</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total Amount</span>
                <span className="text-xl font-bold text-gray-900">
                  ${parseFloat(bookingData.total_amount).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Includes all fees and taxes
              </p>
            </div>
          </div>

          {/* Security badges */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Secure Payment</h4>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Shield className="text-green-600" size={14} />
                <span>256-bit SSL encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="text-green-600" size={14} />
                <span>PCI DSS compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={14} />
                <span>Powered by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Complete Your Payment</h2>
            <p className="text-gray-600">
              Enter your payment information below to confirm your booking
            </p>
          </div>

          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm bookingId={bookingId} bookingData={bookingData} />
          </Elements>
        </div>
      </div>
    </div>
  );
}

// Checkout form component that handles the actual payment
function CheckoutForm({ bookingId, bookingData }) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/payment-complete?booking_id=${bookingId}`,
          receipt_email: bookingData.email,
        },
        redirect: 'if_required', // Only redirect if absolutely necessary
      });

      if (error) {
        // Payment failed
        console.error('Payment failed:', error);
        setMessage(error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded - redirect to success page
        console.log('Payment succeeded:', paymentIntent.id);
        window.location.href = `/booking/payment-complete?booking_id=${bookingId}&payment_intent=${paymentIntent.id}`;
      } else {
        // Payment requires additional action or is processing
        setMessage('Payment is being processed...');
        
        // Check status in a moment
        setTimeout(() => {
          window.location.href = `/booking/payment-complete?booking_id=${bookingId}`;
        }, 2000);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Element */}
      <div className="p-4 border border-gray-200 rounded-xl">
        <PaymentElement 
          options={{
            layout: 'tabs',
            business: {
              name: 'Merritt Fitness'
            }
          }}
        />
      </div>

      {/* Error/Success Message */}
      {message && (
        <div className={`p-4 rounded-xl ${
          message.includes('error') || message.includes('failed') 
            ? 'bg-red-50 border border-red-200 text-red-800' 
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !stripe || !elements}
        className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
          isLoading || !stripe || !elements
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 shadow-lg hover:shadow-xl'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock size={20} />
            Complete Secure Payment
            <span className="ml-2 font-bold">
              ${parseFloat(bookingData.total_amount).toFixed(2)}
            </span>
          </>
        )}
      </button>

      {/* Security Notice */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Your payment information is encrypted and secure. 
          We never store your card details.
        </p>
      </div>

      {/* Contact Info */}
      <div className="border-t border-gray-200 pt-4 text-center">
        <p className="text-sm text-gray-600 mb-2">Questions about your payment?</p>
        <div className="flex justify-center gap-4 text-sm">
          <a href="tel:720-357-9499" className="text-emerald-600 hover:text-emerald-700">
            (720) 357-9499
          </a>
          <a href="mailto:manager@merrittfitness.net" className="text-emerald-600 hover:text-emerald-700">
            manager@merrittfitness.net
          </a>
        </div>
      </div>
    </div>
  );
}