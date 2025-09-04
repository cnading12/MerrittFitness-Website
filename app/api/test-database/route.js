// app/api/test-db-simple/route.js
// Simplified database test without UUID complications

import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    connectionTest: null,
    tableTest: null,
    insertTest: null,
    overall: 'TESTING'
  };

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Test 1: Basic Connection (try to select from bookings)
    console.log('🔗 Testing basic connection...');
    try {
      const { data, error, count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        results.connectionTest = {
          status: 'FAIL',
          message: error.message,
          code: error.code
        };
      } else {
        results.connectionTest = {
          status: 'PASS',
          message: `Connection successful. Found ${count || 0} bookings in database.`,
          recordCount: count || 0
        };
      }
    } catch (connError) {
      results.connectionTest = {
        status: 'FAIL',
        message: connError.message,
        error: connError
      };
    }
    
    // Test 2: Table Structure Check
    if (results.connectionTest.status === 'PASS') {
      console.log('📋 Testing table structure...');
      try {
        const { data: sampleData, error: sampleError } = await supabase
          .from('bookings')
          .select('id, event_name, status, created_at')
          .limit(1);
          
        if (sampleError) {
          results.tableTest = {
            status: 'FAIL',
            message: sampleError.message,
            code: sampleError.code
          };
        } else {
          results.tableTest = {
            status: 'PASS',
            message: 'Table structure is correct and readable',
            hasData: sampleData && sampleData.length > 0
          };
        }
      } catch (tableError) {
        results.tableTest = {
          status: 'FAIL',
          message: tableError.message,
          error: tableError
        };
      }
    }
    
    // Test 3: Insert Permission Test (let database generate UUID)
    if (results.tableTest?.status === 'PASS') {
      console.log('📝 Testing insert permissions...');
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('bookings')
          .insert({
            event_name: 'Database Test',
            event_type: 'test',
            event_date: new Date().toISOString().split('T')[0],
            event_time: '10:00 AM',
            hours_requested: 1,
            contact_name: 'System Test',
            email: 'test@merrittfitness.net',
            total_amount: 95,
            status: 'test'
          })
          .select('id, event_name, status')
          .single();
          
        if (insertError) {
          results.insertTest = {
            status: 'FAIL',
            message: insertError.message,
            code: insertError.code,
            hint: insertError.code === '42501' ? 'RLS policies may be blocking inserts' : 'Check table constraints'
          };
        } else {
          results.insertTest = {
            status: 'PASS',
            message: 'Insert permissions working correctly',
            testRecordId: insertData.id
          };
          
          // Clean up test record
          console.log('🧹 Cleaning up test record...');
          await supabase
            .from('bookings')
            .delete()
            .eq('id', insertData.id);
        }
      } catch (insertTestError) {
        results.insertTest = {
          status: 'FAIL',
          message: insertTestError.message,
          error: insertTestError
        };
      }
    }
    
    // Determine overall status
    const tests = [results.connectionTest, results.tableTest, results.insertTest].filter(Boolean);
    const passedTests = tests.filter(t => t.status === 'PASS').length;
    const totalTests = tests.length;
    
    if (passedTests === totalTests) {
      results.overall = 'ALL_PASS';
      results.message = '🎉 Database is fully functional! Your booking system is ready.';
      results.nextStep = 'Test your booking form - everything should work now!';
    } else if (passedTests >= 2) {
      results.overall = 'MOSTLY_PASS';
      results.message = `✅ ${passedTests}/${totalTests} tests passed. Core functionality working.`;
      results.nextStep = 'Minor issues detected but bookings should still work.';
    } else {
      results.overall = 'NEEDS_ATTENTION';
      results.message = `⚠️ ${passedTests}/${totalTests} tests passed. Database needs attention.`;
      results.nextStep = 'Check Supabase dashboard and RLS policies.';
    }
    
    // Add specific recommendations
    if (results.connectionTest?.status === 'PASS' && 
        results.tableTest?.status === 'PASS' && 
        results.insertTest?.status === 'FAIL') {
      results.recommendation = {
        issue: 'RLS (Row Level Security) policies are blocking inserts',
        solution: 'Run this SQL in your Supabase SQL Editor:',
        sql: `
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON bookings;
CREATE POLICY "Allow all operations" ON bookings 
  FOR ALL TO anon, authenticated 
  USING (true) WITH CHECK (true);
        `
      };
    }
    
    return Response.json(results, { 
      status: results.overall === 'ALL_PASS' ? 200 : 
              results.overall === 'MOSTLY_PASS' ? 200 : 500 
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return Response.json({
      timestamp: new Date().toISOString(),
      overall: 'ERROR',
      message: 'Database test failed completely',
      error: error.message,
      recommendation: {
        issue: 'Could not connect to database',
        solution: 'Check your SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
      }
    }, { status: 500 });
  }
}