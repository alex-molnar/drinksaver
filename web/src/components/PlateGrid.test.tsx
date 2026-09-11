import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlateGrid, { type PlateGridItem } from './PlateGrid';

const item = (overrides: Partial<PlateGridItem> = {}): PlateGridItem => ({
  key: 'k1',
  name: 'Heineken pint',
  alcoholTypeId: 4,
  onSave: vi.fn(),
  ...overrides,
});

describe('PlateGrid', () => {
  it('renders one plate per item', () => {
    render(
      <PlateGrid
        items={[item({ key: 'k1', name: 'Heineken pint' }), item({ key: 'k2', name: 'Guinness pint' })]}
        savingKey={null}
        doneKey={null}
        saveInFlight={false}
        onAddCustom={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guinness pint' })).toBeInTheDocument();
  });

  it('always renders the trailing "Something else" plate, even with no items', () => {
    render(<PlateGrid items={[]} savingKey={null} doneKey={null} saveInFlight={false} onAddCustom={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Something else' })).toBeInTheDocument();
  });

  it('calls the item onSave handler when its plate is tapped', async () => {
    const onSave = vi.fn();
    render(
      <PlateGrid
        items={[item({ key: 'k1', name: 'Heineken pint', onSave })]}
        savingKey={null}
        doneKey={null}
        saveInFlight={false}
        onAddCustom={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Heineken pint' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onAddCustom when "Something else" is tapped', async () => {
    const onAddCustom = vi.fn();
    render(<PlateGrid items={[]} savingKey={null} doneKey={null} saveInFlight={false} onAddCustom={onAddCustom} />);

    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));

    expect(onAddCustom).toHaveBeenCalledTimes(1);
  });

  /**
   * The whole point of keying on the composite key rather than `rec.id`: two recommendations
   * whose id is null (the common case - see `QuickSavePage.tsx`) must still render as, and be
   * tracked as, two distinct plates.
   */
  describe('two items with different composite keys but the same underlying id', () => {
    const twoNullIdItems = [
      item({ key: 'null-4-10-50', name: 'Heineken pint', alcoholTypeId: 4 }),
      item({ key: 'null-4-10-51', name: 'Guinness pint', alcoholTypeId: 4 }),
    ];

    it('render as two distinct, independently named plates', () => {
      render(
        <PlateGrid items={twoNullIdItems} savingKey={null} doneKey={null} saveInFlight={false} onAddCustom={vi.fn()} />
      );

      expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Guinness pint' })).toBeInTheDocument();
    });

    it('starting a save on the second shows the saving state on the second, not the first', () => {
      render(
        <PlateGrid
          items={twoNullIdItems}
          savingKey="null-4-10-51"
          doneKey={null}
          saveInFlight
          onAddCustom={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Guinness pint' })).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('button', { name: 'Heineken pint' })).not.toHaveAttribute('aria-busy');
    });

    it('stamps only the second as done once its save resolves, leaving the first untouched', () => {
      render(
        <PlateGrid
          items={twoNullIdItems}
          savingKey={null}
          doneKey="null-4-10-51"
          saveInFlight={false}
          onAddCustom={vi.fn()}
        />
      );

      expect(screen.getByRole('button', { name: 'Guinness pint' })).toHaveAttribute('data-done', '');
      expect(screen.getByRole('button', { name: 'Heineken pint' })).not.toHaveAttribute('data-done');
    });
  });

  it('disables every plate but the one saving, and disables "Something else" too', () => {
    render(
      <PlateGrid
        items={[item({ key: 'k1', name: 'Heineken pint' }), item({ key: 'k2', name: 'Guinness pint' })]}
        savingKey="k1"
        doneKey={null}
        saveInFlight
        onAddCustom={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guinness pint' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Something else' })).toBeDisabled();
  });

  it('leaves every plate enabled when nothing is saving', () => {
    render(
      <PlateGrid
        items={[item({ key: 'k1', name: 'Heineken pint' })]}
        savingKey={null}
        doneKey={null}
        saveInFlight={false}
        onAddCustom={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Something else' })).toBeEnabled();
  });

  it('rotates plates deterministically by position, not randomly, and holds steady across a re-render', () => {
    const items = [
      item({ key: 'k1', name: 'Heineken pint' }),
      item({ key: 'k2', name: 'Guinness pint' }),
      item({ key: 'k3', name: 'Duvel bottle' }),
    ];
    const { rerender } = render(
      <PlateGrid items={items} savingKey={null} doneKey={null} saveInFlight={false} onAddCustom={vi.fn()} />
    );

    const rotationOf = (name: string) =>
      screen.getByRole('button', { name }).style.getPropertyValue('--rot');

    const first = [rotationOf('Heineken pint'), rotationOf('Guinness pint'), rotationOf('Duvel bottle')];
    expect(new Set(first).size).toBeGreaterThan(1); // not every plate tilts the same way

    rerender(<PlateGrid items={items} savingKey={null} doneKey={null} saveInFlight={false} onAddCustom={vi.fn()} />);

    const second = [rotationOf('Heineken pint'), rotationOf('Guinness pint'), rotationOf('Duvel bottle')];
    expect(second).toEqual(first);
  });
});
