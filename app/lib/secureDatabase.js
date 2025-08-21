import { supabase } from './database.js';
import { securityLogger } from './errorHandler.js';

export class SecureDatabase {
  static async executeQuery(operation, table, data = {}, conditions = {}) {
    try {
      // Log all database operations for security auditing
      securityLogger.logSecurityEvent('DATABASE_OPERATION', {
        operation,
        table,
        hasData: Object.keys(data).length > 0,
        hasConditions: Object.keys(conditions).length > 0
      });
      
      // Validate table names (whitelist approach)
      const allowedTables = ['bookings', 'events', 'users'];
      if (!allowedTables.includes(table)) {
        throw new SecurityError(`Invalid table access: ${table}`);
      }
      
      let query = supabase.from(table);
      
      switch (operation) {
        case 'select':
          if (Object.keys(conditions).length > 0) {
            Object.entries(conditions).forEach(([key, value]) => {
              query = query.eq(key, value);
            });
          }
          return await query.select('*');
          
        case 'insert':
          return await query.insert(data);
          
        case 'update':
          if (Object.keys(conditions).length === 0) {
            throw new SecurityError('Update operations require conditions');
          }
          Object.entries(conditions).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
          return await query.update(data);
          
        case 'delete':
          if (Object.keys(conditions).length === 0) {
            throw new SecurityError('Delete operations require conditions');
          }
          Object.entries(conditions).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
          return await query.delete();
          
        default:
          throw new SecurityError(`Invalid database operation: ${operation}`);
      }
      
    } catch (error) {
      securityLogger.logSecurityEvent('DATABASE_ERROR', {
        operation,
        table,
        error: error.message
      });
      throw error;
    }
  }
}