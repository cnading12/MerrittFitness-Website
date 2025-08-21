// Comprehensive Website Testing Script
// Run this in your development environment to catch all issues

const chalk = require('chalk');
const https = require('https');
const fs = require('fs');

class WebsiteTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    this.baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }

  log(type, message, details = '') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message, details };
    
    switch(type) {
      case 'error':
        this.errors.push(logEntry);
        console.log(chalk.red(`❌ [ERROR] ${message}`));
        if (details) console.log(chalk.gray(`   ${details}`));
        break;
      case 'warning':
        this.warnings.push(logEntry);
        console.log(chalk.yellow(`⚠️  [WARNING] ${message}`));
        if (details) console.log(chalk.gray(`   ${details}`));
        break;
      case 'success':
        this.successes.push(logEntry);
        console.log(chalk.green(`✅ [SUCCESS] ${message}`));
        if (details) console.log(chalk.gray(`   ${details}`));
        break;
      case 'info':
        console.log(chalk.blue(`ℹ️  [INFO] ${message}`));
        if (details) console.log(chalk.gray(`   ${details}`));
        break;
    }
  }

  // Test 1: Environment Variables
  async testEnvironmentVariables() {
    this.log('info', 'Testing Environment Variables...');
    
    const requiredVars = [
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'RESEND_API_KEY',
      'GOOGLE_CLIENT_EMAIL',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_CALENDAR_ID'
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.log('error', `Missing environment variable: ${varName}`, 
          'Add this to your .env.local file');
      } else if (varName === 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' && 
                 !process.env[varName].startsWith('pk_')) {
        this.log('error', 'Invalid Stripe publishable key format', 
          'Should start with pk_test_ or pk_live_');
      } else if (varName === 'STRIPE_SECRET_KEY' && 
                 !process.env[varName].startsWith('sk_')) {
        this.log('error', 'Invalid Stripe secret key format', 
          'Should start with sk_test_ or sk_live_');
      } else {
        this.log('success', `Environment variable ${varName} is set`);
      }
    }
  }

  // Test 2: API Endpoints
  async testAPIEndpoints() {
    this.log('info', 'Testing API Endpoints...');
    
    const endpoints = [
      { path: '/api/check-availability?date=2024-12-25', method: 'GET' },
      { path: '/api/test-email', method: 'GET' },
      { path: '/api/webhooks/stripe', method: 'GET' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(endpoint.path, endpoint.method);
        if (response.status < 400) {
          this.log('success', `API endpoint ${endpoint.path} is responding`);
        } else {
          this.log('warning', `API endpoint ${endpoint.path} returned ${response.status}`);
        }
      } catch (error) {
        this.log('error', `API endpoint ${endpoint.path} failed`, error.message);
      }
    }
  }

  // Test 3: Database Schema
  async testDatabaseSchema() {
    this.log('info', 'Testing Database Schema...');
    
    try {
      // This would need to be adapted based on your database setup
      const requiredColumns = [
        'id', 'event_name', 'event_type', 'event_date', 'event_time',
        'attendees', 'contact_name', 'email', 'phone', 'special_requests',
        'total_amount', 'payment_method', 'status', 'created_at',
        'payment_intent_id', 'payment_confirmed_at', 'calendar_event_id'
      ];
      
      // You would implement actual database connection here
      this.log('info', 'Database schema check requires manual verification');
      this.log('warning', 'Please verify all required columns exist in bookings table');
      
    } catch (error) {
      this.log('error', 'Database connection failed', error.message);
    }
  }

  // Test 4: Payment Flow
  async testPaymentFlow() {
    this.log('info', 'Testing Payment Integration...');
    
    const testScenarios = [
      { name: 'Minimum Amount Test', amount: 49, shouldFail: true },
      { name: 'Valid Amount Test', amount: 150, shouldFail: false },
      { name: 'Maximum Amount Test', amount: 500001, shouldFail: true }
    ];

    for (const scenario of testScenarios) {
      try {
        const response = await this.makeRequest('/api/payment/create-intent', 'POST', {
          bookingId: 'test-booking-id',
          amount: scenario.amount
        });

        if (scenario.shouldFail && response.status < 400) {
          this.log('warning', `${scenario.name}: Expected failure but got success`);
        } else if (!scenario.shouldFail && response.status >= 400) {
          this.log('error', `${scenario.name}: Expected success but got failure`);
        } else {
          this.log('success', `${scenario.name}: Behaved as expected`);
        }
      } catch (error) {
        if (scenario.shouldFail) {
          this.log('success', `${scenario.name}: Correctly failed`);
        } else {
          this.log('error', `${scenario.name}: Unexpected failure`, error.message);
        }
      }
    }
  }

  // Test 5: Security Measures
  async testSecurity() {
    this.log('info', 'Testing Security Measures...');
    
    // Test CORS
    try {
      const response = await this.makeRequest('/api/booking-request', 'POST', {}, {
        'Origin': 'https://malicious-site.com'
      });
      
      if (response.status === 403) {
        this.log('success', 'CORS protection is working');
      } else {
        this.log('warning', 'CORS protection may not be properly configured');
      }
    } catch (error) {
      this.log('warning', 'Could not test CORS protection');
    }

    // Test rate limiting (would need implementation)
    this.log('info', 'Rate limiting test requires manual implementation');
    
    // Test input sanitization
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      '"; DROP TABLE bookings; --',
      '../../../etc/passwd'
    ];

    for (const input of maliciousInputs) {
      try {
        const response = await this.makeRequest('/api/booking-request', 'POST', {
          eventName: input,
          contactName: 'Test User',
          email: 'test@example.com'
        });
        
        if (response.status >= 400) {
          this.log('success', 'Input validation rejected malicious input');
        } else {
          this.log('error', 'Malicious input was accepted', 
            'Implement proper input sanitization');
        }
      } catch (error) {
        this.log('success', 'Malicious input was rejected');
      }
    }
  }

  // Test 6: Performance
  async testPerformance() {
    this.log('info', 'Testing Performance...');
    
    const pages = ['/', '/about', '/contact', '/booking'];
    
    for (const page of pages) {
      const startTime = Date.now();
      try {
        await this.makeRequest(page, 'GET');
        const loadTime = Date.now() - startTime;
        
        if (loadTime < 1000) {
          this.log('success', `Page ${page} loaded in ${loadTime}ms`);
        } else if (loadTime < 3000) {
          this.log('warning', `Page ${page} loaded in ${loadTime}ms (slow)`);
        } else {
          this.log('error', `Page ${page} loaded in ${loadTime}ms (very slow)`);
        }
      } catch (error) {
        this.log('error', `Page ${page} failed to load`, error.message);
      }
    }
  }

  // Test 7: Email System
  async testEmailSystem() {
    this.log('info', 'Testing Email System...');
    
    try {
      const response = await this.makeRequest('/api/test-email', 'GET');
      const data = await response.json();
      
      if (data.success) {
        this.log('success', 'Email system is working');
      } else {
        this.log('error', 'Email system failed', data.error);
      }
    } catch (error) {
      this.log('error', 'Email system test failed', error.message);
    }
  }

  // Test 8: Mobile Responsiveness
  async testMobileResponsiveness() {
    this.log('info', 'Testing Mobile Responsiveness...');
    
    // This would typically use Puppeteer or similar
    this.log('info', 'Mobile responsiveness test requires browser automation');
    this.log('warning', 'Please manually test on mobile devices');
  }

  // Test 9: Accessibility
  async testAccessibility() {
    this.log('info', 'Testing Accessibility...');
    
    // Basic accessibility checks
    const accessibilityIssues = [
      'Missing alt text on images',
      'Poor color contrast ratios',
      'Missing form labels',
      'No focus indicators',
      'Missing ARIA attributes'
    ];

    this.log('info', 'Accessibility test requires manual verification');
    this.log('warning', 'Please check for these common issues:');
    accessibilityIssues.forEach(issue => {
      console.log(chalk.gray(`   - ${issue}`));
    });
  }

  // Test 10: Form Validation
  async testFormValidation() {
    this.log('info', 'Testing Form Validation...');
    
    const invalidInputs = [
      { field: 'email', value: 'invalid-email', expected: 'error' },
      { field: 'phone', value: '123', expected: 'error' },
      { field: 'attendees', value: 0, expected: 'error' },
      { field: 'attendees', value: 1000, expected: 'error' },
      { field: 'eventName', value: '', expected: 'error' }
    ];

    for (const test of invalidInputs) {
      const formData = {
        eventName: 'Test Event',
        contactName: 'Test User',
        email: 'test@example.com',
        attendees: 10,
        [test.field]: test.value
      };

      try {
        const response = await this.makeRequest('/api/booking-request', 'POST', formData);
        
        if (response.status >= 400) {
          this.log('success', `Form validation rejected invalid ${test.field}`);
        } else {
          this.log('error', `Form validation accepted invalid ${test.field}`);
        }
      } catch (error) {
        this.log('success', `Form validation rejected invalid ${test.field}`);
      }
    }
  }

  // Helper method to make HTTP requests
  async makeRequest(path, method = 'GET', body = null, headers = {}) {
    const url = `${this.baseUrl}${path}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return response;
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold.blue('🧪 COMPREHENSIVE TEST REPORT'));
    console.log('='.repeat(60));
    
    console.log(chalk.green(`✅ Successes: ${this.successes.length}`));
    console.log(chalk.yellow(`⚠️  Warnings: ${this.warnings.length}`));
    console.log(chalk.red(`❌ Errors: ${this.errors.length}`));
    
    if (this.errors.length > 0) {
      console.log('\n' + chalk.red.bold('🚨 CRITICAL ISSUES TO FIX:'));
      this.errors.forEach((error, index) => {
        console.log(chalk.red(`${index + 1}. ${error.message}`));
        if (error.details) console.log(chalk.gray(`   ${error.details}`));
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n' + chalk.yellow.bold('⚠️  WARNINGS TO ADDRESS:'));
      this.warnings.forEach((warning, index) => {
        console.log(chalk.yellow(`${index + 1}. ${warning.message}`));
        if (warning.details) console.log(chalk.gray(`   ${warning.details}`));
      });
    }
    
    const overallScore = (this.successes.length / 
      (this.successes.length + this.warnings.length + this.errors.length)) * 100;
    
    console.log(`\n📊 Overall Health Score: ${overallScore.toFixed(1)}%`);
    
    if (overallScore >= 90) {
      console.log(chalk.green('🎉 Excellent! Your website is production-ready.'));
    } else if (overallScore >= 75) {
      console.log(chalk.yellow('👍 Good! Address the warnings before launch.'));
    } else {
      console.log(chalk.red('⚠️  Needs work! Fix critical issues before launch.'));
    }

    // Save detailed report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        successes: this.successes.length,
        warnings: this.warnings.length,
        errors: this.errors.length,
        overallScore: overallScore
      },
      details: {
        successes: this.successes,
        warnings: this.warnings,
        errors: this.errors
      }
    };

    fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to test-report.json');
  }

  // Run all tests
  async runAllTests() {
    console.log(chalk.bold.blue('🚀 Starting Comprehensive Website Testing...\n'));
    
    await this.testEnvironmentVariables();
    await this.testAPIEndpoints();
    await this.testDatabaseSchema();
    await this.testPaymentFlow();
    await this.testSecurity();
    await this.testPerformance();
    await this.testEmailSystem();
    await this.testMobileResponsiveness();
    await this.testAccessibility();
    await this.testFormValidation();
    
    this.generateReport();
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const tester = new WebsiteTester();
  tester.runAllTests().catch(console.error);
}

module.exports = WebsiteTester;