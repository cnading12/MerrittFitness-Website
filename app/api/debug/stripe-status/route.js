import { stripe } from '../../../lib/stripe-config.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('booking_id');
  
  try {
    // Get booking from database
    const { getBooking } = await import('../../../lib/database.js');
    const booking = bookingId ? await getBooking(bookingId) : null;
    
    // Get recent payment intents from Stripe
    const paymentIntents = await stripe.paymentIntents.list({ 
      limit: 10 
    });
    
    // Get webhooks
    const webhooks = await stripe.webhookEndpoints.list();
    
    const response = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'LIVE',
      
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhookEndpoints: webhooks.data.map(wh => ({
        url: wh.url,
        status: wh.status,
        events: wh.enabled_events
      })),
      
      booking: booking ? {
        id: booking.id,
        status: booking.status,
        payment_intent_id: booking.payment_intent_id,
        total_amount: booking.total_amount
      } : null,
      
      recentPaymentIntents: paymentIntents.data.map(pi => ({
        id: pi.id,
        amount: pi.amount / 100,
        status: pi.status,
        created: new Date(pi.created * 1000).toISOString(),
        bookingId: pi.metadata?.bookingId,
        description: pi.description
      }))
    };
    
    return Response.json(response);
    
  } catch (error) {
    return Response.json({
      error: error.message,
      stripeKeyPresent: !!process.env.STRIPE_SECRET_KEY,
      webhookSecretPresent: !!process.env.STRIPE_WEBHOOK_SECRET
    }, { status: 500 });
  }
}