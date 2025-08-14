import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    console.log('📧 Testing domain email...');
    
    const result = await resend.emails.send({
      from: 'Merritt House <bookings@merritthouse.com>',
      to: ['colenading@gmail.com'],
      subject: 'Test Email from YOUR Domain!',
      html: '<h1>🎉 Domain verified!</h1><p>Emails now coming from merritthouse.com!</p>'
    });

    console.log('📧 Email result:', result);

    return Response.json({ 
      success: true, 
      result: result,
      message: 'Domain email sent successfully!' 
    });
  } catch (error) {
    console.error('📧 Email error:', error);
    return Response.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}