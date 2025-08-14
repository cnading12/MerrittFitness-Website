// app/api/test-email/route.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    console.log('📧 Testing complete email system...');
    
    const result = await resend.emails.send({
      from: 'Merritt House <bookings@merrittfitness.net>',
      to: ['colenading@gmail.com'],
      replyTo: 'merrittfitnessmanager@gmail.com', // This is key!
      subject: '✅ Professional Email System Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎉 Email System Active!</h1>
              <p style="color: #6b7280; margin: 10px 0 0 0;">Historic Merritt Space</p>
            </div>

            <!-- Status -->
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 20px;">✅ System Status</h2>
              <ul style="color: #047857; margin: 0; padding-left: 20px;">
                <li><strong>Domain:</strong> merrittfitness.net ✓</li>
                <li><strong>DNS Records:</strong> All verified ✓</li>
                <li><strong>Sending Address:</strong> bookings@merrittfitness.net ✓</li>
                <li><strong>Reply Address:</strong> merrittfitnessmanager@gmail.com ✓</li>
                <li><strong>Templates:</strong> Professional & responsive ✓</li>
              </ul>
            </div>

            <!-- How It Works -->
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">🔄 How It Works</h3>
              <ol style="color: #451a03; margin: 0; padding-left: 20px;">
                <li>Customers see professional <strong>bookings@merrittfitness.net</strong></li>
                <li>When they reply, it goes to your <strong>Gmail</strong></li>
                <li>You manage everything from one free inbox</li>
                <li>Perfect professional appearance! 🚀</li>
              </ol>
            </div>

            <!-- Test the Reply -->
            <div style="border-left: 4px solid #3b82f6; padding-left: 20px; margin: 30px 0; background: #eff6ff; padding: 20px; border-radius: 0 8px 8px 0;">
              <h3 style="color: #1e40af; margin: 0 0 10px 0;">🧪 Test the Reply Function</h3>
              <p style="color: #1e3a8a; margin: 0;">
                <strong>Click "Reply" to this email!</strong><br>
                Your reply should go directly to merrittfitnessmanager@gmail.com
              </p>
            </div>

            <!-- Next Steps -->
            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin: 0 0 15px 0;">🎯 Ready for:</h3>
              <ul style="color: #0c4a6e; margin: 0; padding-left: 20px;">
                <li>Booking confirmations</li>
                <li>Manager notifications</li>
                <li>Payment receipts</li>
                <li>Customer communications</li>
              </ul>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0;">Questions? Just reply to this email!</p>
              <p style="color: #374151; margin: 5px 0;">📞 (303) 359-8337</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                Test sent at ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      `
    });

    console.log('📧 Email result:', result);

    return Response.json({ 
      success: true, 
      result: result,
      message: 'Professional email test sent successfully!',
      details: {
        from: 'bookings@merrittfitness.net',
        replyTo: 'merrittfitnessmanager@gmail.com',
        to: 'colenading@gmail.com'
      }
    });
    
  } catch (error) {
    console.error('📧 Email error:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      details: error
    }, { status: 500 });
  }
}