import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import RecommendationButton from './RecommendationButton';

describe('RecommendationButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the name', () => {
    const onClick = vi.fn();
    render(<RecommendationButton name="Heineken" onClick={onClick} />);

    expect(screen.getByText(/heineken/i)).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<RecommendationButton name="Heineken" onClick={onClick} />);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalled();
  });

  it('is not clickable while loading', () => {
    const onClick = vi.fn();
    render(<RecommendationButton name="Heineken" onClick={onClick} loading={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is not clickable when disabled', () => {
    const onClick = vi.fn();
    render(<RecommendationButton name="Heineken" onClick={onClick} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows a spinner and "Saving..." text while loading', () => {
    const onClick = vi.fn();
    render(<RecommendationButton name="Heineken" onClick={onClick} loading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('shows the name when not loading', () => {
    const onClick = vi.fn();
    render(<RecommendationButton name="Heineken" onClick={onClick} loading={false} />);

    expect(screen.getByText(/heineken/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders the Add button icon when isAddButton is true', () => {
    const onClick = vi.fn();
    render(<RecommendationButton name="Add Custom" onClick={onClick} isAddButton={true} />);

    expect(screen.getByTestId('AddIcon')).toBeInTheDocument();
  });

  it('renders the alcohol type icon when provided', () => {
    const onClick = vi.fn();
    // Beer type (4) should render SportsBarIcon
    render(<RecommendationButton name="Heineken" onClick={onClick} alcoholTypeId={4} />);

    expect(screen.getByTestId('SportsBarIcon')).toBeInTheDocument();
  });

  it('renders a default icon when no alcohol type is provided and not an add button', () => {
    const onClick = vi.fn();
    render(<RecommendationButton name="Unknown Drink" onClick={onClick} />);

    // Should have some icon, likely the default LocalBarIcon
    const icons = screen.queryAllByTestId(/Icon$/);
    expect(icons.length).toBeGreaterThan(0);
  });

  it('disables when loading even if not explicitly disabled', () => {
    const onClick = vi.fn();
    render(<RecommendationButton name="Heineken" onClick={onClick} loading={true} disabled={false} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
