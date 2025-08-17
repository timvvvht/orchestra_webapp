import React from 'react';
import { useAuth } from '@/auth/AuthContext';

interface DebugAuthPanelProps {
  isVisible?: boolean;
}

export const DebugAuthPanel: React.FC<DebugAuthPanelProps> = ({ isVisible = true }) => {
  const { user, isAuthenticated, booted } = useAuth();

  // Show in both dev and production for debugging OAuth issues
  // if (!import.meta.env.DEV) return null;
  
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#4ade80' }}>🔍 Auth Debug</h4>
      <div><strong>Booted:</strong> {booted ? '✅' : '❌'}</div>
      <div><strong>Authenticated:</strong> {isAuthenticated ? '✅' : '❌'}</div>
      <div><strong>User ID:</strong> {user?.id || 'None'}</div>
      <div><strong>Email:</strong> {user?.email || 'None'}</div>
      <div><strong>Name:</strong> {user?.user_metadata?.full_name || 'None'}</div>
      <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.7 }}>
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};