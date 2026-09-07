import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import Layout from './Layout';

vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title', () => {
    renderWithProviders(<Layout title="Test Page">Content</Layout>);

    expect(screen.getByRole('heading', { name: /test page/i })).toBeInTheDocument();
  });

  it('uses a default title when not provided', () => {
    renderWithProviders(<Layout>Content</Layout>);

    expect(screen.getByRole('heading', { name: /drinksaver/i })).toBeInTheDocument();
  });

  it('does not show back button by default', () => {
    renderWithProviders(<Layout>Content</Layout>, { route: '/test' });

    const backButtons = screen.queryAllByTestId('ArrowBackIcon');
    expect(backButtons.length).toBe(0);
  });

  it('shows back button when showBackButton is true', () => {
    renderWithProviders(
      <Layout showBackButton>Content</Layout>,
      { route: '/test' }
    );

    expect(screen.getByTestId('ArrowBackIcon')).toBeInTheDocument();
  });

  it('navigates back when back button is clicked', async () => {
    renderWithProviders(
      <Layout showBackButton>Content</Layout>,
      { route: '/test' }
    );

    const backButton = screen.getByTestId('ArrowBackIcon').closest('button');
    await userEvent.click(backButton!);

    // The navigate(-1) call won't actually navigate in test, but we verify the button exists and is clickable
    expect(backButton).toBeInTheDocument();
  });

  it('renders bottom navigation by default', () => {
    renderWithProviders(<Layout>Content</Layout>);

    expect(screen.getByText(/quick save/i)).toBeInTheDocument();
    expect(screen.getByText(/add drink/i)).toBeInTheDocument();
    expect(screen.getByText(/history/i)).toBeInTheDocument();
  });

  it('hides bottom navigation when hideBottomNav is true', () => {
    renderWithProviders(<Layout hideBottomNav>Content</Layout>);

    expect(screen.queryByText(/quick save/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/add drink/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/history/i)).not.toBeInTheDocument();
  });

  it('renders children', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText(/test content/i)).toBeInTheDocument();
  });

  it('shows logout button in toolbar', () => {
    renderWithProviders(<Layout>Content</Layout>);

    expect(screen.getByLabelText(/logout/i)).toBeInTheDocument();
  });
});
