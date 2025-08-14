// Option 1: Update components/payment/SecurePaymentFlow.jsx
// Add more detailed debugging and fallback handling

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

// Enhanced debugging for Stripe key
console.log('🔍 Stripe Environment Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All NEXT_PUBLIC vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')));

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

console.log('🔑 Stripe Key Debug:');
console.log('Key present:', !!stripePublishableKey);
console.log('Key type:', typeof stripePublishableKey);
console.log('Key length:', stripePublishableKey?.length || 0);
console.log('Key preview:', stripePublishableKey ? stripePublishableKey.substring(0, 15) + '...' : 'UNDEFINED');

// More aggressive check
if (!stripePublishableKey || stripePublishableKey.trim() === '') {
  console.error('❌ STRIPE KEY ISSUE:');
  console.error('- Key is:', stripePublishableKey);
  console.error('- All env vars:', Object.keys(process.env).filter(k => k.includes('STRIPE')));
}

// Load Stripe with better error handling
let stripePromise = null;
try {
  if (stripePublishableKey && stripePublishableKey.startsWith('pk_')) {
    stripePromise = loadStripe(stripePublishableKey);
    console.log('✅ Stripe loading initiated');
  } else {
    console.error('❌ Invalid Stripe key format:', stripePublishableKey);
  }
} catch (error) {
  console.error('❌ Stripe loading error:', error);
}

// Payment Form Component (unchanged)
function PaymentForm({ bookingData, onPaymentSuccess, onPaymentError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setMessage('Payment system not ready. Please try refreshing the page.');
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
        setMessage(error.message);
        onPaymentError(error.message);
      } else if (paymentIntent) {
        if (paymentIntent.status === 'succeeded') {
          onPaymentSuccess(paymentIntent);
        } else if (paymentIntent.status === 'processing') {
          setMessage('Payment is being processed. You will receive confirmation within 1-2 business days.');
        } else if (paymentIntent.status === 'requires_action') {
          setMessage('Additional authentication required. Please try again.');
        }
      }
    } catch (err) {
      setMessage('Payment failed. Please try again.');
      onPaymentError(err.message);
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
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.includes('processing') 
            ? 'bg-yellow-50 border border-yellow-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.includes('processing') ? (
            <Clock className="text-yellow-600" size={20} />
          ) : (
            <AlertCircle className="text-red-600" size={20} />
          )}
          <span className={message.includes('processing') ? 'text-yellow-800' : 'text-red-800'}>
            {message}
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-4 px-6 rounded-xl font-semibold transition-all ${
          !stripe || isProcessing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl'
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

// Main Payment Component with enhanced debugging
export default function SecurePaymentFlow({ bookingId }) {
  const [clientSecret, setClientSecret] = useState('');
  const [bookingData, setBookingData] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  // Enhanced Stripe configuration check
  useEffect(() => {
    console.log('🔄 SecurePaymentFlow mounted');
    console.log('Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- Stripe key present:', !!stripePublishableKey);
    console.log('- Stripe key valid format:', stripePublishableKey?.startsWith('pk_'));
    
    if (!stripePublishableKey) {
      const debugInfo = {
        env: process.env.NODE_ENV,
        allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC')),
        stripeKeys: Object.keys(process.env).filter(k => k.includes('STRIPE'))
      };
      console.error('❌ Stripe key missing. Debug info:', debugInfo);
      setError(`Payment system configuration error. Debug: ${JSON.stringify(debugInfo)}`);
      setIsLoading(false);
      return;
    }

    if (!stripePublishableKey.startsWith('pk_')) {
      console.error('❌ Invalid Stripe key format:', stripePublishableKey.substring(0, 10) + '...');
      setError('Invalid payment configuration. Please contact support.');
      setIsLoading(false);
      return;
    }

    console.log('✅ Stripe configuration looks good');
  }, []);

  // Fetch payment intent on component mount
  useEffect(() => {
    if (bookingId && stripePublishableKey?.startsWith('pk_')) {
      createPaymentIntent();
    }
  }, [bookingId]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('🔄 Creating payment intent for booking:', bookingId);
      
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

      console.log('📥 Payment intent response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Payment intent response:', { success: data.success, hasClientSecret: !!data.clientSecret });

      if (data.success) {
        setClientSecret(data.clientSecret);
        setBookingData(data.booking);
        setPaymentDetails(data.paymentDetails);
        console.log('✅ Payment intent created successfully');
      } else {
        console.error('❌ Payment intent creation failed:', data.error);
        setError(data.error || 'Failed to setup payment');
      }
    } catch (err) {
      console.error('❌ Payment intent network error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentIntent) => {
    setPaymentStatus('succeeded');
    setTimeout(() => {
      window.location.href = `/booking/payment-complete?booking_id=${bookingId}`;
    }, 2000);
  };

  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
    setPaymentStatus('failed');
  };

  // Enhanced error display with debug info
  if (!stripePublishableKey || !stripePublishableKey.startsWith('pk_')) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <AlertCircle className="text-red-600" size={24} />
          <span className="text-red-800">Payment system configuration error</span>
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <p><strong>Debug Info:</strong></p>
          <p>Environment: {process.env.NODE_ENV}</p>
          <p>Key present: {!!stripePublishableKey ? 'Yes' : 'No'}</p>
          <p>Key format: {stripePublishableKey?.startsWith('pk_') ? 'Valid' : 'Invalid'}</p>
          <p>Key preview: {stripePublishableKey ? stripePublishableKey.substring(0, 15) + '...' : 'undefined'}</p>
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
        <div className="flex items-center justify-center space-x-3">
          <AlertCircle className="text-red-600" size={24} />
          <span className="text-red-800">{error}</span>
        </div>
        <button
          onClick={createPaymentIntent}
          className="mt-4 w-full py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Try Again
        </button>
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