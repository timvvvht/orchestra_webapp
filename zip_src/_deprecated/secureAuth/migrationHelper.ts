// Migration Helper
// Assists in migrating from old authentication system to secure authentication

import { SecureTokenManager } from './tokenManager';
import { JWTTokenManager } from '../jwtTokenManager';

/**
 * Migration Helper for Orchestra Authentication System
 * Helps transition from localStorage-based JWT to secure httpOnly cookies
 */
export class AuthMigrationHelper {
  /**
   * Check if old authentication system is present
   */
  static hasOldAuthData(): boolean {
    if (typeof localStorage === 'undefined') return false;
    
    return !!(localStorage.getItem('acs_auth_token') || 
             localStorage.getItem('acs_refresh_token') || 
             localStorage.getItem('acs_user'));
  }
  
  /**
   * Get old authentication data for migration
   */
  static getOldAuthData(): {
    token: string | null;
    refreshToken: string | null;
    user: any | null;
  } {
    if (typeof localStorage === 'undefined') {
      return { token: null, refreshToken: null, user: null };
    }
    
    return {
      token: localStorage.getItem('acs_auth_token'),
      refreshToken: localStorage.getItem('acs_refresh_token'),
      user: (() => {
        try {
          const userStr = localStorage.getItem('acs_user');
          return userStr ? JSON.parse(userStr) : null;
        } catch {
          return null;
        }
      })()
    };
  }
  
  /**
   * Attempt to migrate old authentication to new system
   */
  static async migrateOldAuth(): Promise<{
    success: boolean;
    migrated: boolean;
    error?: string;
  }> {
    try {
      const oldData = this.getOldAuthData();
      
      if (!oldData.token || !oldData.user) {
        // No old data to migrate
        this.clearOldAuthData();
        return { success: true, migrated: false };
      }
      
      // Validate old token is still valid
      try {
        const tokenInfo = JWTTokenManager.parseToken(oldData.token);
        
        if (tokenInfo.isExpired) {
          console.log('[Migration] Old token is expired, clearing data');
          this.clearOldAuthData();
          return { success: true, migrated: false };
        }
        
        // Attempt to exchange old token for new secure session
        const migrationResult = await this.exchangeOldTokenForSecureSession(
          oldData.token,
          oldData.user
        );
        
        if (migrationResult.success) {
          console.log('[Migration] Successfully migrated to secure authentication');
          this.clearOldAuthData();
          return { success: true, migrated: true };
        } else {
          console.warn('[Migration] Failed to exchange old token:', migrationResult.error);
          this.clearOldAuthData();
          return { success: true, migrated: false, error: migrationResult.error };
        }
      } catch (tokenError) {
        console.warn('[Migration] Invalid old token format:', tokenError);
        this.clearOldAuthData();
        return { success: true, migrated: false };
      }
    } catch (error) {
      console.error('[Migration] Migration error:', error);
      return {
        success: false,
        migrated: false,
        error: error instanceof Error ? error.message : 'Migration failed'
      };
    }
  }
  
  /**
   * Exchange old localStorage token for new secure session
   */
  private static async exchangeOldTokenForSecureSession(
    oldToken: string,
    userData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${process.env.VITE_ACS_BASE_URL}/api/v1/auth/migrate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${oldToken}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          migration_source: 'localStorage_jwt',
          user_data: userData
        })
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Migration failed' }));
        return { success: false, error: errorData.message };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error during migration'
      };
    }
  }
  
  /**
   * Clear old authentication data from localStorage
   */
  static clearOldAuthData(): void {
    if (typeof localStorage === 'undefined') return;
    
    const keysToRemove = [
      'acs_auth_token',
      'acs_refresh_token',
      'acs_user'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('[Migration] Cleared old authentication data from localStorage');
  }
  
  /**
   * Generate migration report
   */
  static generateMigrationReport(): {
    hasOldData: boolean;
    oldDataDetails: any;
    recommendations: string[];
  } {
    const hasOldData = this.hasOldAuthData();
    const oldData = hasOldData ? this.getOldAuthData() : null;
    
    const recommendations: string[] = [];
    
    if (hasOldData) {
      recommendations.push('Old authentication data detected');
      recommendations.push('Run migration to upgrade to secure authentication');
      
      if (oldData?.token) {
        try {
          const tokenInfo = JWTTokenManager.parseToken(oldData.token);
          if (tokenInfo.isExpired) {
            recommendations.push('Old token is expired - safe to clear');
          } else {
            recommendations.push('Old token is still valid - migration recommended');
          }
        } catch {
          recommendations.push('Old token format is invalid - safe to clear');
        }
      }
    } else {
      recommendations.push('No old authentication data found');
      recommendations.push('Ready for secure authentication system');
    }
    
    return {
      hasOldData,
      oldDataDetails: oldData,
      recommendations
    };
  }
  
  /**
   * Perform complete migration process
   */
  static async performCompleteMigration(): Promise<{
    success: boolean;
    report: any;
    migrationResult?: any;
  }> {
    try {
      // Generate initial report
      const report = this.generateMigrationReport();
      
      console.log('[Migration] Starting complete migration process');
      console.log('[Migration] Report:', report);
      
      // Attempt migration if old data exists
      let migrationResult;
      if (report.hasOldData) {
        migrationResult = await this.migrateOldAuth();
        console.log('[Migration] Migration result:', migrationResult);
      }
      
      // Initialize secure authentication system
      const secureAuthInitialized = await SecureTokenManager.initialize();
      console.log('[Migration] Secure auth initialized:', secureAuthInitialized);
      
      return {
        success: true,
        report,
        migrationResult
      };
    } catch (error) {
      console.error('[Migration] Complete migration failed:', error);
      return {
        success: false,
        report: this.generateMigrationReport()
      };
    }
  }
}

// Export convenience functions
export const {
  hasOldAuthData,
  getOldAuthData,
  migrateOldAuth,
  clearOldAuthData,
  generateMigrationReport,
  performCompleteMigration
} = AuthMigrationHelper;

// Auto-migration on import (optional)
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    AuthMigrationHelper.performCompleteMigration().then(result => {
      if (result.success) {
        console.log('[Migration] Auto-migration completed successfully');
      } else {
        console.warn('[Migration] Auto-migration failed, manual migration may be required');
      }
    });
  }, 1000); // Delay to allow app initialization
}
