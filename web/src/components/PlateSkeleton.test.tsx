import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PlateSkeleton from './PlateSkeleton';

describe('PlateSkeleton', () => {
  it('placeholders both the glass icon and the name/caption text, never leaving either out', () => {
    render(<PlateSkeleton rotation={0.5} />);

    const tile = screen.getByTestId('plate-skeleton');
    expect(within(tile).getByTestId('plate-skeleton-glass')).toBeInTheDocument();
    expect(within(tile).getByTestId('plate-skeleton-name')).toBeInTheDocument();
    expect(within(tile).getByTestId('plate-skeleton-caption')).toBeInTheDocument();
  });

  it('applies the given rotation as a CSS custom property, the same way a real Plate does', () => {
    render(<PlateSkeleton rotation={-0.7} />);

    expect(screen.getByTestId('plate-skeleton').style.getPropertyValue('--rot')).toBe('-0.7deg');
  });

  it('is hidden from assistive technology, so it never speaks as extra unnamed buttons', () => {
    render(<PlateSkeleton rotation={0.5} />);

    expect(screen.getByTestId('plate-skeleton')).toHaveAttribute('aria-hidden', 'true');
  });
});
