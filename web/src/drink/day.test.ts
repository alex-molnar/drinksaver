import { describe, it, expect } from 'vitest';
import { drinkingDay, isTonight, DAY_ROLLOVER_HOUR } from './day';

/**
 * Dates are built from local components on purpose. `drinkingDay` is defined in terms of the
 * user's wall clock, so a test that constructs and asserts in the same local zone holds in every
 * zone, which is what lets these run unchanged on a UTC CI runner and on a machine in Budapest.
 */
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);

describe('drinkingDay', () => {
  it('keeps an evening drink on its own date', () => {
    expect(drinkingDay(at(2026, 9, 9, 23, 30))).toBe('2026-09-09');
  });

  /** The whole point: 23:30 and 00:30 an hour later are the same night out. */
  it('files an after-midnight drink on the evening it belongs to', () => {
    expect(drinkingDay(at(2026, 9, 10, 0, 30))).toBe('2026-09-09');
  });

  it('rolls over at exactly 06:00, not before', () => {
    expect(drinkingDay(at(2026, 9, 10, 5, 59))).toBe('2026-09-09');
    expect(drinkingDay(at(2026, 9, 10, 6, 0))).toBe('2026-09-10');
  });

  it('treats every hour before the rollover as the previous date', () => {
    for (let h = 0; h < DAY_ROLLOVER_HOUR; h += 1) {
      expect(drinkingDay(at(2026, 9, 10, h))).toBe('2026-09-09');
    }
  });

  it('treats every hour from the rollover onward as the current date', () => {
    for (let h = DAY_ROLLOVER_HOUR; h < 24; h += 1) {
      expect(drinkingDay(at(2026, 9, 10, h))).toBe('2026-09-10');
    }
  });

  it('steps back across a month boundary', () => {
    expect(drinkingDay(at(2026, 10, 1, 2, 0))).toBe('2026-09-30');
  });

  it('steps back across a year boundary', () => {
    expect(drinkingDay(at(2026, 1, 1, 3, 0))).toBe('2025-12-31');
  });

  it('steps back across a leap day', () => {
    expect(drinkingDay(at(2028, 3, 1, 1, 0))).toBe('2028-02-29');
  });

  /**
   * The reason this compares the local hour instead of subtracting six hours from the instant.
   * On the European spring-forward day the clocks jump 02:00 to 03:00, so only five real hours
   * pass between 00:30 and 06:30 local. Instant arithmetic would put an 06:30 drink on the
   * previous date; the rule is about the wall clock, so it must not.
   */
  it('is defined by the wall clock, so a short day does not shift the rollover', () => {
    expect(drinkingDay(at(2026, 3, 29, 6, 30))).toBe('2026-03-29');
    expect(drinkingDay(at(2026, 3, 29, 3, 30))).toBe('2026-03-28');
  });

  it('does not mutate the date it is given', () => {
    const now = at(2026, 9, 10, 1, 0);
    const before = now.getTime();
    drinkingDay(now);
    expect(now.getTime()).toBe(before);
  });
});

describe('isTonight', () => {
  it('is true while the night is still running', () => {
    expect(isTonight(at(2026, 9, 10, 0, 30))).toBe(true);
    expect(isTonight(at(2026, 9, 10, 5, 59))).toBe(true);
  });

  it('is false once the drinking day has caught up with the calendar', () => {
    expect(isTonight(at(2026, 9, 10, 6, 0))).toBe(false);
    expect(isTonight(at(2026, 9, 9, 23, 30))).toBe(false);
  });
});
