import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { useAuth } from '../auth';
import { useDrinksForDate } from '../drink/useDrinksForDate';
import { useSheet } from '../hooks/useSheet';
import { MENU_PANEL } from './AddSheet';
import type { AddSheetPanel } from './AddSheet';
import { ADD_SHEET_ID } from '../drink/draftReducer';
import { drinkingDay, isTonight } from '../drink/day';

interface AppFrameProps {
  children: React.ReactNode;
  /** Overrides the drinking-day heading. History names the screen instead. */
  title?: string;
  /** Overrides the day's drink count shown beside the heading. */
  subtitle?: string;
}

const Frame = styled.div`
  /* #root already subtracts the device safe areas from the available height. */
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--ds-surface-ground);
  color: var(--ds-ink-primary);
`;

/** The header: a painted board. */
const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px 12px;
  flex: none;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.22), transparent);
  border-bottom: 1px solid rgba(0, 0, 0, 0.4);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--ds-ink-primary) 7%, transparent);
`;

const Heading = styled.h1`
  margin: 0;
  font-family: var(--ds-type-display-l-font-family);
  font-size: var(--ds-type-display-l-font-size);
  font-weight: var(--ds-type-display-l-font-weight);
  line-height: 1.05;
  letter-spacing: -0.008em;
`;

const Sub = styled.span`
  margin-left: auto;
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  font-weight: var(--ds-type-caption-font-weight);
  color: var(--ds-ink-tertiary);
`;

const IconButton = styled.button`
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--ds-radius-md);
  background: transparent;
  color: var(--ds-ink-tertiary);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    color 140ms ease-out,
    background 140ms ease-out;

  &:hover {
    color: var(--ds-ink-primary);
    background: color-mix(in srgb, var(--ds-ink-primary) 7%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-secondary);
    outline-offset: 2px;
  }
  svg {
    width: 19px;
    height: 19px;
  }
`;

const Main = styled.main`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/** The bottom nav: also a painted board. */
const Nav = styled.nav`
  flex: none;
  display: flex;
  background: linear-gradient(180deg, var(--ds-surface-raised), var(--ds-surface-recess));
  border-top: 1.5px solid color-mix(in srgb, var(--ds-ink-primary) 13%, transparent);
  box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.4);
  padding-bottom: env(safe-area-inset-bottom);
`;

const NavButton = styled.button`
  flex: 1;
  min-height: 44px;
  border: 0;
  background: none;
  color: var(--ds-ink-tertiary);
  padding: 11px 0 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font: inherit;
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  cursor: pointer;
  transition: color 150ms ease-out;
  -webkit-tap-highlight-color: transparent;
  position: relative;

  &[aria-current] {
    color: var(--ds-ink-primary);
  }
  &[aria-current]::after {
    content: '';
    position: absolute;
    top: 0;
    left: 26%;
    right: 26%;
    height: 2.5px;
    background: var(--ds-accent-active);
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-secondary);
    outline-offset: -4px;
  }
  svg {
    width: 21px;
    height: 21px;
  }
`;

const BoltIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12Z" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const ClockIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

const SignOutIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h11" />
  </svg>
);

const ROUTE_ITEMS: { path: string; label: string; Icon: React.FC }[] = [
  { path: '/', label: 'Quick', Icon: BoltIcon },
  { path: '/history', label: 'History', Icon: ClockIcon },
];

/**
 * The painted-board header and bottom nav that frame Quick Save. Owns navigation and sign-out
 * directly, the same way `Layout` does, rather than taking them as props: there is exactly one
 * caller today (`QuickSavePage`), and giving this its own `useLocation` keeps that caller from
 * having to thread routing state through just to light up the active tab.
 *
 * The header's count is read from the drinks already loaded for the current day via
 * `useDrinksForDate`, the same hook `HistoryPage` builds on - no new endpoint, and no new query
 * either beyond the one that hook already makes.
 */
const AppFrame: React.FC<AppFrameProps> = ({ children, title, subtitle }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { open: openAddSheet, isOpen: addSheetOpen } = useSheet<AddSheetPanel>(ADD_SHEET_ID, MENU_PANEL);

  const now = new Date();
  const today = drinkingDay(now);
  // "Tonight" between midnight and the 06:00 rollover. Without it the header says Today while
  // the drinking day is still yesterday's date, which reads as a glitch rather than as the rule.
  // Quick Save's header is the drinking day itself; History names the screen and puts the day
  // beside it, as the prototype does. Hence the override rather than two frames.
  const heading = title ?? (isTonight(now) ? 'Tonight' : 'Today');
  const drinksToday = useDrinksForDate(today);
  const count = drinksToday.status === 'ready' ? drinksToday.rows.length : null;
  const countText = count === null ? '' : count > 0 ? `${count} so far` : 'Nothing yet';

  return (
    <Frame>
      <Header>
        <Heading>{heading}</Heading>
        <Sub>{subtitle ?? countText}</Sub>
        <IconButton type="button" onClick={logout} aria-label="Sign out">
          <SignOutIcon />
        </IconButton>
      </Header>
      <Main>{children}</Main>
      <Nav>
        <NavButton
          key={ROUTE_ITEMS[0].path}
          type="button"
          onClick={() => navigate(ROUTE_ITEMS[0].path)}
          aria-current={location.pathname === ROUTE_ITEMS[0].path ? 'page' : undefined}
        >
          <BoltIcon />
          <span>{ROUTE_ITEMS[0].label}</span>
        </NavButton>

        {/*
          Add opens the sheet in place rather than navigating to /detailed and riding its
          redirect. Going through the redirect works, but it never stamps a dismiss depth, so
          dismissing afterwards walks back to / instead of to wherever the tab was tapped from.
          Opened from History, that means the sheet drops you on Quick Save on the way out.
        */}
        <NavButton type="button" onClick={openAddSheet} aria-current={addSheetOpen ? 'page' : undefined}>
          <PlusIcon />
          <span>Add</span>
        </NavButton>

        <NavButton
          key={ROUTE_ITEMS[1].path}
          type="button"
          onClick={() => navigate(ROUTE_ITEMS[1].path)}
          aria-current={location.pathname === ROUTE_ITEMS[1].path ? 'page' : undefined}
        >
          <ClockIcon />
          <span>{ROUTE_ITEMS[1].label}</span>
        </NavButton>
      </Nav>
    </Frame>
  );
};

export default AppFrame;
