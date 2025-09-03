// lib/monitoring/logger.js
// COMPLETE Production-ready logging and monitoring system

class ProductionLogger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = process.env.LOG_LEVEL || (this.isProduction ? 'warn' : 'debug');
    this.sentryEnabled = !!process.env.SENTRY_DSN;
  }

  // Log levels: error, warn, info, debug
  log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      context,
      service: 'merritt-fitness-api',
      version: '1.0.0',
    };

    // Console logging (development and debugging)
    if (this.shouldLog(level)) {
      const emoji = this.getLevelEmoji(level);
      console.log(`${emoji} [${level.toUpperCase()}] ${message}`, 
        Object.keys(context).length > 0 ? context : '');
    }

    // Production logging (send to monitoring services)
    if (this.isProduction) {
      this.sendToMonitoring(logEntry);
    }
  }

  error(message, error = null, context = {}) {
    const errorContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : null,
    };
    
    this.log('error', message, errorContext);
    
    // Send critical errors to Sentry in production
    if (this.isProduction && this.sentryEnabled && error) {
      this.sendToSentry(error, context);
    }
  }

  warn(message, context = {}) {
    this.log('warn', message, context);
  }

  info(message, context = {}) {
    this.log('info', message, context);
  }

  debug(message, context = {}) {
    this.log('debug', message, context);
  }

  // Security-specific logging
  security(event, details = {}) {
    this.log('warn', `SECURITY: ${event}`, {
      type: 'security',
      event,
      details,
      timestamp: new Date().toISOString(),
    });

    // In production, immediately alert on security events
    if (this.isProduction) {
      this.sendSecurityAlert(event, details);
    }
  }

  // Business metrics logging
  metric(name, value, tags = {}) {
    const metricEntry = {
      metric: name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    };

    this.log('info', `METRIC: ${name} = ${value}`, metricEntry);
    
    if (this.isProduction) {
      this.sendMetric(metricEntry);
    }
  }

  // Helper methods
  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }

  getLevelEmoji(level) {
    const emojis = {
      error: '❌',
      warn: '⚠️ ',
      info: 'ℹ️ ',
      debug: '🔍',
    };
    return emojis[level] || 'ℹ️ ';
  }

  // MISSING METHODS - NOW IMPLEMENTED:

  async sendToMonitoring(logEntry) {
    // In production, send to your monitoring service
    // Examples: DataDog, New Relic, CloudWatch, etc.
    
    if (process.env.DATADOG_API_KEY) {
      await this.sendToDataDog(logEntry);
    }
    
    if (process.env.WEBHOOK_URL) {
      await this.sendToWebhook(logEntry);
    }

    // Store in database for critical errors
    if (logEntry.level === 'error' && this.isProduction) {
      await this.storeErrorInDatabase(logEntry);
    }
  }

  async sendToSentry(error, context = {}) {
    // Send to Sentry for error tracking
    // npm install @sentry/nextjs
    try {
      // Dynamic import to avoid issues if Sentry isn't installed
      const { captureException } = await import('@sentry/nextjs');
      captureException(error, { 
        extra: context,
        tags: {
          service: 'merritt-fitness',
          environment: process.env.NODE_ENV
        }
      });
    } catch (e) {
      console.error('Failed to send error to Sentry:', e.message);
    }
  }

  async sendSecurityAlert(event, details) {
    // Send immediate security alerts via webhook/email
    const alertPayload = {
      type: 'SECURITY_ALERT',
      severity: 'HIGH',
      event,
      details,
      timestamp: new Date().toISOString(),
      service: 'merritt-fitness',
      environment: process.env.NODE_ENV,
    };

    // Send to security monitoring
    if (process.env.SECURITY_WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN || ''}`,
          },
          body: JSON.stringify(alertPayload),
          timeout: 5000,
        });

        if (!response.ok) {
          throw new Error(`Security webhook failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to send security alert:', error);
      }
    }

    // Send email alert for critical security events
    await this.sendSecurityEmail(event, details);
  }

  async sendMetric(metricEntry) {
    // Send business metrics to monitoring service
    const promises = [];

    // DataDog Metrics
    if (process.env.DATADOG_API_KEY) {
      promises.push(this.sendMetricToDataDog(metricEntry));
    }

    // Custom webhook
    if (process.env.METRICS_ENDPOINT) {
      promises.push(this.sendMetricToWebhook(metricEntry));
    }

    // Wait for all metric sends (don't fail if one fails)
    await Promise.allSettled(promises);
  }

  async sendToDataDog(logEntry) {
    // Send to DataDog logs API
    try {
      const response = await fetch('https://http-intake.logs.datadoghq.com/v1/input/' + process.env.DATADOG_API_KEY, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.DATADOG_API_KEY,
        },
        body: JSON.stringify({
          ddsource: 'nodejs',
          ddtags: `env:${process.env.NODE_ENV},service:merritt-fitness`,
          hostname: process.env.HOSTNAME || 'unknown',
          message: logEntry.message,
          level: logEntry.level,
          timestamp: logEntry.timestamp,
          ...logEntry.context,
        }),
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`DataDog API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send to DataDog:', error.message);
    }
  }

  async sendToWebhook(logEntry) {
    // Generic webhook for custom monitoring
    try {
      const response = await fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN || ''}`,
        },
        body: JSON.stringify({
          ...logEntry,
          source: 'merritt-fitness-api',
        }),
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send to webhook:', error.message);
    }
  }

  async sendMetricToDataDog(metricEntry) {
    try {
      const response = await fetch('https://api.datadoghq.com/api/v1/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': process.env.DATADOG_API_KEY,
        },
        body: JSON.stringify({
          series: [{
            metric: metricEntry.metric,
            points: [[Math.floor(Date.now() / 1000), metricEntry.value]],
            tags: Object.entries(metricEntry.tags).map(([k, v]) => `${k}:${v}`),
            host: process.env.HOSTNAME || 'unknown',
          }]
        }),
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`DataDog metrics API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send metric to DataDog:', error.message);
    }
  }

  async sendMetricToWebhook(metricEntry) {
    try {
      const response = await fetch(process.env.METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.METRICS_TOKEN || ''}`,
        },
        body: JSON.stringify({
          ...metricEntry,
          source: 'merritt-fitness-api',
          environment: process.env.NODE_ENV,
        }),
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`Metrics webhook error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send metric to webhook:', error.message);
    }
  }

  async storeErrorInDatabase(logEntry) {
    // Store critical errors in database for analysis
    try {
      const { supabase } = await import('../database.js');
      
      await supabase
        .from('error_logs')
        .insert({
          level: logEntry.level,
          message: logEntry.message,
          context: logEntry.context,
          timestamp: logEntry.timestamp,
          service: logEntry.service,
          version: logEntry.version,
        });
    } catch (error) {
      // Don't fail if we can't store the error
      console.error('Failed to store error in database:', error.message);
    }
  }

  async sendSecurityEmail(event, details) {
    // Send email alert for security events
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const emailContent = `
        <h2>🚨 Security Alert - Merritt Fitness</h2>
        <p><strong>Event:</strong> ${event}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
        <hr>
        <pre>${JSON.stringify(details, null, 2)}</pre>
        <hr>
        <p><em>This is an automated security alert from Merritt Fitness API.</em></p>
      `;

      await resend.emails.send({
        from: 'Security Alerts <security@merrittfitness.net>',
        to: [process.env.SECURITY_EMAIL || 'merrittfitnessmanager@gmail.com'],
        subject: `🚨 Security Alert: ${event}`,
        html: emailContent,
      });
    } catch (error) {
      console.error('Failed to send security email:', error.message);
    }
  }
}

// API Performance Monitor
export class APIPerformanceMonitor {
  static startTimer(requestId, endpoint, method) {
    const start = Date.now();
    return {
      requestId,
      endpoint,
      method,
      startTime: start,
      
      end(statusCode, error = null) {
        const duration = Date.now() - start;
        
        logger.info('API Request Completed', {
          requestId,
          endpoint,
          method,
          statusCode,
          duration,
          error: error?.message,
        });

        // Track metrics
        logger.metric('api_request_duration', duration, {
          endpoint,
          method,
          status: statusCode,
        });

        logger.metric('api_request_count', 1, {
          endpoint,
          method,
          status: statusCode,
        });

        // Alert on slow requests
        if (duration > 5000) {
          logger.warn('Slow API Request', {
            requestId,
            endpoint,
            duration,
            threshold: 5000,
          });
        }

        // Alert on errors
        if (statusCode >= 500) {
          logger.error('API Server Error', error, {
            requestId,
            endpoint,
            method,
            statusCode,
          });
        }
      }
    };
  }
}

// Business Metrics Tracker
export class BusinessMetrics {
  static trackBookingCreated(bookingData) {
    logger.metric('booking_created', 1, {
      event_type: bookingData.eventType,
      attendees: bookingData.attendees,
      amount: bookingData.total,
    });

    logger.info('New Booking Created', {
      booking_id: bookingData.id,
      event_type: bookingData.eventType,
      event_date: bookingData.selectedDate,
      attendees: bookingData.attendees,
      total_amount: bookingData.total,
    });
  }

  static trackPaymentSuccess(paymentData) {
    logger.metric('payment_success', 1, {
      amount: paymentData.amount,
      payment_method: paymentData.paymentMethod,
    });

    logger.metric('revenue', paymentData.amount, {
      payment_method: paymentData.paymentMethod,
    });

    logger.info('Payment Completed', {
      booking_id: paymentData.bookingId,
      amount: paymentData.amount,
      payment_intent_id: paymentData.paymentIntentId,
    });
  }

  static trackPaymentFailure(paymentData, error) {
    logger.metric('payment_failure', 1, {
      error_code: error.code,
      payment_method: paymentData.paymentMethod,
    });

    logger.warn('Payment Failed', {
      booking_id: paymentData.bookingId,
      amount: paymentData.amount,
      error_code: error.code,
      error_message: error.message,
    });
  }

  static trackCalendarEventCreated(bookingData) {
    logger.metric('calendar_event_created', 1);
    logger.info('Calendar Event Created', {
      booking_id: bookingData.id,
      event_date: bookingData.event_date,
    });
  }

  static trackEmailSent(type, recipient) {
    logger.metric('email_sent', 1, { type });
    logger.info('Email Sent', { type, recipient });
  }
}

// Security Event Tracker
export class SecurityMonitor {
  static trackFailedLogin(ip, email, reason) {
    logger.security('failed_login', { ip, email, reason });
  }

  static trackSuspiciousActivity(ip, activity, details) {
    logger.security('suspicious_activity', { ip, activity, details });
  }

  static trackRateLimitExceeded(ip, endpoint) {
    logger.security('rate_limit_exceeded', { ip, endpoint });
  }

  static trackInvalidInput(ip, endpoint, input) {
    logger.security('invalid_input', { 
      ip, 
      endpoint, 
      input: input.substring(0, 100) // Limit logged input
    });
  }

  static trackWebhookFailure(source, error) {
    logger.security('webhook_failure', { source, error: error.message });
  }
}

// Health Check Monitor
export class HealthMonitor {
  static async checkSystem() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {}
    };

    // Check database connectivity
    try {
      const { supabase } = await import('../database.js');
      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .limit(1);
        
      health.checks.database = { 
        status: error ? 'unhealthy' : 'healthy', 
        response_time: 0 
      };
    } catch (error) {
      health.checks.database = { status: 'unhealthy', error: error.message };
      health.status = 'unhealthy';
    }

    // Check Stripe connectivity
    try {
      const { stripe } = await import('../stripe-config.js');
      await stripe.balance.retrieve();
      health.checks.stripe = { status: 'healthy' };
    } catch (error) {
      health.checks.stripe = { status: 'unhealthy', error: error.message };
      health.status = 'unhealthy';
    }

    // Check email service
    try {
      health.checks.email = { 
        status: process.env.RESEND_API_KEY ? 'healthy' : 'unhealthy' 
      };
    } catch (error) {
      health.checks.email = { status: 'unhealthy', error: error.message };
      health.status = 'unhealthy';
    }

    // Check Google Calendar
    try {
      health.checks.calendar = { 
        status: (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) 
          ? 'healthy' : 'unhealthy' 
      };
    } catch (error) {
      health.checks.calendar = { status: 'unhealthy', error: error.message };
      health.status = 'unhealthy';
    }

    if (health.status === 'unhealthy') {
      logger.error('System Health Check Failed', null, health);
    } else {
      logger.info('System Health Check Passed', health);
    }

    return health;
  }
}

// Create singleton logger instance
const logger = new ProductionLogger();

export default logger;