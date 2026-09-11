/**
 * A night out does not respect midnight. A drink at 23:30 and the next at 00:30 belong to the
 * same evening, so the app files drinks by the *drinking day* rather than the calendar day:
 * anything logged before 06:00 local belongs to the previous date.
 *
 * Two things this deliberately does not do.
 *
 * It does not use `toISOString`, which is UTC. The old code did, which filed anything before
 * 01:00 or 02:00 local under the previous date depending on the season. That was an accident in
 * roughly the right direction, which is why it never read as a bug, but it was two hours wide
 * instead of six and it moved with the season.
 *
 * It does not subtract six hours from the instant either, even though "the local date as it was
 * six hours ago" is the easiest way to say the rule out loud. On the European spring-forward day
 * the clocks jump 02:00 to 03:00, so only five real hours pass between 00:30 and 06:30 local, and
 * instant arithmetic would file an 06:30 drink under the previous date. The rule is about the
 * user's wall clock, so the implementation reads the wall clock.
 */
export const DAY_ROLLOVER_HOUR = 6;

/** `YYYY-MM-DD` from local components, which is the format the API stores. */
const localISODate = (d: Date): string =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');

/**
 * The date a drink logged at `now` should be filed under.
 *
 * Takes `now` rather than reading the clock so it is testable without faking time, and so no
 * module in this feature computes a date at import time.
 */
export const drinkingDay = (now: Date): string => {
  const d = new Date(now.getTime());
  if (d.getHours() < DAY_ROLLOVER_HOUR) {
    // setDate normalises across month, year and leap day boundaries, and works in local terms,
    // which is what keeps this correct on a daylight saving day.
    d.setDate(d.getDate() - 1);
  }
  return localISODate(d);
};

/**
 * True while the drinking day is still behind the calendar day, so the interface can say
 * "Tonight" rather than "Today" and a day strip showing yesterday's date reads as intended
 * rather than as a glitch.
 */
export const isTonight = (now: Date): boolean => now.getHours() < DAY_ROLLOVER_HOUR;

/** How many day tabs `DayStrip` shows: the current drinking day and the six before it. */
export const DAY_STRIP_LENGTH = 7;

/** A `YYYY-MM-DD` string parsed back into local date components, the inverse of `localISODate`. */
const fromISODate = (date: string): Date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * The `length` drinking-day dates ending at `latest`, oldest first. Pure calendar arithmetic on
 * an already-resolved drinking day: `latest` is normally `drinkingDay(new Date())`, resolved
 * once by the caller, so walking back whole calendar days from it needs no further rollover
 * logic of its own. `setDate` steps across a month, year or leap day boundary the same way
 * `drinkingDay` itself does, so this holds on a daylight saving day without special-casing it.
 */
export const dayStripDates = (latest: string, length: number = DAY_STRIP_LENGTH): string[] => {
  const anchor = fromISODate(latest);
  const dates: string[] = [];
  for (let i = length - 1; i >= 0; i -= 1) {
    const d = new Date(anchor.getTime());
    d.setDate(d.getDate() - i);
    dates.push(localISODate(d));
  }
  return dates;
};

/** A day tab's compact label: a short weekday and the day-of-month number. */
export interface DayStripTabLabel {
  weekday: string;
  day: number;
}

export const dayStripTabLabel = (date: string): DayStripTabLabel => {
  const d = fromISODate(date);
  return { weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }), day: d.getDate() };
};

/**
 * A day's full, human label relative to `today` (itself a drinking day): "Today", "Yesterday",
 * or a full weekday-and-date for anything further back, or picked from the date input. Shared by
 * the day strip's screen-reader text and the paper tab's own header, so the two never disagree
 * about what a given date is called.
 */
export const dayLabel = (date: string, today: string): string => {
  if (date === today) {
    return 'Today';
  }
  const diffDays = Math.round((fromISODate(today).getTime() - fromISODate(date).getTime()) / 86_400_000);
  if (diffDays === 1) {
    return 'Yesterday';
  }
  return fromISODate(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};
