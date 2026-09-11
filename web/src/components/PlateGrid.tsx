import React from 'react';
import styled from '@emotion/styled';
import Plate, { type PlateStatus } from './Plate';

export interface PlateGridItem {
  /** The composite key from `QuickSavePage.tsx`, used both as React's reconciliation key and to
   *  match this item against `savingKey` / `doneKey`. One value for both purposes, on purpose:
   *  see `QuickSavePage.tsx`'s module doc for the bug this replaces. */
  key: string;
  name: string;
  alcoholTypeId: number;
  onSave: () => void;
}

interface PlateGridProps {
  items: PlateGridItem[];
  /** The item currently mid-save, or null. */
  savingKey: string | null;
  /** The item that just resolved and is still showing its stamp, or null. */
  doneKey: string | null;
  /** True while any save is in flight, so every plate but the active one - and the trailing "add"
   *  plate - can be disabled without a second tap racing the first. */
  saveInFlight: boolean;
  onAddCustom: () => void;
}

/** Degrees. Copied verbatim from the approved prototype's `ROT` constant: a fixed sequence
 *  indexed by position, not `Math.random()`, so a plate's tilt never changes on re-render. */
const ROTATIONS = [-0.7, 0.5, 0.8, -0.5, 0.4, -0.8, 0.6];

const Scroll = styled.div`
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

const Grid = styled.div`
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
const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  content-visibility: auto;
  contain-intrinsic-height: 176px;
`;

type GridEntry = { kind: 'drink'; item: PlateGridItem } | { kind: 'add' };

/**
 * Two columns of enamel plates, deterministically rotated by position, with the trailing
 * "Something else" plate always last. Knows nothing about `Recommendation` or the save queue:
 * `QuickSavePage` has already reduced both to `items`, `savingKey` and `doneKey`, so this
 * component stays a plain function of its props.
 */
const PlateGrid: React.FC<PlateGridProps> = ({ items, savingKey, doneKey, saveInFlight, onAddCustom }) => {
  const entries: GridEntry[] = [...items.map((item): GridEntry => ({ kind: 'drink', item })), { kind: 'add' }];

  const rows: GridEntry[][] = [];
  for (let i = 0; i < entries.length; i += 2) {
    rows.push(entries.slice(i, i + 2));
  }

  return (
    <Scroll>
      <Grid>
        {rows.map((row, rowIndex) => (
          // Positional key: a row is a plain layout grouping with no identity or state of its
          // own to preserve across a re-render, unlike the plates inside it.
          <Row key={rowIndex}>
            {row.map((entry, colIndex) => {
              const rotation = ROTATIONS[(rowIndex * 2 + colIndex) % ROTATIONS.length];

              if (entry.kind === 'add') {
                return (
                  <Plate
                    key="add"
                    variant="add"
                    label="Something else"
                    rotation={rotation}
                    onClick={onAddCustom}
                    disabled={saveInFlight}
                  />
                );
              }

              const { item } = entry;
              const status: PlateStatus =
                savingKey === item.key ? 'saving' : doneKey === item.key ? 'done' : 'idle';

              return (
                <Plate
                  key={item.key}
                  variant="drink"
                  name={item.name}
                  alcoholTypeId={item.alcoholTypeId}
                  rotation={rotation}
                  status={status}
                  disabled={saveInFlight && savingKey !== item.key}
                  onClick={item.onSave}
                />
              );
            })}
          </Row>
        ))}
      </Grid>
    </Scroll>
  );
};

export default PlateGrid;
