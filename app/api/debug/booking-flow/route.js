import { getBooking } from '../../../lib/database.js';
import { stripe } from '../../../lib/stripe-config.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('booking_id');
  const paymentIntentId = searchParams.get('payment_intent_id');
  
  try {
    const result = {
      timestamp: new Date().toISOString(),
      bookingId: bookingId,
      paymentIntentId: paymentIntentId,
    };
    
    // 1. Check booking in database
    if (bookingId) {
      result.booking = await getBooking(bookingId);
      result.bookingExists = !!result.booking;
    }
    
    // 2. Check payment intent in Stripe
    if (paymentIntentId) {
      try {
        result.paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        result.paymentIntentStatus = result.paymentIntent.status;
        result.paymentIntentMetadata = result.paymentIntent.metadata;
      } catch (err) {
        result.paymentIntentError = err.message;
      }
    }
    
    // 3. If we have bookingId, find related payment intent
    if (bookingId && !paymentIntentId) {
      const paymentIntents = await stripe.paymentIntents.list({
        limit: 100,
      });
      
      const relatedPI = paymentIntents.data.find(
        pi => pi.metadata.bookingId === bookingId
      );
      
      if (relatedPI) {
        result.foundPaymentIntent = {
          id: relatedPI.id,
          status: relatedPI.status,
          amount: relatedPI.amount,
          metadata: relatedPI.metadata
        };
      }
    }
    
    // 4. Check recent webhook events
    const events = await stripe.events.list({ limit: 10 });
    result.recentWebhookEvents = events.data
      .filter(e => e.type.startsWith('payment_intent'))
      .map(e => ({
        type: e.type,
        created: new Date(e.created * 1000).toISOString(),
        payment_intent_id: e.data.object.id,
        bookingId: e.data.object.metadata?.bookingId
      }));
    
    return Response.json(result, { status: 200 });
    
  } catch (error) {
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}