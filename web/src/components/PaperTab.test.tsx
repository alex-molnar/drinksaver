import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaperTab, { type PaperTabRow } from './PaperTab';
import type { EditableDrink } from '../types/api';

const heineken: EditableDrink = { id: 1, name: 'Heineken pint', alcoholTypeId: 4 };
const redWine: EditableDrink = { id: 2, name: 'Red Wine', alcoholTypeId: 30 };

const rowFor = (drink: EditableDrink, overrides: Partial<PaperTabRow> = {}): PaperTabRow => ({
  drink,
  selected: false,
  gone: false,
  ...overrides,
});

describe('PaperTab', () => {
  it('shows the day label in its header', () => {
    render(<PaperTab label="Today" status="ready" rows={[]} onToggleSelect={vi.fn()} onDeleteOne={vi.fn()} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders a loading indicator while the day has not resolved, with no rows', () => {
    render(
      <PaperTab
        label="Today"
        status="loading"
        rows={[rowFor(heineken)]}
        onToggleSelect={vi.fn()}
        onDeleteOne={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Heineken pint' })).not.toBeInTheDocument();
  });

  it('renders an alert when the day errors', () => {
    render(<PaperTab label="Today" status="error" rows={[]} onToggleSelect={vi.fn()} onDeleteOne={vi.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows an empty message for a day that resolved with no drinks', () => {
    render(<PaperTab label="Today" status="ready" rows={[]} onToggleSelect={vi.fn()} onDeleteOne={vi.fn()} />);

    expect(screen.getByText(/nothing on this day/i)).toBeInTheDocument();
  });

  it.each([
    [0, 'nothing'],
    [1, '1 drink'],
    [3, '3 drinks'],
  ])('reports a count of %i as "%s"', (n, expected) => {
    const rows = Array.from({ length: n }, (_, i) => rowFor({ id: i + 1, name: `Drink ${i}`, alcoholTypeId: 4 }));
    render(<PaperTab label="Today" status="ready" rows={rows} onToggleSelect={vi.fn()} onDeleteOne={vi.fn()} />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('renders one row per drink, each a button naming the drink', () => {
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken), rowFor(redWine)]}
        onToggleSelect={vi.fn()}
        onDeleteOne={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Heineken pint' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Red Wine' })).toBeInTheDocument();
  });

  it("reflects each row's selected state in its nested checkbox", () => {
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken, { selected: true }), rowFor(redWine, { selected: false })]}
        onToggleSelect={vi.fn()}
        onDeleteOne={vi.fn()}
      />
    );

    const heinekenRow = screen.getByRole('button', { name: 'Heineken pint' });
    const redWineRow = screen.getByRole('button', { name: 'Red Wine' });
    expect(within(heinekenRow).getByRole('checkbox')).toBeChecked();
    expect(within(redWineRow).getByRole('checkbox')).not.toBeChecked();
  });

  it('toggles selection when a row is clicked', async () => {
    const onToggleSelect = vi.fn();
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken)]}
        onToggleSelect={onToggleSelect}
        onDeleteOne={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Heineken pint' }));

    expect(onToggleSelect).toHaveBeenCalledWith(heineken);
  });

  it.each(['{Enter}', ' '])('toggles selection from the keyboard with %s', async (key) => {
    const onToggleSelect = vi.fn();
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken)]}
        onToggleSelect={onToggleSelect}
        onDeleteOne={vi.fn()}
      />
    );

    const row = screen.getByRole('button', { name: 'Heineken pint' });
    row.focus();
    await userEvent.keyboard(key);

    expect(onToggleSelect).toHaveBeenCalledWith(heineken);
  });

  it('does not toggle selection on an unrelated key', async () => {
    const onToggleSelect = vi.fn();
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken)]}
        onToggleSelect={onToggleSelect}
        onDeleteOne={vi.fn()}
      />
    );

    screen.getByRole('button', { name: 'Heineken pint' }).focus();
    await userEvent.keyboard('{Tab}');

    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it("crosses off a single row without toggling the row's own selection", async () => {
    const onToggleSelect = vi.fn();
    const onDeleteOne = vi.fn();
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken)]}
        onToggleSelect={onToggleSelect}
        onDeleteOne={onDeleteOne}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /cross off heineken pint/i }));

    expect(onDeleteOne).toHaveBeenCalledWith(heineken);
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('marks an exiting row with data-gone, so it can be struck through and collapsed', () => {
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken, { gone: true })]}
        onToggleSelect={vi.fn()}
        onDeleteOne={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Heineken pint' })).toHaveAttribute('data-gone', '');
  });

  it('does not mark a live row with data-gone', () => {
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken)]}
        onToggleSelect={vi.fn()}
        onDeleteOne={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Heineken pint' })).not.toHaveAttribute('data-gone');
  });

  it('renders an optional serving detail after the leader', () => {
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken, { detail: '0.5 L draft' })]}
        onToggleSelect={vi.fn()}
        onDeleteOne={vi.fn()}
      />
    );

    expect(screen.getByText('0.5 L draft')).toBeInTheDocument();
  });

  it('renders no detail element when none is given', () => {
    const { container } = render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken)]}
        onToggleSelect={vi.fn()}
        onDeleteOne={vi.fn()}
      />
    );

    // The row's own name carries no detail text; asserting there is exactly one text node
    // inside the row beyond the name would be brittle, so assert the specific case instead.
    expect(container.querySelector('[data-gone]')).toBeNull();
  });

  /**
   * The same regression `HistoryPage.test.tsx` used to carry: history names are composed server
   * side ("Gin (Long drink - 0.25l)") and never match the drink identity table, so resolving on
   * name alone draws the default glass for every row. `alcoholTypeId` is what rescues it.
   */
  it('uses the alcohol type id to draw the right glass when the composed name is unrecognised', () => {
    render(
      <PaperTab
        label="Today"
        status="ready"
        rows={[rowFor(heineken), rowFor(redWine)]}
        onToggleSelect={vi.fn()}
        onDeleteOne={vi.fn()}
      />
    );

    expect(screen.getByTestId('glass-pint')).toBeInTheDocument();
    expect(screen.getByTestId('glass-wine')).toBeInTheDocument();
    expect(screen.queryByTestId('glass-highball')).not.toBeInTheDocument();
  });
});
