export class SecurityError extends Error {
  constructor(message, code = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.timestamp = new Date().toISOString();
  }
}

export const securityLogger = {
  logSecurityEvent: (event, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      level: 'security'
    };
    
    console.log('[SECURITY]', JSON.stringify(logEntry));
    
    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry, DataDog, etc.
    }
  },
  
  logFailedAttempt: (ip, endpoint, reason) => {
    securityLogger.logSecurityEvent('FAILED_ATTEMPT', {
      ip,
      endpoint,
      reason,
      userAgent: 'Unknown' // Pass from request if available
    });
  },
  
  logSuspiciousActivity: (ip, activity) => {
    securityLogger.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
      ip,
      activity
    });
  }
};