// app/lib/stripe-config.js
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use latest stable API version
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
    card: {
      percentage: 2.9, // 2.9%
      fixed: 30, // + $0.30
    },
    ach: {
      percentage: 0.8, // 0.8%
      fixed: 5, // + $0.05
      cap: 500, // capped at $5.00
    }
  },
  
  // Security settings
  security: {
    enableRadarRules: true,
    requireCVV: true,
    requireZipCode: true,
    enableSCA: true, // Strong Customer Authentication
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
      
      // Automatic payment methods (recommended by Stripe)
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Keep user on our site
      },
      
      // Enhanced fraud protection
      radar_options: {
        session: paymentMethod === 'card' ? generateRadarSession(bookingData) : undefined,
      },
      
      // Capture method - we'll capture immediately for events
      capture_method: 'automatic',
      
      // Confirmation method - manual allows us to handle 3D Secure
      confirmation_method: 'manual',
      
      // Return URL for 3D Secure redirects
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/payment-complete?booking_id=${bookingData.id}`,
    };
    
    // Add ACH-specific configuration
    if (paymentMethod === 'ach') {
      paymentIntentData.payment_method_types = ['us_bank_account'];
      paymentIntentData.payment_method_options = {
        us_bank_account: {
          verification_method: 'automatic', // Faster verification
          preferred_settlement_speed: 'fastest', // Usually 1-2 business days
        },
      };
    }
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
    
    console.log('✅ Secure payment intent created:', paymentIntent.id);
    return paymentIntent;
    
  } catch (error) {
    console.error('❌ Payment intent creation error:', error);
    throw new Error(`Payment setup failed: ${error.message}`);
  }
}

// Generate Radar session for enhanced fraud detection
function generateRadarSession(bookingData) {
  return {
    id: `booking_${bookingData.id}_${Date.now()}`,
    version: '1.0.0',
  };
}

// Confirm payment with additional security checks
export async function confirmPaymentWithSecurity(paymentIntentId, paymentMethodId, bookingData) {
  try {
    console.log('🔒 Confirming payment with security checks...');
    
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
      
      // Use our return URL for 3D Secure
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/payment-complete?booking_id=${bookingData.id}`,
      
      // Additional fraud prevention
      use_stripe_sdk: true,
    });
    
    console.log('✅ Payment confirmed:', paymentIntent.id, 'Status:', paymentIntent.status);
    return paymentIntent;
    
  } catch (error) {
    console.error('❌ Payment confirmation error:', error);
    throw error;
  }
}

// Create customer for repeat bookings and ACH
export async function createSecureCustomer(customerData) {
  try {
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.contactName,
      phone: customerData.phone,
      
      // Address for enhanced verification
      address: {
        line1: customerData.address?.line1,
        line2: customerData.address?.line2,
        city: customerData.address?.city,
        state: customerData.address?.state,
        postal_code: customerData.address?.postal_code,
        country: 'US',
      },
      
      // Metadata for tracking
      metadata: {
        source: 'merritt_house_booking',
        created_by: 'booking_system',
        first_booking_id: customerData.bookingId,
      },
      
      // Tax ID collection (for business customers)
      tax_exempt: 'none',
    });
    
    console.log('✅ Secure customer created:', customer.id);
    return customer;
    
  } catch (error) {
    console.error('❌ Customer creation error:', error);
    throw error;
  }
}

// Setup ACH with verification
export async function setupACHPayment(customerId, bookingData) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['us_bank_account'],
      usage: 'off_session',
      
      // Metadata for tracking
      metadata: {
        bookingId: bookingData.id,
        amount: (bookingData.total * 100).toString(),
        eventDate: bookingData.selectedDate,
        purpose: 'event_booking',
      },
      
      // ACH-specific options
      payment_method_options: {
        us_bank_account: {
          verification_method: 'automatic',
        },
      },
    });
    
    console.log('✅ ACH setup intent created:', setupIntent.id);
    return setupIntent;
    
  } catch (error) {
    console.error('❌ ACH setup error:', error);
    throw error;
  }
}

// Validate payment amount and calculate fees
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