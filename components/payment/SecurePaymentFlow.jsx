// components/payment/SecurePaymentFlow.jsx
// PRODUCTION VERSION - All debug logs removed, enhanced error handling

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { 
  CreditCard, 
  Building2, 
  Shield, 
  Lock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Validate Stripe key at module load
if (!stripePublishableKey || !stripePublishableKey.startsWith('pk_')) {
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Invalid or missing Stripe publishable key');
  }
}

// Initialize Stripe
let stripePromise = null;
try {
  if (stripePublishableKey && stripePublishableKey.startsWith('pk_')) {
    stripePromise = loadStripe(stripePublishableKey);
  }
} catch (error) {
  // Silent fail in production, log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Stripe initialization error:', error);
  }
}

// Enhanced Payment Form Component
function PaymentForm({ bookingData, onPaymentSuccess, onPaymentError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setMessage('Payment system is initializing. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    setMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/payment-complete?booking_id=${bookingData.id}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Enhanced error handling
        let userFriendlyMessage = 'Payment failed. Please try again.';
        
        switch (error.code) {
          case 'card_declined':
            userFriendlyMessage = 'Your card was declined. Please try a different payment method.';
            break;
          case 'expired_card':
            userFriendlyMessage = 'Your card has expired. Please use a different card.';
            break;
          case 'insufficient_funds':
            userFriendlyMessage = 'Insufficient funds. Please try a different payment method.';
            break;
          case 'incorrect_cvc':
            userFriendlyMessage = 'Your card\'s security code is incorrect. Please check and try again.';
            break;
          case 'processing_error':
            userFriendlyMessage = 'Payment processing error. Please try again in a few moments.';
            break;
          case 'rate_limit_exceeded':
            userFriendlyMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          default:
            userFriendlyMessage = error.message || 'Payment failed. Please try again.';
        }
        
        setMessage(userFriendlyMessage);
        onPaymentError(userFriendlyMessage);
        
        // Track retry attempts
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
        }
        
      } else if (paymentIntent) {
        if (paymentIntent.status === 'succeeded') {
          onPaymentSuccess(paymentIntent);
        } else if (paymentIntent.status === 'processing') {
          setMessage('Your payment is being processed. You will receive confirmation within 1-2 business days.');
        } else if (paymentIntent.status === 'requires_action') {
          setMessage('Additional authentication required. Please complete the verification and try again.');
        }
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setMessage(errorMessage);
      onPaymentError(errorMessage);
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Payment error:', err);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border border-gray-200 rounded-lg">
        <PaymentElement 
          options={{
            layout: "tabs",
            defaultValues: {
              billingDetails: {
                email: bookingData.email,
                name: bookingData.contactName,
              }
            }
          }}
        />
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          message.includes('processing') 
            ? 'bg-yellow-50 border border-yellow-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.includes('processing') ? (
            <Clock className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
          ) : (
            <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
          )}
          <div>
            <span className={message.includes('processing') ? 'text-yellow-800' : 'text-red-800'}>
              {message}
            </span>
            {retryCount > 0 && retryCount < 3 && (
              <p className="text-sm text-gray-600 mt-1">
                Attempt {retryCount + 1} of 3
              </p>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
          !stripe || isProcessing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
        }`}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="animate-spin" size={20} />
            <span>Processing Payment...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <Lock size={20} />
            <span>Pay ${bookingData.totalAmount} Securely</span>
          </div>
        )}
      </button>
    </form>
  );
}

// Main Payment Component - Production Ready
export default function SecurePaymentFlow({ bookingId }) {
  const [clientSecret, setClientSecret] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const retryTimeoutRef = useRef(null);

  // Fetch payment intent on component mount
  useEffect(() => {
    if (bookingId && stripePublishableKey?.startsWith('pk_')) {
      createPaymentIntent();
    } else {
      setError('Payment system configuration error. Please contact support.');
      setIsLoading(false);
    }
  }, [bookingId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          paymentMethod: 'card',
        }),
      });

      const data = await response.json();

      if (data.success && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setBookingData(data.booking);
        setPaymentDetails(data.paymentDetails);
      } else {
        throw new Error(data.error || 'Failed to setup payment');
      }
    } catch (err) {
      const errorMessage = 'Unable to setup payment. Please try again.';
      setError(errorMessage);
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Payment intent error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentIntent) => {
    setPaymentStatus('succeeded');
    
    // Redirect after short delay
    retryTimeoutRef.current = setTimeout(() => {
      window.location.href = `/booking/payment-complete?booking_id=${bookingId}`;
    }, 2000);
  };

  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
    setPaymentStatus('failed');
  };

  // Enhanced error display for production
  if (!stripePublishableKey || !stripePublishableKey.startsWith('pk_')) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <AlertCircle className="text-red-600" size={24} />
          <span className="text-red-800">Payment system temporarily unavailable</span>
        </div>
        <p className="text-gray-600 text-center">
          Please try again later or contact support if the issue persists.
        </p>
        <div className="mt-6 text-center">
          <a
            href="/contact"
            className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="animate-spin text-emerald-600" size={24} />
          <span className="text-gray-600">Setting up secure payment...</span>
        </div>
      </div>
    );
  }

  if (error && !clientSecret) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <AlertCircle className="text-red-600" size={24} />
          <span className="text-red-800">{error}</span>
        </div>
        <div className="text-center">
          <button
            onClick={createPaymentIntent}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#10b981',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Security Header */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-full">
            <Shield className="text-emerald-600" size={16} />
            <span className="text-emerald-800 text-sm font-medium">256-bit SSL Encrypted</span>
          </div>
        </div>

        {/* Booking Summary */}
        {bookingData && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Event:</span>
                <span className="font-medium">{bookingData.eventName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{bookingData.eventDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{bookingData.eventTime}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-3">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-lg font-bold text-emerald-600">
                  ${bookingData.totalAmount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm 
              bookingData={bookingData}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          </Elements>
        )}

        {/* Payment Status */}
        {paymentStatus === 'succeeded' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <CheckCircle className="text-green-600" size={20} />
            <div>
              <div className="text-green-800 font-medium">Payment Successful!</div>
              <div className="text-green-700 text-sm">Redirecting to confirmation page...</div>
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Shield size={14} />
              <span>SSL Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <Lock size={14} />
              <span>PCI Compliant</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle size={14} />
              <span>Stripe Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}