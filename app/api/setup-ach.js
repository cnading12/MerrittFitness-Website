export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingId, amount, customerInfo } = req.body;
    
    // Create Stripe customer for ACH
    const customer = await stripe.customers.create({
      email: customerInfo.email,
      name: customerInfo.contactName,
      phone: customerInfo.phone,
      metadata: {
        bookingId: bookingId
      }
    });

    // Create setup intent for ACH
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['us_bank_account'],
      usage: 'off_session',
      metadata: {
        bookingId: bookingId,
        amount: amount.toString()
      }
    });

    // Update booking with ACH setup details
    await supabase
      .from('bookings')
      .update({ 
        status: 'pending_ach_setup',
        stripe_customer_id: customer.id,
        setup_intent_id: setupIntent.id
      })
      .eq('id', bookingId);

    // Send ACH setup email
    await sendACHSetupEmail(customerInfo, bookingId, setupIntent.client_secret);

    res.status(200).json({ 
      success: true, 
      clientSecret: setupIntent.client_secret,
      customerId: customer.id
    });
    
  } catch (error) {
    console.error('ACH setup error:', error);
    res.status(500).json({ error: 'ACH setup failed' });
  }
}