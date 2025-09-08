// app/api/test-all-env/route.js
// Comprehensive test to see what's actually available in production

export async function GET() {
  const result = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    platform: process.env.VERCEL ? 'Vercel' : process.env.NETLIFY ? 'Netlify' : 'Unknown',
    
    // Test all Google-related environment variables
    googleEnvVars: {
      GOOGLE_CLIENT_EMAIL: {
        exists: !!process.env.GOOGLE_CLIENT_EMAIL,
        value: process.env.GOOGLE_CLIENT_EMAIL || 'NOT_SET',
        length: process.env.GOOGLE_CLIENT_EMAIL?.length || 0
      },
      GOOGLE_PRIVATE_KEY: {
        exists: !!process.env.GOOGLE_PRIVATE_KEY,
        length: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
        preview: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 30) + '...' || 'NOT_SET'
      },
      GOOGLE_CALENDAR_ID: {
        exists: !!process.env.GOOGLE_CALENDAR_ID,
        value: process.env.GOOGLE_CALENDAR_ID || 'NOT_SET',
        length: process.env.GOOGLE_CALENDAR_ID?.length || 0
      }
    },
    
    // Show all environment variable names that start with GOOGLE
    allGoogleVars: Object.keys(process.env).filter(key => key.startsWith('GOOGLE')),
    
    // Show some common platform variables
    platformVars: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NETLIFY: process.env.NETLIFY,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME
    },
    
    // Count total environment variables (to see if any are loading)
    totalEnvVars: Object.keys(process.env).length,
    
    // Show first few env var names (for debugging)
    sampleEnvVars: Object.keys(process.env).slice(0, 10)
  };
  
  return Response.json(result, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}