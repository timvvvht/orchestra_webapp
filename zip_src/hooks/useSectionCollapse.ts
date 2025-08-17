/**
 * Hook for managing collapsible sections with localStorage persistence
 */

import { useState, useCallback, useEffect } from 'react';

interface SectionCollapseState {
  [sectionName: string]: boolean; // true = collapsed, false = expanded
}

const STORAGE_KEY = 'mission-control-collapsed-sections';

export const useSectionCollapse = () => {
  const [collapsedSections, setCollapsedSections] = useState<SectionCollapseState>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCollapsedSections(parsed);
      }
    } catch (error) {
      console.warn('Failed to load collapsed sections from localStorage:', error);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedSections));
    } catch (error) {
      console.warn('Failed to save collapsed sections to localStorage:', error);
    }
  }, [collapsedSections]);

  const toggleSection = useCallback((sectionName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName] // undefined becomes true (collapsed)
    }));
  }, []);

  const isCollapsed = useCallback((sectionName: string): boolean => {
    return collapsedSections[sectionName] ?? false; // default to expanded
  }, [collapsedSections]);

  const collapseSection = useCallback((sectionName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: true
    }));
  }, []);

  const expandSection = useCallback((sectionName: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: false
    }));
  }, []);

  return {
    toggleSection,
    isCollapsed,
    collapseSection,
    expandSection
  };
};