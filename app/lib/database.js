// app/lib/database.js
// FIXED VERSION - Handles multiple bookings properly

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

export async function getBooking(bookingId) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      console.error('❌ Database booking retrieval error:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Database booking retrieval error:', error);
    throw error;
  }
}

export async function updateBookingStatus(bookingId, status, additionalData = {}) {
  try {
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
    
    return data[0];
  } catch (error) {
    console.error('❌ Database booking update error:', error);
    throw error;
  }
}

export async function updateBookingWithCalendarEvent(bookingId, calendarEventId) {
  try {
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

// Export the supabase client for direct use if needed
export { supabase };