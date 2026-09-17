import React from 'react';
import styled from '@emotion/styled';
import Skeleton from '@mui/material/Skeleton';
import useMediaQuery from '@mui/material/useMediaQuery';

/** Same footprint as `Plate.tsx`'s `plateBase`: same min-height, radius and padding, so a real
 *  plate never shifts the layout when it replaces this tile. Cream `--ds-surface-paper` stands
 *  in for a drink's own `--fld` field colour, which isn't known until the recommendation loads. */
const SkeletonPlate = styled.div`
  position: relative;
  width: 100%;
  min-height: 150px;
  border-radius: var(--ds-radius-md);
  padding: 19px 13px 14px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background-color: var(--ds-surface-paper);
  transform: rotate(var(--rot, 0deg));

  .glass {
    margin-bottom: auto;
  }
  .name {
    margin-top: 9px;
  }
  .caption {
    margin-top: 5px;
  }
`;

const shimmerSx = { bgcolor: 'color-mix(in srgb, var(--ds-ink-on-paper) 16%, transparent)' };

interface PlateSkeletonProps {
  /** Degrees, computed by `PlateGridSkeleton` from the tile's position - the same deterministic
   *  sequence a real `Plate` would get in that slot, so nothing jumps when it arrives. */
  rotation: number;
}

/**
 * A placeholder enamel plate shown while recommendations are loading: same footprint as `Plate`,
 * with skeleton shapes standing in for the glass icon and the name/caption text. Purely
 * decorative - `PlateGridSkeleton` carries the one accessible "loading" announcement for the
 * whole grid, so every tile here is hidden from assistive technology.
 */
const PlateSkeleton: React.FC<PlateSkeletonProps> = ({ rotation }) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const animation = reducedMotion ? false : 'pulse';
  const style = { '--rot': `${rotation}deg` } as React.CSSProperties;

  return (
    <SkeletonPlate style={style} aria-hidden="true" data-testid="plate-skeleton">
      <span className="glass" data-testid="plate-skeleton-glass">
        <Skeleton variant="rounded" width={40} height={58} animation={animation} sx={shimmerSx} />
      </span>
      <span className="name" data-testid="plate-skeleton-name">
        <Skeleton variant="text" width="70%" height={22} animation={animation} sx={shimmerSx} />
      </span>
      <span className="caption" data-testid="plate-skeleton-caption">
        <Skeleton variant="text" width="45%" height={16} animation={animation} sx={shimmerSx} />
      </span>
    </SkeletonPlate>
  );
};

export default PlateSkeleton;
