import { getBooking } from '../../../lib/database.js';

export async function GET(request, { params }) {
  try {
    // FIXED: Await params before destructuring
    const { id } = await params;
    
    if (!id) {
      return Response.json({ error: 'Booking ID required' }, { status: 400 });
    }

    const booking = await getBooking(id);
    
    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Return booking data
    return Response.json(booking);
    
  } catch (error) {
    console.error('Error retrieving booking:', error);
    return Response.json({ 
      error: 'Failed to retrieve booking' 
    }, { status: 500 });
  }
}