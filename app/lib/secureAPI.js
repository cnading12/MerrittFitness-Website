import { validationSchemas, sanitize } from './security.js';
import { securityLogger, SecurityError, ValidationError } from './errorHandler.js';

export function createSecureHandler(schema, handler) {
  return async function secureHandler(request) {
    const startTime = Date.now();
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      // Parse and validate input
      const body = await request.json();
      
      // Sanitize all string inputs
      const sanitizedBody = {};
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
          sanitizedBody[key] = sanitize.input(value);
        } else {
          sanitizedBody[key] = value;
        }
      }
      
      // Validate against schema
      const validatedData = schema.parse(sanitizedBody);
      
      // Log successful validation
      securityLogger.logSecurityEvent('API_REQUEST', {
        ip,
        userAgent,
        endpoint: request.url,
        dataKeys: Object.keys(validatedData)
      });
      
      // Call the actual handler
      const result = await handler(validatedData, request);
      
      // Log successful completion
      const duration = Date.now() - startTime;
      securityLogger.logSecurityEvent('API_SUCCESS', {
        ip,
        endpoint: request.url,
        duration
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof SecurityError) {
        securityLogger.logFailedAttempt(ip, request.url, error.message);
        return Response.json({ 
          error: 'Security violation detected' 
        }, { status: 403 });
        
      } else if (error instanceof ValidationError || error.name === 'ZodError') {
        securityLogger.logFailedAttempt(ip, request.url, 'Validation failed');
        return Response.json({ 
          error: 'Invalid input data',
          details: error.issues || error.message
        }, { status: 400 });
        
      } else {
        securityLogger.logSecurityEvent('API_ERROR', {
          ip,
          endpoint: request.url,
          error: error.message,
          duration
        });
        
        return Response.json({ 
          error: 'Internal server error' 
        }, { status: 500 });
      }
    }
  };
}
