import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
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
  it('starts collapsed on the inherited palette and glassware, previewing their resolved designs', () => {
    renderSelector();

    expect(screen.getByRole('button', { name: 'Color palette' })).toHaveTextContent('Use inherited default');
    expect(screen.getByRole('button', { name: 'Glassware' })).toHaveTextContent('Use inherited default');
    expect(screen.getByRole('button', { name: 'Color palette' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('palette-preview')).toHaveStyle({ background: '#C9973B' });
    expect(screen.getByTestId('glass-highball')).toHaveAttribute('data-glassware-id', '4');
  });

  it('opens the color palette listbox on click and shows every real option tinted to its own colour', async () => {
    renderSelector();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Color palette' }));

    expect(screen.getByRole('button', { name: 'Color palette' })).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Color palette' });
    const green = within(listbox).getByRole('option', { name: 'green' });
    const brown = within(listbox).getByRole('option', { name: 'brown' });
    expect(green.firstElementChild).toHaveStyle({ background: '#2B7454' });
    expect(brown.firstElementChild).toHaveStyle({ background: '#2B1A13' });
  });

  it('shows the drawn glass art for every glassware option, not just its name', async () => {
    renderSelector();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Glassware'));

    const listbox = screen.getByRole('listbox', { name: 'Glassware' });
    const pint = within(listbox).getByRole('option', { name: 'pint' });
    expect(within(pint).getByTestId('glass-pint')).toBeInTheDocument();
  });

  it('supports full keyboard use: open, arrow to an option, Enter picks it and returns focus to the trigger', async () => {
    const { onColorPaletteIdChange } = renderSelector();
    const user = userEvent.setup();
    const trigger = screen.getByLabelText('Color palette');

    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox', { name: 'Color palette' })).toBeInTheDocument();

    // Focus opens on the resolved "Use inherited default" row; one more Down reaches "green".
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(onColorPaletteIdChange).toHaveBeenCalledWith(1);
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape without changing the selection', async () => {
    const { onGlasswareIdChange } = renderSelector();
    const user = userEvent.setup();
    const trigger = screen.getByLabelText('Glassware');

    await user.click(trigger);
    expect(screen.getByRole('listbox', { name: 'Glassware' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onGlasswareIdChange).not.toHaveBeenCalled();
  });

  it('moves focus back up with ArrowUp after moving down', async () => {
    const { onColorPaletteIdChange } = renderSelector({ inheritedColorPaletteId: undefined });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Color palette' }));
    await user.keyboard('{ArrowDown}'); // green -> brown
    await user.keyboard('{ArrowUp}'); // brown -> back to green
    await user.keyboard('{Enter}');

    expect(onColorPaletteIdChange).toHaveBeenCalledWith(1);
  });

  it('jumps to the last option with End and the first with Home', async () => {
    const { onColorPaletteIdChange } = renderSelector({ inheritedColorPaletteId: undefined });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Color palette' }));
    await user.keyboard('{End}');
    await user.keyboard('{Enter}');
    expect(onColorPaletteIdChange).toHaveBeenCalledWith(8); // rose, last of the 8 test palettes

    await user.click(screen.getByRole('button', { name: 'Color palette' }));
    await user.keyboard('{Home}');
    await user.keyboard('{Enter}');
    expect(onColorPaletteIdChange).toHaveBeenLastCalledWith(1); // green, first
  });

  it('closes on Tab without changing the selection', async () => {
    const { onGlasswareIdChange } = renderSelector();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Glassware' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Tab}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onGlasswareIdChange).not.toHaveBeenCalled();
  });

  it('ignores a key press on the trigger while its own listbox is already open', async () => {
    renderSelector();
    const trigger = screen.getByRole('button', { name: 'Color palette' });

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('lets you explicitly pick "Use inherited default" to clear an override back to null', async () => {
    const { onColorPaletteIdChange } = renderSelector();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Color palette' }));
    await user.click(screen.getByRole('option', { name: 'Use inherited default' }));

    expect(onColorPaletteIdChange).toHaveBeenCalledWith(null);
  });

  it('closes when a click lands outside the picker', async () => {
    renderSelector();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Color palette'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('requires real design choices when no inherited defaults exist', async () => {
    renderSelector({ inheritedColorPaletteId: undefined, inheritedGlasswareId: undefined });
    const user = userEvent.setup();

    const palette = screen.getByLabelText('Color palette');
    const glassware = screen.getByLabelText('Glassware');
    expect(palette).toHaveAttribute('aria-required', 'true');
    expect(glassware).toHaveAttribute('aria-required', 'true');
    expect(palette).toHaveTextContent('Choose a color palette');
    expect(glassware).toHaveTextContent('Choose glassware');

    await user.click(palette);
    expect(screen.queryByRole('option', { name: 'Use inherited default' })).not.toBeInTheDocument();
  });

  it('emits the selected positive backend IDs', async () => {
    const { onColorPaletteIdChange, onGlasswareIdChange } = renderSelector();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Color palette'));
    await user.click(screen.getByRole('option', { name: 'plum' }));
    await user.click(screen.getByLabelText('Glassware'));
    await user.click(screen.getByRole('option', { name: 'flute' }));

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
    expect(screen.getByText('Color palette choices are unavailable. Try again shortly.')).toHaveAttribute('role', 'status');
    expect(screen.getByText('Glassware choices are unavailable. Try again shortly.')).toHaveAttribute('role', 'status');
  });
});
