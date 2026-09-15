import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Glass } from './glassware';
import type { Glassware } from '../types/api';

const shape = (overrides: Partial<Glassware> = {}): Glassware => ({
  id: 42,
  name: 'server-shape',
  g: 'M1 1h10v10H1Z',
  l: 'M2 2h8v8H2Z',
  f: null,
  ...overrides,
});

describe('Glass', () => {
  it('renders the backend name, id and paths as an aria-hidden svg', () => {
    const glassware = shape();
    const { container, getByTestId } = render(<Glass glassware={glassware} chroma="#123456" />);

    expect(getByTestId('glass-server-shape')).toHaveAttribute('aria-hidden', 'true');
    expect(getByTestId('glass-server-shape')).toHaveAttribute('data-glassware-id', '42');
    expect(container.querySelectorAll('path')[0]).toHaveAttribute('d', glassware.l);
    expect(container.querySelectorAll('path')[1]).toHaveAttribute('d', glassware.g);
  });

  it('fills the liquid path with chroma', () => {
    const { container } = render(<Glass glassware={shape()} chroma="#E0A828" />);
    expect(container.querySelectorAll('path')[0]).toHaveAttribute('fill', '#E0A828');
  });

  it('draws backend-provided foam when a foam colour is given', () => {
    const withFoam = render(
      <Glass glassware={shape({ f: 'M1 1h10v2H1Z' })} chroma="#123456" foam="#EBDCC0" />,
    );
    expect(withFoam.container.querySelectorAll('path')).toHaveLength(3);
    expect(withFoam.container.querySelectorAll('path')[1]).toHaveAttribute('fill', '#EBDCC0');
  });

  it('draws no foam path in chroma mode when no foam colour is given', () => {
    const { container } = render(
      <Glass glassware={shape({ f: 'M1 1h10v2H1Z' })} chroma="#123456" />,
    );
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('draws configured foam as flat ink in ink mode', () => {
    const { container } = render(
      <Glass glassware={shape({ f: 'M1 1h10v2H1Z' })} chroma="#123456" tone="ink" />,
    );
    expect(container.querySelectorAll('path')).toHaveLength(3);
    expect(container.querySelectorAll('path')[1]).toHaveAttribute('fill', 'currentColor');
  });

  it('leaves the outline path explicitly unfilled', () => {
    const { container } = render(<Glass glassware={shape()} chroma="#123456" />);
    const paths = container.querySelectorAll('path');
    expect(paths[paths.length - 1]).toHaveAttribute('fill', 'none');
  });
});
