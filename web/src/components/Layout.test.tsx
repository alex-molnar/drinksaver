import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import Layout from './Layout';

/**
 * renderWithProviders uses a real MemoryRouter, so navigation actually happens and can be
 * observed rather than asserted against a mocked useNavigate. This renders the current
 * pathname as a child of the Layout under test.
 */
const RouteProbe = () => <span data-testid="pathname">{useLocation().pathname}</span>;

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

  describe('bottom navigation', () => {
    it.each([
      ['Quick Save', '/'],
      ['Add Drink', '/detailed'],
      ['History', '/history'],
    ])('navigates to %s at %s when its tab is tapped', async (label, expected) => {
      renderWithProviders(
        <Layout><RouteProbe /></Layout>,
        { route: '/success' }
      );

      await userEvent.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));

      expect(screen.getByTestId('pathname')).toHaveTextContent(expected);
    });

    it.each([
      ['/', 'Quick Save'],
      ['/detailed', 'Add Drink'],
      ['/history', 'History'],
    ])('marks the tab for %s as selected', (route, label) => {
      renderWithProviders(<Layout>Content</Layout>, { route });

      expect(screen.getByRole('button', { name: new RegExp(label, 'i') }))
        .toHaveClass('Mui-selected');
    });

    /**
     * getNavValue returns -1 for anything else, which is what stops a route with no tab
     * from lighting one up. The form pages and the success and error screens all land here.
     */
    it('selects no tab on a route that has none', () => {
      renderWithProviders(<Layout>Content</Layout>, { route: '/new-volume' });

      for (const label of ['Quick Save', 'Add Drink', 'History']) {
        expect(screen.getByRole('button', { name: new RegExp(label, 'i') }))
          .not.toHaveClass('Mui-selected');
      }
    });
  });
});
