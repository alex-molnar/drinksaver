import React from 'react';
import PlateSkeleton from './PlateSkeleton';
import { Grid, ROTATIONS, Row, Scroll } from './plateGridLayout';

const TILE_COUNT = 6;

/**
 * A placeholder board shown while `QuickSavePage` waits on the recommendations query: the same
 * two-column, rotated-tile shape `PlateGrid` renders once data arrives, so nothing about the
 * layout shifts when it does. The tile count is fixed rather than derived from anything, since
 * the real count is exactly what hasn't loaded yet.
 *
 * `role="status"` carries the one accessible "loading" announcement for the whole board; the
 * individual tiles are decorative and hidden from assistive technology (see `PlateSkeleton`), so
 * a screen reader hears this once rather than once per tile.
 */
const PlateGridSkeleton: React.FC = () => {
  const rotations = ROTATIONS.slice(0, TILE_COUNT);
  const rows: number[][] = [];
  for (let i = 0; i < rotations.length; i += 2) {
    rows.push(rotations.slice(i, i + 2).map((_, colIndex) => i + colIndex));
  }

  return (
    <Scroll>
      <Grid role="status" aria-label="Loading recommendations">
        {rows.map((row, rowIndex) => (
          <Row key={rowIndex}>
            {row.map((tileIndex) => (
              <PlateSkeleton key={tileIndex} rotation={rotations[tileIndex]} />
            ))}
          </Row>
        ))}
      </Grid>
    </Scroll>
  );
};

export default PlateGridSkeleton;
