import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DateSeparator from '../DateSeparator';
import GlassPanel from '../GlassPanel';
import FloatingFab from '../FloatingFab';

describe('UI Helpers', () => {
  describe('DateSeparator', () => {
    it('renders today correctly', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      render(<DateSeparator date={today} />);
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('renders yesterday correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      render(<DateSeparator date={yesterday} />);
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('renders formatted date for older dates', () => {
      const oldDate = new Date('2024-01-15');
      oldDate.setHours(0, 0, 0, 0);
      
      render(<DateSeparator date={oldDate} />);
      // Should show "15 Jan" or similar format
      expect(screen.getByText(/Jan/)).toBeInTheDocument();
    });
  });

  describe('GlassPanel', () => {
    it('renders children correctly', () => {
      render(
        <GlassPanel>
          <div>Test content</div>
        </GlassPanel>
      );
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <GlassPanel className="custom-class">
          <div>Test</div>
        </GlassPanel>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('FloatingFab', () => {
    it('renders with correct text', () => {
      const mockOnClick = vi.fn();
      render(<FloatingFab onClick={mockOnClick} />);
      expect(screen.getByText('Jump to bottom')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      const mockOnClick = vi.fn();
      render(<FloatingFab onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      button.click();
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('has chevron down icon', () => {
      const mockOnClick = vi.fn();
      render(<FloatingFab onClick={mockOnClick} />);
      
      // Check for the presence of the chevron down icon
      const button = screen.getByRole('button');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });
});