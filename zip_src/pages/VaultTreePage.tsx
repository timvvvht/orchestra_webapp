import React, { useState, useEffect } from 'react';
import { getVaultTree } from '../api/vaultTree';
import styles from './VaultTreePage.module.css';

/**
 * VaultTreePage component that displays the output of the get_vault_tree command
 * 
 * This component:
 * - Calls the getVaultTree API on mount
 * - Shows a loading spinner while waiting for the result
 * - Displays the tree output in a preformatted block
 * - Handles and displays any errors that occur
 */
const VaultTreePage: React.FC = () => {
  const [treeOutput, setTreeOutput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVaultTree = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[VaultTreePage] Fetching vault tree...');
        const result = await getVaultTree();
        
        setTreeOutput(result);
        console.log('[VaultTreePage] Successfully loaded vault tree');
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('[VaultTreePage] Error loading vault tree:', err);
        
      } finally {
        setLoading(false);
      }
    };

    fetchVaultTree();
  }, []);

  const handleRefresh = () => {
    const fetchVaultTree = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await getVaultTree();
        setTreeOutput(result);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        
      } finally {
        setLoading(false);
      }
    };

    fetchVaultTree();
  };

  if (loading) {
    return (
      <div className={styles.vaultTreePage}>
        <div className={styles.vaultTreeHeader}>
          <h1>📂 Vault Tree</h1>
        </div>
        <div className={styles.vaultTreeContent}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p>Loading vault directory tree...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.vaultTreePage}>
        <div className={styles.vaultTreeHeader}>
          <h1>📂 Vault Tree</h1>
          <button onClick={handleRefresh} className={styles.refreshButton}>
            🔄 Retry
          </button>
        </div>
        <div className={styles.vaultTreeContent}>
          <div className={styles.errorMessage}>
            <h3>❌ Error</h3>
            <p>{error}</p>
            <button onClick={handleRefresh} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.vaultTreePage}>
      <div className={styles.vaultTreeHeader}>
        <h1>📂 Vault Tree</h1>
        <button onClick={handleRefresh} className={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>
      <div className={styles.vaultTreeContent}>
        <div className={styles.treeOutputContainer}>
          <h3>Directory Structure:</h3>
          <pre className={styles.treeOutput}>
            {treeOutput}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default VaultTreePage;