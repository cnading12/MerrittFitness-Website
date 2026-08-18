// app/lib/database.js
// ENHANCED VERSION - Better connection handling and error diagnosis

import { lazyClient } from './lazy-client.js';
import { createServerSupabaseClient, usingServiceRole } from './supabase-server.js';

// Enhanced Supabase connection with better error handling.
//
// Credential selection (service_role, falling back to anon) lives in
// supabase-server.js — see that file for why, and for the rollout order that
// must be followed before enabling Row Level Security.
const supabase = lazyClient(() => {
  console.log('🔗 Initializing Supabase connection...');
  console.log('📍 Supabase URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
  console.log('🔑 Supabase role:', usingServiceRole() ? 'service_role' : 'anon (fallback)');

  const client = createServerSupabaseClient();

  console.log('✅ Supabase client initialized');
  return client;
});

// Enhanced test connection with detailed diagnostics
export async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing database connection...');

    // Test 1: Basic connection - FIXED: Use Supabase count syntax
    const { count, error: connectionError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    if (connectionError) {
      console.error('❌ Basic connection test failed:', connectionError);

      // Provide specific error guidance
      if (connectionError.message?.includes('relation "bookings" does not exist')) {
        console.error('💡 Database table missing. Run this SQL in Supabase:');
        console.log(`
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_booking_id UUID,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT NOT NULL,
  hours_requested NUMERIC NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  website_url TEXT,
  special_requests TEXT,
  payment_method TEXT DEFAULT 'card',
  total_amount NUMERIC NOT NULL,
  subtotal NUMERIC,
  stripe_fee NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending_payment',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_intent_id TEXT,
  payment_confirmed_at TIMESTAMP WITH TIME ZONE,
  calendar_event_id TEXT,
  failure_reason TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_master_id ON bookings(master_booking_id);
        `);

        return {
          success: false,
          error: 'Database table missing',
          solution: 'Create bookings table using SQL above'
        };
      }

      if (connectionError.message?.includes('Invalid API key')) {
        return {
          success: false,
          error: 'Invalid Supabase API key',
          solution: 'Check SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in environment variables'
        };
      }

      if (connectionError.message?.includes('not found')) {
        return {
          success: false,
          error: 'Invalid Supabase URL',
          solution: 'Check SUPABASE_URL in environment variables'
        };
      }

      return {
        success: false,
        error: connectionError.message,
        solution: 'Check Supabase project status and credentials'
      };
    }

    console.log('✅ Database connection test passed');

    // Test 2: Write permission test
    const testId = `test-${Date.now()}`;

    try {
      const { data: writeTest, error: writeError } = await supabase
        .from('bookings')
        .insert({
          id: testId,
          event_name: 'Connection Test',
          event_type: 'test',
          event_date: new Date().toISOString().split('T')[0],
          event_time: '10:00 AM',
          hours_requested: 1,
          contact_name: 'Test User',
          email: 'test@example.com',
          total_amount: 95,
          status: 'test'
        })
        .select();

      if (writeError) {
        console.error('❌ Write permission test failed:', writeError);
        return {
          success: false,
          error: 'Database write permission failed',
          details: writeError.message,
          solution: 'Check Supabase RLS policies and permissions'
        };
      }

      // Clean up test record
      await supabase
        .from('bookings')
        .delete()
        .eq('id', testId);

      console.log('✅ Database write test passed');

    } catch (writeTestError) {
      console.error('❌ Write test error:', writeTestError);
      return {
        success: false,
        error: 'Database write test failed',
        details: writeTestError.message
      };
    }

    return {
      success: true,
      message: 'Database connection and permissions working',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Database test error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Enhanced booking creation with better error handling
export async function createBooking(bookingData) {
  try {
    console.log('📝 [DB] Creating booking:', bookingData.eventName);
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          id: bookingData.id,
          master_booking_id: bookingData.masterBookingId || null,
          event_name: bookingData.eventName,
          event_type: bookingData.eventType,
          event_date: bookingData.selectedDate,
          event_time: bookingData.selectedTime,
          hours_requested: parseFloat(bookingData.hoursRequested),
          contact_name: bookingData.contactName,
          email: bookingData.email,
          phone: bookingData.phone || '',
          business_name: bookingData.businessName || '',
          website_url: bookingData.websiteUrl || '',
          special_requests: bookingData.specialRequests || '',
          payment_method: bookingData.paymentMethod || 'card',
          total_amount: parseFloat(bookingData.total),
          subtotal: parseFloat(bookingData.subtotal || bookingData.total),
          stripe_fee: parseFloat(bookingData.stripeFee || 0),
          status: bookingData.status || 'pending_payment',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single(); // Get single result

    if (error) {
      console.error('❌ [DB] Database booking creation error:', error);
      
      // Provide specific error guidance
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Booking ID already exists. Please try again.');
      }
      
      if (error.code === '23503') { // Foreign key constraint
        throw new Error('Invalid reference data. Please check your input.');
      }
      
      if (error.code === '23514') { // Check constraint violation
        throw new Error('Invalid data format. Please verify all required fields.');
      }
      
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No booking data returned from database');
    }
    
    console.log('✅ [DB] Booking created successfully:', data.id);
    return data;
    
  } catch (error) {
    console.error('❌ [DB] Create booking error:', error);
    throw error;
  }
}

// Enhanced booking retrieval with better lookup
// Replace the getBooking function
export async function getBooking(bookingId) {
  try {
    console.log('🔍 [DB] Looking up booking:', bookingId);
    
    // Try direct ID lookup first
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      console.error('❌ [DB] Error fetching booking:', error);
      
      // If not found by ID, try master booking ID
      console.log('🔍 [DB] Trying master booking ID lookup...');
      
      const { data: masterData, error: masterError } = await supabase
        .from('bookings')
        .select('*')
        .eq('master_booking_id', bookingId)
        .limit(1)
        .single();

      if (masterData) {
        console.log('✅ [DB] Found booking by master ID:', masterData.id);
        return masterData;
      }
      
      console.warn('❌ [DB] Booking not found:', bookingId);
      return null;
    }

    if (data) {
      console.log('✅ [DB] Found booking by ID:', {
        id: data.id,
        event_name: data.event_name,
        status: data.status
      });
      return data;
    }

    console.warn('❌ [DB] No booking data returned');
    return null;
    
  } catch (error) {
    console.error('❌ [DB] Get booking error:', error);
    throw error;
  }
}

// Enhanced booking status update
export async function updateBookingStatus(bookingId, status, additionalData = {}) {
  try {
    console.log('📝 [DB] Updating booking status:', {
      bookingId,
      newStatus: status,
      additionalData
    });
    
    // CRITICAL FIX: Use .update() correctly with proper error handling
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status,
        ...additionalData,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single(); // Get single result instead of array

    if (error) {
      console.error('❌ [DB] Update booking error:', error);
      console.error('❌ [DB] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Check if it's a "not found" error
      if (error.code === 'PGRST116') {
        throw new Error(`Booking not found: ${bookingId}`);
      }
      
      throw error;
    }
    
    if (!data) {
      console.error('❌ [DB] No data returned from update');
      throw new Error(`Booking update returned no data: ${bookingId}`);
    }
    
    console.log('✅ [DB] Booking status updated successfully:', {
      id: data.id,
      status: data.status,
      updated_at: data.updated_at
    });
    
    return data;
    
  } catch (error) {
    console.error('❌ [DB] Update booking status error:', error);
    throw error;
  }
}

// Keep-alive ping — the thing that stops Supabase from pausing the project.
//
// Supabase pauses Free-plan projects after ~7 consecutive days with no
// database activity. Restoring a paused project takes minutes and cannot be
// triggered from the app, so a quiet stretch between bookings used to mean the
// next renter's booking simply failed. Any real query resets that clock, so a
// daily cron (app/api/cron/supabase-keepalive) calls this.
//
// Two steps, deliberately different in weight:
//   1. READ (authoritative) — a `head: true` count against `bookings`. This is
//      a real PostgREST → Postgres query, which is all Supabase needs to see,
//      and it doubles as a health check: if this fails the database is already
//      unreachable and staff get alerted.
//   2. WRITE (best-effort) — one audit row in `cron_runs`. Nice to have for
//      "did the ping actually run?" forensics, and it exercises the write path
//      too, but a failure here (e.g. the cron_runs migration was never run)
//      must NOT report the database as down. Logged, then ignored.
export async function pingDatabase({ jobName = 'supabase-keepalive', triggeredBy = 'vercel-cron' } = {}) {
  const startedAt = Date.now();

  let count = null;
  try {
    const { count: bookingCount, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    if (error) throw new Error(error.message);
    count = bookingCount ?? null;
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    console.error(`❌ [DB] Keep-alive read failed after ${latencyMs}ms:`, error.message);
    return { ok: false, latencyMs, bookingCount: null, auditRowWritten: false, error: error.message };
  }

  const latencyMs = Date.now() - startedAt;
  console.log(`✅ [DB] Keep-alive read OK in ${latencyMs}ms (${count} bookings)`);

  let auditRowWritten = false;
  try {
    const { error } = await supabase.from('cron_runs').insert({
      job_name: jobName,
      succeeded_count: 1,
      skipped_count: 0,
      failed_count: 0,
      duration_ms: latencyMs,
      details: { triggeredBy, bookingCount: count, readLatencyMs: latencyMs },
    });
    if (error) throw new Error(error.message);
    auditRowWritten = true;
  } catch (error) {
    // Non-fatal by design — see the note above.
    console.warn('⚠️ [DB] Keep-alive audit row not written:', error.message);
  }

  return { ok: true, latencyMs, bookingCount: count, auditRowWritten, error: null };
}

// Export the supabase client
export { supabase };