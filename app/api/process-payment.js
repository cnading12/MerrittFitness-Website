import { createPaymentIntent } from '../lib/stripe.js';
import { getBooking, updateBookingStatus } from '../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingId, amount, paymentMethod } = req.body;
    
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    let paymentIntent;

    if (paymentMethod === 'card') {
      // Create payment intent for card payment
      paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // amount in cents
        currency: 'usd',
        metadata: {
          bookingId: bookingId,
          eventName: booking.event_name,
          customerEmail: booking.email
        },
        receipt_email: booking.email,
        description: `Event booking: ${booking.event_name} on ${booking.event_date}`
      });

      // For demo purposes, we'll simulate successful payment
      // In production, you'd confirm the payment intent with the frontend
      
      // Update booking status
      await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          payment_intent_id: paymentIntent.id,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      // Create calendar event and send emails
      await Promise.all([
        createCalendarEvent(booking),
        sendConfirmationEmails(booking)
      ]);

      res.status(200).json({ 
        success: true, 
        clientSecret: paymentIntent.client_secret 
      });

    } else {
      res.status(400).json({ error: 'Unsupported payment method' });
    }
    
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
}
