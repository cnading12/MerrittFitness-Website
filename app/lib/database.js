// app/lib/database.js
// ENHANCED VERSION - Better connection handling and error diagnosis

import { createClient } from '@supabase/supabase-js';

// Enhanced Supabase connection with better error handling
let supabase;

try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  console.log('🔗 Initializing Supabase connection...');
  console.log('📍 Supabase URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
  
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'merritt-fitness-booking-system',
        },
      },
    }
  );
  
  console.log('✅ Supabase client initialized');
  
} catch (error) {
  console.error('❌ Supabase initialization failed:', error);
  throw error;
}

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
          solution: 'Check SUPABASE_ANON_KEY in environment variables'
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
    console.log('📝 Creating booking:', bookingData.eventName);
    
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
      .select();

    if (error) {
      console.error('❌ Database booking creation error:', error);
      
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
    
    if (!data || data.length === 0) {
      throw new Error('No booking data returned from database');
    }
    
    console.log('✅ Booking created successfully:', data[0].id);
    return data[0];
    
  } catch (error) {
    console.error('❌ Create booking error:', error);
    throw error;
  }
}

// Enhanced booking retrieval with better lookup
export async function getBooking(bookingId) {
  try {
    console.log('🔍 Looking up booking:', bookingId);
    
    // Try direct ID lookup first
    let { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (data) {
      console.log('✅ Found booking by ID:', data.event_name);
      return data;
    }

    // If not found by ID, try master booking ID
    console.log('🔍 Trying master booking ID lookup...');
    
    const { data: masterData, error: masterError } = await supabase
      .from('bookings')
      .select('*')
      .eq('master_booking_id', bookingId)
      .limit(1);

    if (masterData && masterData.length > 0) {
      console.log('✅ Found booking by master ID:', masterData[0].event_name);
      return masterData[0];
    }

    console.warn('❌ Booking not found:', bookingId);
    return null;
    
  } catch (error) {
    console.error('❌ Get booking error:', error);
    throw error;
  }
}

// Enhanced booking status update
export async function updateBookingStatus(bookingId, status, additionalData = {}) {
  try {
    console.log('📝 Updating booking status:', bookingId, 'to', status);
    
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status,
        ...additionalData,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select();

    if (error) {
      console.error('❌ Update booking error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Booking not found for status update');
    }
    
    console.log('✅ Booking status updated:', data[0].status);
    return data[0];
    
  } catch (error) {
    console.error('❌ Update booking status error:', error);
    throw error;
  }
}

// Export the supabase client
export { supabase };