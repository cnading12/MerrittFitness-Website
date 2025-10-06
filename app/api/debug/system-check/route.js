// app/api/debug/system-check/route.js
// CREATE THIS FILE - Emergency diagnostic to see what's working

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('booking_id');
  
  const results = {
    timestamp: new Date().toISOString(),
    system: 'Merritt Fitness Booking System',
    checks: {}
  };

  // 1. Check Environment Variables
  results.checks.environment = {
    stripe_secret: !!process.env.STRIPE_SECRET_KEY,
    stripe_publishable: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    stripe_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
    supabase_url: !!process.env.SUPABASE_URL,
    supabase_key: !!process.env.SUPABASE_ANON_KEY,
    google_calendar_email: !!process.env.GOOGLE_CLIENT_EMAIL,
    google_calendar_key: !!process.env.GOOGLE_PRIVATE_KEY,
    google_calendar_id: !!process.env.GOOGLE_CALENDAR_ID,
    resend_key: !!process.env.RESEND_API_KEY
  };

  // 2. Check Database Connection
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .limit(1);
    
    results.checks.database = {
      connected: !error,
      error: error?.message || null
    };
  } catch (err) {
    results.checks.database = {
      connected: false,
      error: err.message
    };
  }

  // 3. Check Specific Booking if ID provided
  if (bookingId) {
    try {
      const { getBooking } = await import('../../../lib/database.js');
      const booking = await getBooking(bookingId);
      
      results.checks.booking = {
        found: !!booking,
        id: booking?.id,
        status: booking?.status,
        event_name: booking?.event_name,
        payment_intent_id: booking?.payment_intent_id,
        calendar_event_id: booking?.calendar_event_id
      };
    } catch (err) {
      results.checks.booking = {
        found: false,
        error: err.message
      };
    }
  }

  // 4. Check Stripe Connection
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    const balance = await stripe.balance.retrieve();
    results.checks.stripe = {
      connected: true,
      mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 'LIVE'
    };
  } catch (err) {
    results.checks.stripe = {
      connected: false,
      error: err.message
    };
  }

  // 5. Check Recent Bookings
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('id, event_name, status, created_at, calendar_event_id')
      .order('created_at', { ascending: false })
      .limit(5);
    
    results.checks.recentBookings = recentBookings || [];
  } catch (err) {
    results.checks.recentBookings = {
      error: err.message
    };
  }

  // 6. File Structure Check
  results.checks.files = {
    booking_route: 'Check if exists',
    payment_route: 'Check if exists',
    webhook_route: 'Check if exists',
    calendar_lib: 'Check if exists',
    database_lib: 'Check if exists'
  };

  return Response.json(results, { status: 200 });
}