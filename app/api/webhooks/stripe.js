import { 
  stripe, 
  handlePaymentSuccess, 
  handleACHSetupSuccess, 
  handlePaymentFailure,
  handleSetupIntentFailure 
} from '../../lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const body = JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'setup_intent.succeeded':
        await handleACHSetupSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
        
      case 'setup_intent.setup_failed':
        await handleSetupIntentFailure(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}