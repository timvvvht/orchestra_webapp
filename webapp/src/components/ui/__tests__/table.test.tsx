import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';

describe('Table Components', () => {
  test('renders Table with all subcomponents', () => {
    render(
      <Table>
        <TableCaption>Test Table Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Header 1</TableHead>
            <TableHead>Header 2</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell 1</TableCell>
            <TableCell>Cell 2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    // Verify Table structure
    expect(screen.getByRole('table')).toBeInTheDocument();
    
    // Verify caption
    expect(screen.getByText('Test Table Caption')).toBeInTheDocument();
    
    // Verify headers
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Header 2')).toBeInTheDocument();
    
    // Verify cells
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 2')).toBeInTheDocument();
  });

  test('Table has correct accessibility attributes', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Test Name</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    const header = screen.getByRole('columnheader', { name: 'Name' });
    expect(header).toBeInTheDocument();
    
    const cell = screen.getByRole('cell', { name: 'Test Name' });
    expect(cell).toBeInTheDocument();
  });

  test('Table components accept className prop', () => {
    render(
      <Table data-testid="test-table" className="custom-table">
        <TableBody>
          <TableRow className="custom-row">
            <TableCell className="custom-cell">Content</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = screen.getByTestId('test-table');
    expect(table).toHaveClass('custom-table');
    
    const row = screen.getByRole('row');
    expect(row).toHaveClass('custom-row');
    
    const cell = screen.getByText('Content');
    expect(cell).toHaveClass('custom-cell');
  });
});