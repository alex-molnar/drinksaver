import styled from '@emotion/styled';

/** Degrees. Copied verbatim from the approved prototype's `ROT` constant: a fixed sequence
 *  indexed by position, not `Math.random()`, so a plate's tilt never changes on re-render.
 *  Shared between `PlateGrid` and `PlateGridSkeleton` so a loading tile sits at the exact
 *  position, and takes the exact tilt, its real replacement will land in. */
export const ROTATIONS = [-0.7, 0.5, 0.8, -0.5, 0.4, -0.8, 0.6];

export const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

export const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 16px 22px;
`;

/**
 * One row of (up to) two plates. `content-visibility: auto` lets the browser skip layout and
 * paint for whichever rows are off-screen, which is what "the grid scrolls now" costs: see the
 * design doc's performance note. `contain-intrinsic-height` gives the row a placeholder height to
 * reserve before it has ever been measured, so scrolling past an unmeasured row does not jump the
 * scrollbar; width is left alone; the row already stretches to fill the grid column regardless of
 * whether its content is currently being skipped.
 */
export const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  content-visibility: auto;
  contain-intrinsic-height: 176px;
`;
