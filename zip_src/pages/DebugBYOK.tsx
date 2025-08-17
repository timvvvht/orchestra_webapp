import React, { useState, useEffect } from 'react';
import { getDefaultACSClient } from '@/services/acs';
import { useBYOKStore } from '@/stores/byokStore';

/**
 * Debug page for testing BYOK implementation with real auth
 * Navigate to this page when logged in to test the integration
 */
export default function DebugBYOK() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});
  
  const byokStore = useBYOKStore();

  useEffect(() => {
    // Get debug info on component mount
    const client = getDefaultACSClient();
    const token = client.getAuthToken();
    
    setDebugInfo({
      clientExists: !!client,
      hasGetAuthTokenMethod: typeof client.getAuthToken === 'function',
      hasRealToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 30)}...` : 'no-token',
      tokenStartsWithEy: token?.startsWith('ey') || false,
      isAuthenticated: client.isAuthenticated(),
      byokStoreState: {
        useStoredKeysPreference: byokStore.useStoredKeysPreference,
        storedKeyProviders: byokStore.storedKeyProviders,
        isLoadingKeyProviders: byokStore.isLoadingKeyProviders,
        keyProvidersError: byokStore.keyProvidersError
      }
    });
  }, [byokStore]);

  const testBYOKFetch = async () => {
    setTestResults({ testing: true });
    
    try {
      console.log('🧪 Starting BYOK fetch test...');
      
      // Test the fetchStoredKeyProviders method
      await byokStore.fetchStoredKeyProviders();
      
      const results = {
        success: true,
        providers: byokStore.storedKeyProviders,
        error: byokStore.keyProvidersError,
        isLoading: byokStore.isLoadingKeyProviders,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ BYOK fetch test results:', results);
      setTestResults(results);
      
    } catch (error) {
      const errorResults = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
      
      console.error('❌ BYOK fetch test failed:', errorResults);
      setTestResults(errorResults);
    }
  };

  const testRaceCondition = async () => {
    console.log('🧪 Testing race condition protection...');
    
    // Get the client and temporarily mock no token
    const client = getDefaultACSClient();
    const originalGetAuthToken = client.getAuthToken;
    
    // Mock no token scenario
    (client as any).getAuthToken = () => null;
    
    try {
      await byokStore.fetchStoredKeyProviders();
      
      console.log('✅ Race condition test - should show "Auth not ready":', {
        error: byokStore.keyProvidersError,
        isLoading: byokStore.isLoadingKeyProviders
      });
      
    } finally {
      // Restore original method
      (client as any).getAuthToken = originalGetAuthToken;
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#00ff88', marginBottom: '20px' }}>🧪 BYOK Implementation Debug Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#88ccff', marginBottom: '10px' }}>🔍 Debug Information</h2>
        <pre style={{ 
          background: '#2a2a2a', 
          color: '#ffffff',
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid #444',
          overflow: 'auto'
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#88ccff', marginBottom: '10px' }}>🧪 Test Controls</h2>
        <button 
          onClick={testBYOKFetch}
          style={{ 
            marginRight: '10px', 
            padding: '12px 20px',
            backgroundColor: '#00aa44',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Test BYOK Fetch (Real Auth)
        </button>
        <button 
          onClick={testRaceCondition}
          style={{ 
            padding: '12px 20px',
            backgroundColor: '#ff6600',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Test Race Condition Protection
        </button>
      </div>

      {Object.keys(testResults).length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#88ccff', marginBottom: '10px' }}>📊 Test Results</h2>
          <pre style={{ 
            background: '#2a2a2a', 
            color: '#ffffff',
            padding: '15px', 
            borderRadius: '8px',
            border: '1px solid #444',
            overflow: 'auto'
          }}>
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#88ccff', marginBottom: '10px' }}>📝 Current BYOK Store State</h2>
        <pre style={{ 
          background: '#2a2a2a', 
          color: '#ffffff',
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid #444',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            useStoredKeysPreference: byokStore.useStoredKeysPreference,
            storedKeyProviders: byokStore.storedKeyProviders,
            isLoadingKeyProviders: byokStore.isLoadingKeyProviders,
            keyProvidersError: byokStore.keyProvidersError
          }, null, 2)}
        </pre>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: '#003366', 
        borderRadius: '8px',
        border: '1px solid #0066cc'
      }}>
        <h3 style={{ color: '#66ccff', marginBottom: '10px' }}>💡 How to Use This Page</h3>
        <ol style={{ color: '#cccccc', lineHeight: '1.6' }}>
          <li>Make sure you're logged in with your Google Auth test user</li>
          <li>Check the debug information shows a real token</li>
          <li>Click "Test BYOK Fetch" to test the real integration</li>
          <li>Click "Test Race Condition Protection" to verify our fix works</li>
          <li>Check browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
}