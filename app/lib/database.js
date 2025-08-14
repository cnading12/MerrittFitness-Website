// app/lib/database.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function createBooking(bookingData) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          id: bookingData.id,
          event_name: bookingData.eventName,
          event_type: bookingData.eventType,
          event_date: bookingData.selectedDate,
          event_time: bookingData.selectedTime,
          attendees: parseInt(bookingData.attendees) || 1,
          duration: bookingData.duration,
          contact_name: bookingData.contactName,
          email: bookingData.email,
          phone: bookingData.phone,
          special_requests: bookingData.specialRequests,
          total_amount: bookingData.total,
          payment_method: bookingData.paymentMethod,
          status: 'pending_payment',
          billing_address: bookingData.billingAddress,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Database booking creation error:', error);
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database booking retrieval error:', error);
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

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Database booking update error:', error);
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

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Database calendar event update error:', error);
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
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database bookings retrieval error:', error);
    throw error;
  }
}

// Export the supabase client for direct use if needed
export { supabase };