import { checkCalendarAvailability } from '../../lib/calendar.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return Response.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const availability = await checkCalendarAvailability(date);
    return Response.json(availability);
    
  } catch (error) {
    console.error('Availability check error:', error);
    return Response.json({ error: 'Failed to check availability' }, { status: 500 });
  }
}