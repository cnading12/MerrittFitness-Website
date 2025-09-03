// app/lib/database.js
// FIXED VERSION - Better error handling and lookup logic

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// FIXED: Updated createBooking to match new data structure
export async function createBooking(bookingData) {
  try {
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
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      throw new Error('No booking data returned from database');
    }
    
    console.log('✅ Booking created in database:', data[0].id);
    return data[0];
    
  } catch (error) {
    console.error('❌ Database booking creation error:', error);
    throw error;
  }
}

// FIXED: Enhanced getBooking with better lookup logic
export async function getBooking(bookingId) {
  try {
    console.log('🔍 Looking up booking ID:', bookingId);
    
    // First, try to find by individual booking ID
    let { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (data) {
      console.log('✅ Found booking by individual ID:', data.id);
      return data;
    }

    // If not found by individual ID, try master booking ID
    console.log('🔍 Trying master booking ID lookup...');
    
    const { data: masterData, error: masterError } = await supabase
      .from('bookings')
      .select('*')
      .eq('master_booking_id', bookingId)
      .limit(1);

    if (masterData && masterData.length > 0) {
      console.log('✅ Found booking by master ID:', masterData[0].id);
      return masterData[0];
    }

    // If still not found, log the error details
    console.error('❌ Booking not found in database:', {
      searchedId: bookingId,
      individualError: error,
      masterError: masterError
    });
    
    return null;
    
  } catch (error) {
    console.error('❌ Database booking retrieval error:', error);
    throw error;
  }
}

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
      console.error('❌ Database booking update error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Booking not found for status update');
    }
    
    console.log('✅ Booking status updated:', data[0].id, '->', data[0].status);
    return data[0];
  } catch (error) {
    console.error('❌ Database booking update error:', error);
    throw error;
  }
}

export async function updateBookingWithCalendarEvent(bookingId, calendarEventId) {
  try {
    console.log('📅 Adding calendar event ID to booking:', bookingId);
    
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        calendar_event_id: calendarEventId,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select();

    if (error) {
      console.error('❌ Database calendar event update error:', error);
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('❌ Database calendar event update error:', error);
    throw error;
  }
}

export async function getAllBookings(filters = {}) {
  try {
    let query = supabase.from('bookings').select('*');
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.date) {
      query = query.eq('event_date', filters.date);
    }
    
    if (filters.email) {
      query = query.eq('email', filters.email);
    }
    
    if (filters.masterBookingId) {
      query = query.eq('master_booking_id', filters.masterBookingId);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Database bookings retrieval error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Database bookings retrieval error:', error);
    throw error;
  }
}

// ADDED: Get bookings by master ID (for multiple booking groups)
export async function getBookingsByMasterId(masterBookingId) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('master_booking_id', masterBookingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Database master booking retrieval error:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Database master booking retrieval error:', error);
    throw error;
  }
}

// ADDED: Enhanced booking search for flexible lookup
export async function findBooking(searchId) {
  try {
    console.log('🔍 Comprehensive booking search for:', searchId);
    
    // Try multiple search strategies
    const searchPromises = [
      // 1. Direct ID match
      supabase.from('bookings').select('*').eq('id', searchId).maybeSingle(),
      
      // 2. Master booking ID match (get first booking in group)
      supabase.from('bookings').select('*').eq('master_booking_id', searchId).limit(1),
      
      // 3. Payment intent ID match (for webhook lookups)
      supabase.from('bookings').select('*').eq('payment_intent_id', searchId).maybeSingle()
    ];
    
    const [directResult, masterResult, paymentResult] = await Promise.allSettled(searchPromises);
    
    // Return the first successful match
    if (directResult.status === 'fulfilled' && directResult.value.data) {
      console.log('✅ Found booking by direct ID');
      return directResult.value.data;
    }
    
    if (masterResult.status === 'fulfilled' && masterResult.value.data?.length > 0) {
      console.log('✅ Found booking by master ID');
      return masterResult.value.data[0];
    }
    
    if (paymentResult.status === 'fulfilled' && paymentResult.value.data) {
      console.log('✅ Found booking by payment intent ID');
      return paymentResult.value.data;
    }
    
    console.warn('❌ No booking found for any search strategy:', searchId);
    return null;
    
  } catch (error) {
    console.error('❌ Comprehensive booking search error:', error);
    throw error;
  }
}

// Test database connection
export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('count(*)')
      .limit(1);

    if (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
    
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection test error:', error);
    return false;
  }
}

// Export the supabase client for direct use if needed
export { supabase };