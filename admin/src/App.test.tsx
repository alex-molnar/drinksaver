import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('admin routes and Workspace navigation', () => {
  it('renders the selected page and marks its navigation link current', () => {
    render(<MemoryRouter initialEntries={['/alcohol-types']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Alcohol types' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alcohol types' })).toHaveAttribute('aria-current', 'page');
  });

  it('supports direct child routes and unknown paths', () => {
    const { unmount } = render(<MemoryRouter initialEntries={['/alcohol-types/4/subtypes']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Alcohol subtypes' })).toBeInTheDocument();
    unmount();
    render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
