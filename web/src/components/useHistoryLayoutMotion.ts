import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { PaperTabRow } from './PaperTab';
import { HISTORY_MOVE } from './historyMotion';

const transform = (node: HTMLElement): DOMMatrix => {
  const value = getComputedStyle(node).transform;
  return new DOMMatrix(value && value !== 'none' ? value : undefined);
};

/** FLIP: commit the new layout once, then translate surviving rows from their previous visual
 * positions. Only explicit exits (or an interrupted move) animate; query changes do not.
 * The paper is a separate surface so its transform never scales the text or controls. */
export function useHistoryLayoutMotion(tabRef: RefObject<HTMLDivElement | null>, rows: readonly PaperTabRow[], reduced: boolean) {
  const previous = useRef(new Map<number, { top: number; gone: boolean }>());
  const previousHeight = useRef(0);
  const animations = useRef(new Map<HTMLElement, Animation>());

  useLayoutEffect(() => {
    const tab = tabRef.current!;
    const nodes = [...tab.querySelectorAll<HTMLElement>('[data-history-row]')];
    const next = new Map(nodes.map((node) => [Number(node.dataset.historyRow), {
      top: node.offsetTop, gone: node.hasAttribute('data-gone'),
    }]));
    const height = tab.offsetHeight;
    const before = previous.current;
    const oldHeight = previousHeight.current;
    previous.current = next;
    previousHeight.current = height;

    const changed = height !== oldHeight || next.size !== before.size
      || [...next].some(([id, value]) => before.get(id)?.top !== value.top);
    const removedExit = [...before].some(([id, value]) => value.gone && !next.has(id));
    const moving = [...animations.current.values()].some((animation) => animation.playState === 'running');
    if (!reduced && (!changed || (!removedExit && !moving))) return;

    // Read all current transforms before cancelling any motion. A second removal or Undo
    // during the gap animation retargets from what is on screen, not from its old starting point.
    const offsets = nodes.map((node) => {
      const old = before.get(Number(node.dataset.historyRow));
      const shift = animations.current.has(node) ? transform(node).m42 : 0;
      return { node, delta: old ? old.top + shift - node.offsetTop : 0 };
    });
    const surface = tab.querySelector<HTMLElement>('[data-history-paper]')!;
    const scale = animations.current.has(surface) ? transform(surface).m22 : 1;
    for (const animation of animations.current.values()) animation.cancel();
    animations.current.clear();
    if (reduced || !tab.animate) return;

    for (const { node, delta } of offsets) {
      if (delta) animations.current.set(node, node.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], HISTORY_MOVE,
      ));
    }
    if (height && oldHeight && height !== oldHeight * scale) animations.current.set(surface, surface.animate(
      [{ transform: `scaleY(${oldHeight * scale / height})` }, { transform: 'scaleY(1)' }], HISTORY_MOVE,
    ));
  }, [tabRef, rows, reduced]);

  useLayoutEffect(() => {
    const active = animations.current;
    return () => { for (const animation of active.values()) animation.cancel(); };
  }, []);
}
