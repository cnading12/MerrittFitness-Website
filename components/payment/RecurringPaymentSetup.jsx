'use client';

import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  Banknote,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Lock,
  Info,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

const stripePromise = (() => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key || !key.startsWith('pk_')) return null;
  return loadStripe(key);
})();

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseRecurringDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function describeSlot(slot) {
  const day = DAY_LABELS[Number(slot.dayOfWeek)] || '?';
  const freq = slot.frequency === 'weekly' ? 'Every' : slot.frequency === 'biweekly' ? 'Every other' : 'Monthly on';
  return `${freq} ${day} at ${slot.startTime} · ${slot.durationHours} hr`;
}

export default function RecurringPaymentSetup({ bookingId }) {
  const [booking, setBooking] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState('ach');
  const [clientSecret, setClientSecret] = useState('');
  const [setupIntentId, setSetupIntentId] = useState('');
  const [setupError, setSetupError] = useState('');
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setLoadError('Missing booking id.');
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/booking/${bookingId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load booking (HTTP ${res.status}).`);
        }
        const data = await res.json();
        if (!cancelled) {
          setBooking(data);
          // Default to whatever the renter chose at intake.
          const preferred = data.payment_method === 'card' ? 'card' : 'ach';
          setPaymentMethod(preferred);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  useEffect(() => {
    if (!booking) return;
    // Recreate the SetupIntent whenever payment method changes — the
    // payment_method_types differ (us_bank_account vs. card) so the Elements
    // tree must be torn down and rebuilt with a new client secret.
    setClientSecret('');
    setSetupIntentId('');
    setSetupError('');
    setIsCreatingIntent(true);
    (async () => {
      try {
        const res = await fetch('/api/payment/create-recurring-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, paymentMethod }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to start payment setup.');
        }
        setClientSecret(data.clientSecret);
        setSetupIntentId(data.setupIntentId);
      } catch (err) {
        setSetupError(err.message);
      } finally {
        setIsCreatingIntent(false);
      }
    })();
  }, [booking, bookingId, paymentMethod]);

  if (!stripePromise) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <AlertCircle className="text-red-600 mx-auto mb-4" size={32} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment System Not Configured</h2>
        <p className="text-red-600">Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and redeploy.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Loader2 className="animate-spin text-emerald-600 mx-auto mb-4" size={32} />
        <p className="text-gray-600">Loading your recurring booking...</p>
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <AlertCircle className="text-red-600 mx-auto mb-4" size={32} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Could not load booking</h2>
        <p className="text-red-600 mb-4">{loadError || 'Booking not found.'}</p>
        <a href="/booking" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <ArrowLeft size={16} /> Return to booking
        </a>
      </div>
    );
  }

  const details = parseRecurringDetails(booking.recurring_details);
  const slots = details?.slots || [];
  const monthlyMin = details?.pricing?.monthlyMinCharge ?? details?.monthlyMinCharge;
  const monthlyMax = details?.pricing?.monthlyMaxCharge ?? details?.monthlyMaxCharge;
  const hourlyRate = details?.pricing?.hourlyRate ?? details?.hourlyRate ?? 95;
  const firstMonthCharge = Number(booking.subtotal ?? 0);
  const startDate = details?.startDate || booking.event_date;

  return (
    <div className="max-w-4xl mx-auto grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Set Up Monthly Auto-Pay</h2>
          <p className="text-gray-600 text-sm mb-6">
            Your recurring series won't be charged today. We'll securely save your payment method
            and auto-charge on the first of each month for that month's actual hours.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setPaymentMethod('ach')}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'ach'
                  ? 'border-emerald-600 bg-emerald-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${paymentMethod === 'ach' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  <Banknote size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">ACH Auto-Debit</span>
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">No Fee</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Connect your bank through Stripe Financial Connections. Recommended — no monthly processing fee.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'card'
                  ? 'border-emerald-600 bg-emerald-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${paymentMethod === 'card' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  <CreditCard size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">Credit or Debit Card</span>
                    <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">+3% fee</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Stripe adds a 3% processing fee on every monthly charge.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
            <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-blue-900">
              You'll only be charged <strong>${firstMonthCharge.toFixed(2)}</strong> for your first
              (partial) month, invoiced on {formatDate(details?.firstBillingDate || startDate)}. After
              that, we auto-charge on the first of each month for the previous month's hours.
            </p>
          </div>

          {setupError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                <div className="flex-1">
                  <p className="text-sm text-red-800">{setupError}</p>
                </div>
              </div>
            </div>
          )}

          {isCreatingIntent && (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin text-emerald-600 mx-auto mb-3" size={24} />
              <p className="text-sm text-gray-600">
                Preparing {paymentMethod === 'ach' ? 'bank connection' : 'card form'}...
              </p>
            </div>
          )}

          {clientSecret && !isCreatingIntent && (
            <Elements
              key={setupIntentId}
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#10b981',
                    borderRadius: '8px',
                    fontFamily: 'system-ui, sans-serif',
                  },
                },
              }}
            >
              <RecurringSetupForm
                bookingId={bookingId}
                setupIntentId={setupIntentId}
                paymentMethod={paymentMethod}
                contactName={booking.contact_name}
                email={booking.email}
              />
            </Elements>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Lock size={12} />
          Secured by Stripe. Bank credentials never touch our servers.
        </div>
      </div>

      <aside className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Series Summary</h3>

          <div className="p-4 bg-emerald-50 rounded-xl mb-4">
            <h4 className="font-medium text-emerald-900 mb-1">{booking.event_name}</h4>
            <p className="text-emerald-700 text-sm capitalize">{booking.event_type?.replace('-', ' ')}</p>
          </div>

          <div className="space-y-3 text-sm mb-4">
            <div className="flex items-start gap-3">
              <Calendar className="text-gray-400 mt-0.5" size={16} />
              <div>
                <div className="text-gray-500 text-xs">Start</div>
                <div className="text-gray-900">{formatDate(startDate)}</div>
              </div>
            </div>
            {details?.endDate && (
              <div className="flex items-start gap-3">
                <Calendar className="text-gray-400 mt-0.5" size={16} />
                <div>
                  <div className="text-gray-500 text-xs">End</div>
                  <div className="text-gray-900">{formatDate(details.endDate)}</div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <MapPin className="text-gray-400 mt-0.5" size={16} />
              <span>2246 Irving St, Denver, CO 80211</span>
            </div>
          </div>

          {slots.length > 0 && (
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Recurring slots</div>
              <ul className="space-y-1 text-sm text-gray-700">
                {slots.map((s, i) => <li key={i}>{describeSlot(s)}</li>)}
              </ul>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Hourly rate</span>
              <span className="text-gray-900">${Number(hourlyRate).toFixed(0)}/hr</span>
            </div>
            {monthlyMin !== undefined && monthlyMax !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly estimate</span>
                <span className="text-gray-900">${Number(monthlyMin).toFixed(0)} – ${Number(monthlyMax).toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-100">
              <span className="font-medium text-gray-900">First-month charge</span>
              <span className="font-bold text-gray-900">${firstMonthCharge.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500">
              Prorated for partial first month. Subsequent months vary based on actual occurrences.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function RecurringSetupForm({ bookingId, setupIntentId, paymentMethod, contactName, email }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setMessage('');
    setStatus('confirming');

    const returnUrl = `${window.location.origin}/booking/payment?booking_id=${bookingId}&application_type=recurring`;

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          billing_details: {
            name: contactName || '',
            email: email || '',
          },
        },
      },
      redirect: 'if_required',
    });

    if (error) {
      setIsSubmitting(false);
      setStatus('error');
      setMessage(error.message || 'Failed to save payment method.');
      return;
    }

    // ACH can return 'processing' (micro-deposits) — both 'succeeded' and
    // 'processing' are terminal client-side states we can act on. The webhook
    // retries finalization once ACH finishes verifying.
    if (setupIntent && (setupIntent.status === 'succeeded' || setupIntent.status === 'processing')) {
      setStatus('finalizing');
      try {
        const res = await fetch('/api/payment/create-recurring-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, setupIntentId }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Could not finalize subscription.');
        }
        setStatus('done');
        window.location.href = data.redirect || `/booking/success?booking_id=${bookingId}&application_type=recurring`;
      } catch (err) {
        setStatus('error');
        setMessage(err.message);
        setIsSubmitting(false);
      }
    } else {
      setStatus('error');
      setMessage(`Unexpected setup status: ${setupIntent?.status || 'unknown'}`);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {message && status === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-red-800">{message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {status === 'confirming' && <><Loader2 className="animate-spin" size={18} /> Saving {paymentMethod === 'ach' ? 'bank account' : 'card'}...</>}
        {status === 'finalizing' && <><Loader2 className="animate-spin" size={18} /> Creating subscription...</>}
        {status === 'done' && <><CheckCircle size={18} /> Subscription active — redirecting...</>}
        {(status === 'idle' || status === 'error') && (
          <>
            <Lock size={16} />
            {paymentMethod === 'ach' ? 'Connect Bank & Start Auto-Pay' : 'Save Card & Start Auto-Pay'}
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        By continuing, you authorize Merritt Wellness to automatically charge this payment method on the first of each month for that month's rental hours.
        You can cancel auto-pay any time by contacting clientservices@merrittwellness.net.
      </p>
    </form>
  );
}
