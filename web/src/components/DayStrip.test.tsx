import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DayStrip from './DayStrip';
import { dayStripDates } from '../drink/day';
import type { DayCount } from '../drink/useDayCounts';

const TODAY = '2026-09-10';
const DATES = dayStripDates(TODAY);

const readyCounts = (): DayCount[] => DATES.map(() => ({ status: 'ready', count: 0, swatches: [] }));

describe('DayStrip', () => {
  it('renders one button per date, plus the pick-a-date affordance', () => {
    render(
      <DayStrip dates={DATES} counts={readyCounts()} selectedDate={TODAY} todayDate={TODAY} onSelect={vi.fn()} />
    );

    // Seven day buttons, named by their full label and status (see `dayLabel`/`statusText`).
    expect(screen.getAllByRole('button')).toHaveLength(DATES.length);
    expect(screen.getByLabelText('Pick a date')).toBeInTheDocument();
  });

  it('marks only the selected date as current', () => {
    render(
      <DayStrip dates={DATES} counts={readyCounts()} selectedDate={DATES[2]} todayDate={TODAY} onSelect={vi.fn()} />
    );

    const buttons = screen.getAllByRole('button');
    const current = buttons.filter((b) => b.getAttribute('aria-current') === 'date');
    expect(current).toHaveLength(1);
  });

  it('calls onSelect with the date when a day button is clicked', async () => {
    const onSelect = vi.fn();
    render(<DayStrip dates={DATES} counts={readyCounts()} selectedDate={TODAY} todayDate={TODAY} onSelect={onSelect} />);

    // "Today" is the last of the seven, and its accessible name starts with "Today".
    await userEvent.click(screen.getByRole('button', { name: /^today,/i }));

    expect(onSelect).toHaveBeenCalledWith(TODAY);
  });

  /**
   * The distinction the whole strip rests on, asserted again at this level: a day still loading
   * must not be announced or drawn the same way as a day confirmed to have zero drinks.
   */
  it('gives a day still loading a status distinct from a day confirmed to have no drinks', () => {
    const counts: DayCount[] = readyCounts();
    counts[0] = { status: 'loading' };
    counts[1] = { status: 'ready', count: 0, swatches: [] };

    render(<DayStrip dates={DATES} counts={counts} selectedDate={TODAY} todayDate={TODAY} onSelect={vi.fn()} />);

    // Named by day, not by status text: every other day in the fixture is also "no drinks", so a
    // bare text query proves nothing about which day said what. The point is that these two
    // specific days, one unread and one confirmed empty, do not announce the same thing.
    const buttons = screen.getAllByRole('button');
    const [stillLoading, confirmedEmpty] = buttons;

    expect(stillLoading).toHaveAccessibleName(/not loaded yet/i);
    expect(stillLoading).not.toHaveAccessibleName(/no drinks/i);
    expect(confirmedEmpty).toHaveAccessibleName(/no drinks/i);
  });

  it('announces an error day distinctly too', () => {
    const counts: DayCount[] = readyCounts();
    counts[0] = { status: 'error' };

    render(<DayStrip dates={DATES} counts={counts} selectedDate={TODAY} todayDate={TODAY} onSelect={vi.fn()} />);

    expect(screen.getByText(/could not load/i)).toBeInTheDocument();
  });

  it('announces a count for a day with drinks', () => {
    const counts: DayCount[] = readyCounts();
    counts[6] = { status: 'ready', count: 3, swatches: ['#2B7454', '#2B7454', '#2B7454'] };

    render(<DayStrip dates={DATES} counts={counts} selectedDate={TODAY} todayDate={TODAY} onSelect={vi.fn()} />);

    expect(screen.getByText(/3 drinks/)).toBeInTheDocument();
  });

  it("draws one pip per swatch for a day with drinks, coloured from that day's identities", () => {
    const counts: DayCount[] = readyCounts();
    counts[6] = { status: 'ready', count: 2, swatches: ['#2B7454', '#6B3350'] };

    const { container } = render(
      <DayStrip dates={DATES} counts={counts} selectedDate={TODAY} todayDate={TODAY} onSelect={vi.fn()} />
    );

    const lastTile = container.querySelectorAll('button')[6];
    const pips = lastTile.querySelectorAll('i');
    expect(pips).toHaveLength(2);
    expect((pips[0] as HTMLElement).style.color).toBe('rgb(43, 116, 84)');
    expect((pips[1] as HTMLElement).style.color).toBe('rgb(107, 51, 80)');
  });

  it('draws no pips for a day confirmed to have zero drinks', () => {
    const counts: DayCount[] = readyCounts();

    const { container } = render(
      <DayStrip dates={DATES} counts={counts} selectedDate={TODAY} todayDate={TODAY} onSelect={vi.fn()} />
    );

    const firstTile = container.querySelectorAll('button')[0];
    expect(firstTile.querySelectorAll('i')).toHaveLength(0);
  });

  it("sets the date input's value and max from props", () => {
    render(
      <DayStrip dates={DATES} counts={readyCounts()} selectedDate={DATES[3]} todayDate={TODAY} onSelect={vi.fn()} />
    );

    const input = screen.getByLabelText('Pick a date') as HTMLInputElement;
    expect(input.value).toBe(DATES[3]);
    expect(input.max).toBe(TODAY);
  });

  it('calls onSelect when a date is picked from the native input', () => {
    const onSelect = vi.fn();
    render(<DayStrip dates={DATES} counts={readyCounts()} selectedDate={TODAY} todayDate={TODAY} onSelect={onSelect} />);

    const input = screen.getByLabelText('Pick a date') as HTMLInputElement;
    fireEventChange(input, '2026-08-20');

    expect(onSelect).toHaveBeenCalledWith('2026-08-20');
  });
});

/** `userEvent.type` does not drive a native `<input type="date">` reliably across environments;
 *  firing the change event directly is what the input's own handler actually listens for. */
function fireEventChange(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
