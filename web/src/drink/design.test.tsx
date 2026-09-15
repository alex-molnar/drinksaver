import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { DesignProvider } from './DesignProvider';
import { createDesignCatalogue } from './designCatalogue';
import { useDesign } from './useDesign';
import { getColorPalettes, getGlassware } from '../api/endpoints';
import { TEST_GLASSWARE, TEST_PALETTES } from '../test/designFixtures';

vi.mock('../api/endpoints');

const mockGetColorPalettes = vi.mocked(getColorPalettes);
const mockGetGlassware = vi.mocked(getGlassware);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetColorPalettes.mockResolvedValue([...TEST_PALETTES]);
  mockGetGlassware.mockResolvedValue([...TEST_GLASSWARE]);
});

describe('createDesignCatalogue', () => {
  it('resolves palette and SVG definitions by backend ID', () => {
    const design = createDesignCatalogue(TEST_PALETTES, TEST_GLASSWARE);

    expect(design.paletteForId(7).name).toBe('amber');
    expect(design.glasswareForId(11).name).toBe('beerbottle');
    expect(design.palettes).toEqual(TEST_PALETTES);
    expect(design.glassware).toEqual(TEST_GLASSWARE);
  });

  it('uses fetched cream and highball definitions as independent unknown-ID fallbacks', () => {
    const design = createDesignCatalogue(TEST_PALETTES, TEST_GLASSWARE);

    expect(design.paletteForId(999)).toBe(design.paletteForName('cream'));
    expect(design.glasswareForId(999)).toBe(design.glasswareForName('highball'));
  });
});

const Probe = () => {
  const design = useDesign();
  return (
    <output>
      {design.paletteForId(1).field}|{design.glasswareForId(1).g}
    </output>
  );
};

describe('DesignProvider', () => {
  it('starts both endpoint requests and updates consumers with their results', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <DesignProvider>{children}</DesignProvider>
      </QueryClientProvider>
    );

    render(<Probe />, { wrapper: Wrapper });

    expect(mockGetColorPalettes).toHaveBeenCalledTimes(1);
    expect(mockGetGlassware).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(`${TEST_PALETTES[0].field}|${TEST_GLASSWARE[0].g}`)).toBeInTheDocument();
  });
});
