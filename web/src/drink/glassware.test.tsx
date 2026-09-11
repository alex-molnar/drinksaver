import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Glass } from './glassware';

describe('Glass', () => {
  it.each(['pint', 'tulip', 'wine', 'highball'] as const)('renders %s as an aria-hidden svg', (kind) => {
    const { container } = render(<Glass kind={kind} chroma="#123456" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('fills the liquid path with chroma', () => {
    const { container } = render(<Glass kind="pint" chroma="#E0A828" />);
    expect(container.querySelectorAll('path')[0]).toHaveAttribute('fill', '#E0A828');
  });

  it('draws foam only when the glass kind has a foam path and a foam colour is given', () => {
    const withFoam = render(<Glass kind="pint" chroma="#123456" foam="#EBDCC0" />);
    expect(withFoam.container.querySelectorAll('path')).toHaveLength(3);
    expect(withFoam.container.querySelectorAll('path')[1]).toHaveAttribute('fill', '#EBDCC0');
  });

  it('draws no foam path when no foam colour is given, even for a kind that has one', () => {
    const { container } = render(<Glass kind="pint" chroma="#123456" />);
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('draws no foam path for wine or highball, even when a foam colour is given', () => {
    const wine = render(<Glass kind="wine" chroma="#123456" foam="#EBDCC0" />);
    expect(wine.container.querySelectorAll('path')).toHaveLength(2);

    const highball = render(<Glass kind="highball" chroma="#123456" foam="#EBDCC0" />);
    expect(highball.container.querySelectorAll('path')).toHaveLength(2);
  });

  it('leaves the outline path explicitly unfilled', () => {
    const { container } = render(<Glass kind="highball" chroma="#123456" />);
    const paths = container.querySelectorAll('path');
    expect(paths[paths.length - 1]).toHaveAttribute('fill', 'none');
  });
});
