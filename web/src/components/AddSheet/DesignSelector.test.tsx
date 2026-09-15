import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DesignSelector from './DesignSelector';
import { TestDesignProvider } from '../../test/TestDesignProvider';
import { DesignDataProvider } from '../../drink/DesignProvider';

const renderSelector = (props: Partial<React.ComponentProps<typeof DesignSelector>> = {}) => {
  const onColorPaletteIdChange = vi.fn();
  const onGlasswareIdChange = vi.fn();

  render(
    <TestDesignProvider>
      <DesignSelector
        colorPaletteId={null}
        inheritedColorPaletteId={7}
        onColorPaletteIdChange={onColorPaletteIdChange}
        glasswareId={null}
        inheritedGlasswareId={4}
        onGlasswareIdChange={onGlasswareIdChange}
        {...props}
      />
    </TestDesignProvider>,
  );

  return { onColorPaletteIdChange, onGlasswareIdChange };
};

describe('DesignSelector', () => {
  it('starts with the inherited palette and glassware options selected and previews their resolved designs', () => {
    renderSelector();

    expect(screen.getByLabelText('Color palette')).toHaveValue('');
    expect(screen.getByLabelText('Glassware')).toHaveValue('');
    expect(screen.getByTestId('palette-preview')).toHaveStyle({ background: '#C9973B' });
    expect(screen.getByTestId('glass-highball')).toHaveAttribute('data-glassware-id', '4');
  });

  it('emits the selected positive backend IDs', async () => {
    const { onColorPaletteIdChange, onGlasswareIdChange } = renderSelector();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText('Color palette'), '6');
    await user.selectOptions(screen.getByLabelText('Glassware'), '8');

    expect(onColorPaletteIdChange).toHaveBeenCalledWith(6);
    expect(onGlasswareIdChange).toHaveBeenCalledWith(8);
  });

  it('omits glassware for palette-only resources', () => {
    renderSelector({ glasswareId: undefined, inheritedGlasswareId: undefined, onGlasswareIdChange: undefined });

    expect(screen.getByLabelText('Color palette')).toBeInTheDocument();
    expect(screen.queryByLabelText('Glassware')).not.toBeInTheDocument();
  });

  it('disables design controls without successful API entries instead of offering fallback ID zero', () => {
    render(
      <DesignDataProvider palettes={[]} glassware={[]}>
        <DesignSelector
          colorPaletteId={null}
          onColorPaletteIdChange={vi.fn()}
          glasswareId={null}
          onGlasswareIdChange={vi.fn()}
        />
      </DesignDataProvider>,
    );

    const palette = screen.getByLabelText('Color palette');
    const glassware = screen.getByLabelText('Glassware');
    expect(palette).toBeDisabled();
    expect(glassware).toBeDisabled();
    expect(screen.queryByRole('option', { name: /cream|highball/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '0' })).not.toBeInTheDocument();
  });
});
