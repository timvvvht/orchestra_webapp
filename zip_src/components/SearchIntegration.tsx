import React from 'react';
import RaycastSearchModal from './RaycastSearchModal';
import { useSearchModal } from '../hooks/useSearchModal';

interface SearchIntegrationProps {
  // Function to handle file selection
  onFileSelect: (path: string) => void;
}

/**
 * SearchIntegration component that integrates the RaycastSearchModal
 * into the application.
 * 
 * This component is responsible for handling file selection and
 * passing it to the appropriate handler.
 */
const SearchIntegration: React.FC<SearchIntegrationProps> = ({ onFileSelect }) => {
  // Get the search modal state from the store
  const { isOpen } = useSearchModal();
  
  // Handle file selection from the search modal
  const handleFileSelect = (path: string) => {
    console.log('🔍 SearchIntegration: Selected file:', path);
    // Pass the selected file path to the parent component (App.tsx)
    // which will handle navigation to the file
    console.log('🔍 SearchIntegration: Calling onFileSelect with path:', path);
    onFileSelect(path);
  };

  return (
    <>
      {/* The RaycastSearchModal is rendered only when isOpen is true */}
      {isOpen && <RaycastSearchModal handleFileSelect={handleFileSelect} />}
    </>
  );
};

export default SearchIntegration;