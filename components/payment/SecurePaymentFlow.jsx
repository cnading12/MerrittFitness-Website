import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Building2, 
  Shield, 
  Lock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  DollarSign,
  Clock
} from 'lucide-react';

// Main Payment Component
export default function SecurePaymentFlow({ bookingId, bookingData }) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const cardElementRef = useRef(null);
  const stripeElementsRef = useRef(null);

  // Load Stripe.js
  useEffect(() => {
    const loadStripe = async () => {
      if (window.Stripe) {
        const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        setStripe(stripeInstance);
      } else {
        // Load Stripe.js if not already loaded
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = () => {
          const stripeInstance = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
          setStripe(stripeInstance);
        };
        document.head.appendChild(script);
      }
    };

    loadStripe();
  }, []);

  // Create payment intent when component mounts or payment method changes
  useEffect(() => {
    if (bookingId) {
      createPaymentIntent();
    }
  }, [bookingId, paymentMethod]);

  // Setup Stripe Elements when stripe loads and clientSecret is available
  useEffect(() => {
    if (stripe && clientSecret && paymentMethod === 'card') {
      setupStripeElements();
    }
  }, [stripe, clientSecret, paymentMethod]);

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
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setClientSecret(data.clientSecret);
        setPaymentDetails(data.paymentDetails);
      } else {
        setError(data.error || 'Failed to setup payment');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const setupStripeElements = () => {
    if (!stripe || !clientSecret) return;

    const appearance = {
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
      rules: {
        '.Input': {
          border: '1px solid #d1d5db',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
        '.Input:focus': {
          border: '1px solid #10b981',
          boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
        },
      },
    };

    const elementsInstance = stripe.elements({
      clientSecret,
      appearance,
    });

    // Create and mount the Payment Element
    const paymentElement = elementsInstance.create('payment');
    
    if (cardElementRef.current) {
      paymentElement.mount(cardElementRef.current);
    }

    setElements(elementsInstance);
    stripeElementsRef.current = paymentElement;
  };

  const handleCardPayment = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements || !stripeElementsRef.current) {
      setError('Payment system not ready. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/payment-complete?booking_id=${bookingId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setError(error.message);
        setIsProcessing(false);
      } else if (paymentIntent) {
        if (paymentIntent.status === 'succeeded') {
          setPaymentStatus('succeeded');
          // Redirect to success page or show success message
          window.location.href = `/booking/success?booking_id=${bookingId}`;
        } else if (paymentIntent.status === 'processing') {
          setPaymentStatus('processing');
        } else if (paymentIntent.status === 'requires_action') {
          setError('Additional authentication required. Please try again.');
          setIsProcessing(false);
        }
      }
    } catch (err) {
      setError('Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleACHPayment = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Setup ACH payment
      const response = await fetch('/api/payment/ach-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to ACH setup flow
        window.location.href = `/booking/ach-setup?setup_secret=${data.clientSecret}&booking_id=${bookingId}`;
      } else {
        setError(data.error || 'ACH setup failed');
        setIsProcessing(false);
      }
    } catch (err) {
      setError('ACH setup failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!clientSecret && isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="animate-spin text-emerald-600" size={24} />
          <span className="text-gray-600">Setting up secure payment...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Security Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-full">
            <Shield className="text-emerald-600" size={16} />
            <span className="text-emerald-800 text-sm font-medium">256-bit SSL Encrypted</span>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Event:</span>
              <span className="font-medium">{bookingData?.eventName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{bookingData?.eventDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Time:</span>
              <span className="font-medium">{bookingData?.eventTime}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-lg font-bold text-emerald-600">
                ${paymentDetails?.displayTotal || bookingData?.totalAmount}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Payment Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Payment */}
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 border-2 rounded-xl transition-all ${
                paymentMethod === 'card'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <CreditCard className={paymentMethod === 'card' ? 'text-emerald-600' : 'text-gray-500'} size={24} />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Credit/Debit Card</div>
                  <div className="text-sm text-gray-500">Instant confirmation</div>
                  <div className="text-xs text-gray-400 mt-1">
                    2.9% + $0.30 processing fee
                  </div>
                </div>
              </div>
            </button>

            {/* ACH Payment */}
            <button
              onClick={() => setPaymentMethod('ach')}
              className={`p-4 border-2 rounded-xl transition-all ${
                paymentMethod === 'ach'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Building2 className={paymentMethod === 'ach' ? 'text-emerald-600' : 'text-gray-500'} size={24} />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Bank Transfer (ACH)</div>
                  <div className="text-sm text-gray-500">Lower fees, 1-2 days</div>
                  {paymentDetails && paymentDetails.savings > 0 && (
                    <div className="text-xs text-emerald-600 mt-1">
                      Save ${(paymentDetails.savings / 100).toFixed(2)} in fees
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Payment Forms */}
        {paymentMethod === 'card' && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Card Information</h4>
            
            {/* Stripe Elements will be mounted here */}
            <div 
              ref={cardElementRef}
              className="p-4 border border-gray-200 rounded-lg mb-6 min-h-[50px]"
            />

            {/* Security Features */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <Lock className="text-blue-600" size={16} />
                <span className="text-blue-800 font-medium text-sm">Your payment is secure</span>
              </div>
              <ul className="text-blue-700 text-xs space-y-1">
                <li>• End-to-end encryption</li>
                <li>• PCI DSS compliant</li>
                <li>• No card details stored on our servers</li>
              </ul>
            </div>

            <button
              onClick={handleCardPayment}
              disabled={isProcessing || !stripe}
              className={`w-full py-4 px-6 rounded-xl font-semibold transition-all ${
                isProcessing || !stripe
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
                  <span>Pay ${paymentDetails?.displayTotal || bookingData?.totalAmount} Securely</span>
                </div>
              )}
            </button>
          </div>
        )}

        {paymentMethod === 'ach' && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Bank Transfer (ACH)</h4>
            
            <div className="bg-amber-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="text-amber-600" size={16} />
                <span className="text-amber-800 font-medium text-sm">ACH Payment Process</span>
              </div>
              <ul className="text-amber-700 text-sm space-y-1">
                <li>• Connect your bank account securely</li>
                <li>• Payment processed in 1-2 business days</li>
                <li>• Lower processing fees</li>
                <li>• You'll receive confirmation once processed</li>
              </ul>
            </div>

            <button
              onClick={handleACHPayment}
              disabled={isProcessing}
              className={`w-full py-4 px-6 rounded-xl font-semibold transition-all ${
                isProcessing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Setting up ACH...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Building2 size={20} />
                  <span>Setup Bank Transfer</span>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Payment Status */}
        {paymentStatus === 'processing' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-2">
            <Clock className="text-yellow-600" size={20} />
            <div>
              <div className="text-yellow-800 font-medium">Payment Processing</div>
              <div className="text-yellow-700 text-sm">Your payment is being processed. You'll receive confirmation within 1-2 business days.</div>
            </div>
          </div>
        )}

        {paymentStatus === 'succeeded' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <CheckCircle className="text-green-600" size={20} />
            <div>
              <div className="text-green-800 font-medium">Payment Successful!</div>
              <div className="text-green-700 text-sm">Your booking is confirmed. Redirecting...</div>
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