import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlateGridSkeleton from './PlateGridSkeleton';
import { ROTATIONS } from './plateGridLayout';

describe('PlateGridSkeleton', () => {
  it('renders six placeholder tiles, the same two-column shape the real grid fills in', () => {
    render(<PlateGridSkeleton />);

    expect(screen.getAllByTestId('plate-skeleton')).toHaveLength(6);
  });

  it('rotates each tile by the same deterministic, position-based sequence a real Plate would get', () => {
    render(<PlateGridSkeleton />);

    const tiles = screen.getAllByTestId('plate-skeleton');
    const rotations = tiles.map((tile) => tile.style.getPropertyValue('--rot'));

    expect(rotations).toEqual(ROTATIONS.slice(0, 6).map((deg) => `${deg}deg`));
  });

  it('announces the loading state once, rather than once per hidden placeholder tile', () => {
    render(<PlateGridSkeleton />);

    expect(screen.getByRole('status', { name: /loading recommendations/i })).toBeInTheDocument();
  });
});
