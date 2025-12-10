import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: false,
});

// Payment configuration
export const PAYMENT_CONFIG = {
  currency: 'usd',
  
  // Minimum amounts (in cents)
  minimums: {
    card: 50, // $0.50 minimum for cards
    ach: 100, // $1.00 minimum for ACH
  },
  
  // Maximum amounts (in cents) - for fraud protection
  maximums: {
    card: 500000, // $5,000 maximum for cards
    ach: 2500000, // $25,000 maximum for ACH
  },
  
  // Fee structure (for transparency)
  fees: {
    card: { percentage: 2.9, fixed: 30 },
    ach: { percentage: 0.8, fixed: 5, cap: 500 }
  }
};

// Create payment intent with security features
export async function createSecurePaymentIntent(bookingData, paymentMethod = 'card') {
  try {
    const amount = Math.round(bookingData.total * 100); // Convert to cents
    
    // Validate amount limits
    if (amount < PAYMENT_CONFIG.minimums[paymentMethod]) {
      throw new Error(`Minimum payment amount is $${PAYMENT_CONFIG.minimums[paymentMethod] / 100}`);
    }
    
    if (amount > PAYMENT_CONFIG.maximums[paymentMethod]) {
      throw new Error(`Maximum payment amount is $${PAYMENT_CONFIG.maximums[paymentMethod] / 100}`);
    }
    
    // FIXED: Simplified payment intent configuration
    const paymentIntentData = {
      amount,
      currency: PAYMENT_CONFIG.currency,
      
      // Enhanced metadata for tracking and security
      metadata: {
        bookingId: bookingData.id,
        eventName: bookingData.eventName,
        eventDate: bookingData.selectedDate,
        eventTime: bookingData.selectedTime,
        customerEmail: bookingData.email,
        customerName: bookingData.contactName,
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString(),
      },
      
      // Receipt email
      receipt_email: bookingData.email,
      
      // Description for customer statements
      description: `Event booking: ${bookingData.eventName} on ${bookingData.selectedDate}`,
      
      // Statement descriptor (appears on customer's card statement)
      statement_descriptor: 'MERRITT HOUSE',
      statement_descriptor_suffix: 'EVENT',

      // Enable automatic payment methods (includes Apple Pay, Google Pay, Link, and cards)
      // This allows Stripe to show wallet buttons prominently in the Payment Element
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Prevent redirect-based payment methods
      },

      // Capture method - we'll capture immediately for events
      capture_method: 'automatic',
    };
    
    // Add ACH-specific configuration
    if (paymentMethod === 'ach') {
      paymentIntentData.payment_method_types = ['us_bank_account'];
      paymentIntentData.payment_method_options = {
        us_bank_account: {
          verification_method: 'automatic',
          preferred_settlement_speed: 'fastest',
        },
      };
      // Remove automatic_payment_methods for ACH
      delete paymentIntentData.automatic_payment_methods;
    }
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    
    console.log('✅ Secure payment intent created:', paymentIntent.id);
    return paymentIntent;
    
  } catch (error) {
    console.error('❌ Payment intent creation error:', error);
    throw new Error(`Payment setup failed: ${error.message}`);
  }
}

// Calculate payment details
export function calculatePaymentDetails(amount, paymentMethod = 'card') {
  const amountCents = Math.round(amount * 100);
  const config = PAYMENT_CONFIG.fees[paymentMethod];
  
  // Calculate Stripe fees
  let stripeFee;
  if (paymentMethod === 'ach') {
    stripeFee = Math.min(
      Math.round(amountCents * (config.percentage / 100)) + config.fixed,
      config.cap
    );
  } else {
    stripeFee = Math.round(amountCents * (config.percentage / 100)) + config.fixed;
  }
  
  return {
    subtotal: amountCents,
    stripeFee: stripeFee,
    total: amountCents, // We absorb the fee
    displayTotal: amount, // What customer pays
    savings: paymentMethod === 'ach' ? Math.round((PAYMENT_CONFIG.fees.card.percentage - PAYMENT_CONFIG.fees.ach.percentage) * amountCents / 100) : 0,
  };
}

// Export configured Stripe instance
export { stripe };
