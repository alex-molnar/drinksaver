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
