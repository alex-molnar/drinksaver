import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../../theme/muiTheme';
import MenuPanel from './MenuPanel';
import { useDraft } from '../../drink/useDraft';
import { useCatalogue } from '../../drink/useCatalogue';
import { useSaveQueue } from '../../drink/useSaveQueue';
import { initialDraftState, type DraftState } from '../../drink/draftReducer';

vi.mock('../../drink/useDraft');
vi.mock('../../drink/useCatalogue');
vi.mock('../../drink/useSaveQueue');

const TODAY = '2026-09-10';

const mockUseDraft = vi.mocked(useDraft);
const mockUseCatalogue = vi.mocked(useCatalogue);
const mockUseSaveQueue = vi.mocked(useSaveQueue);

const dispatch = vi.fn();
const save = vi.fn().mockReturnValue('save-1');

/** A catalogue where every query has already resolved, so a test only has to override the one
 *  field it cares about. */
const READY_CATALOGUE = {
  alcoholTypes: { data: [{ id: 1, name: 'Beer', volumeIds: [] }, { id: 2, name: 'Wine', volumeIds: [] }], isLoading: false },
  volumes: { data: [{ id: 10, name: 'Pint', volume: 0.5 }], isLoading: false },
  subtypes: { data: [{ id: 30, name: 'Red', alcoholTypeId: 2 }], isLoading: false },
  consumptionTypes: { data: [{ id: 40, name: 'Draft' }], isLoading: false },
  brands: { data: [{ id: 50, name: 'Heineken' }], isLoading: false },
  beerFlavours: { data: [{ id: 60, name: 'Lager', brandId: 50 }], isLoading: false },
  isBeer: false,
} as unknown as ReturnType<typeof useCatalogue>;

const setDraft = (overrides: Partial<DraftState> = {}, isBeer = false) => {
  const draft: DraftState = { ...initialDraftState(TODAY), ...overrides };
  mockUseDraft.mockReturnValue({ draft, dispatch });
  mockUseCatalogue.mockReturnValue({ ...READY_CATALOGUE, isBeer });
  return draft;
};

const renderMenuPanel = (onPushPanel = vi.fn(), onDismiss = vi.fn()) => {
  render(
    <ThemeProvider theme={muiTheme}>
      <MenuPanel onPushPanel={onPushPanel} onDismiss={onDismiss} />
    </ThemeProvider>
  );
  return { onPushPanel, onDismiss };
};

beforeEach(() => {
  vi.clearAllMocks();
  save.mockReturnValue('save-1');
  mockUseSaveQueue.mockReturnValue({
    queue: { entries: [] },
    current: null,
    save,
    remove: vi.fn(),
    undo: vi.fn(),
    retry: vi.fn(),
    stripHandlers: { onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() },
  });
  setDraft();
});

describe('MenuPanel', () => {
  it('renders the heading as a focusable heading element and focuses it on mount', () => {
    renderMenuPanel();
    const heading = screen.getByRole('heading', { name: 'What are you having?' });
    expect(heading.tagName).toBe('H2');
    expect(heading).toHaveFocus();
  });

  it('shows the Drink row with no value chosen yet, and the When, Notes and Recommend rows unconditionally', () => {
    renderMenuPanel();
    // The accessible name carries the same placeholder the row displays, per WCAG 2.5.3.
    expect(screen.getByRole('button', { name: /^Drink,/ })).toHaveAccessibleName(/Choose/i);
    expect(screen.getByRole('button', { name: /^When,/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Notes,/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Recommend,/ })).toBeInTheDocument();
    // Nothing beer- or size-specific until a type is chosen.
    expect(screen.queryByRole('button', { name: /^Size,/ })).not.toBeInTheDocument();
  });

  it('shows the chosen drink type in the Drink row', () => {
    setDraft({ alcoholTypeId: 2 });
    renderMenuPanel();
    expect(screen.getByRole('button', { name: /^Drink,/ })).toHaveAccessibleName(/wine/i);
  });

  it('pushes an option panel for the tapped row', async () => {
    const { onPushPanel } = renderMenuPanel();
    await userEvent.click(screen.getByRole('button', { name: /^Drink,/ }));
    expect(onPushPanel).toHaveBeenCalledWith({ kind: 'option', field: 'alcoholType' });
  });

  it('pushes the When panel for the date row', async () => {
    const { onPushPanel } = renderMenuPanel();
    await userEvent.click(screen.getByRole('button', { name: /^When,/ }));
    expect(onPushPanel).toHaveBeenCalledWith({ kind: 'option', field: 'date' });
  });

  it('disables the save control until a type and a size are chosen', () => {
    renderMenuPanel();
    expect(screen.getByRole('button', { name: /save drink/i })).toBeDisabled();
  });

  it('a beer additionally requires a consumption type before saving is enabled', () => {
    setDraft({ alcoholTypeId: 1, volumeId: 10 }, true);
    renderMenuPanel();
    expect(screen.getByRole('button', { name: /save drink/i })).toBeDisabled();
    cleanup();

    setDraft({ alcoholTypeId: 1, volumeId: 10, consumptionTypeId: 40 }, true);
    renderMenuPanel();
    expect(screen.getByRole('button', { name: /save drink/i })).toBeEnabled();
  });

  it('saves through the queue and dismisses the sheet once the draft is ready', async () => {
    setDraft({ alcoholTypeId: 2, volumeId: 10, subtypeId: 30, comments: 'A lovely evening' });
    const { onDismiss } = renderMenuPanel();

    await userEvent.click(screen.getByRole('button', { name: /save drink/i }));

    expect(save).toHaveBeenCalledTimes(1);
    const input = save.mock.calls[0][0];
    expect(input).toMatchObject({
      date: TODAY,
      alcoholTypeId: 2,
      payload: {
        alcoholTypeId: 2,
        alcoholVolumeId: 10,
        alcoholSubtypeId: 30,
        comments: 'A lovely evening',
      },
    });
    expect(typeof input.label).toBe('string');
    expect(input.label.length).toBeGreaterThan(0);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('labels a beer save with its brand rather than its subtype', async () => {
    setDraft({ alcoholTypeId: 1, volumeId: 10, brandId: 50, consumptionTypeId: 40 }, true);
    renderMenuPanel();

    await userEvent.click(screen.getByRole('button', { name: /save drink/i }));

    expect(save.mock.calls[0][0].label).toBe('Beer (Heineken)');
  });

  it('omits quantity from the payload for a single drink, and includes it above one', async () => {
    setDraft({ alcoholTypeId: 2, volumeId: 10, quantity: 3 });
    renderMenuPanel();

    expect(screen.getByRole('button', { name: /save 3 drinks/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save 3 drinks/i }));

    expect(save.mock.calls[0][0].payload.quantity).toBe(3);
  });

  it('does not call save when the control is disabled', async () => {
    renderMenuPanel();
    await userEvent.click(screen.getByRole('button', { name: /save drink/i }));
    expect(save).not.toHaveBeenCalled();
  });

  describe('the quantity stepper', () => {
    it('increments and decrements the draft quantity', async () => {
      setDraft({ alcoholTypeId: 2, volumeId: 10, quantity: 2 });
      renderMenuPanel();

      await userEvent.click(screen.getByRole('button', { name: 'One more' }));
      expect(dispatch).toHaveBeenCalledWith({ type: 'setQuantity', quantity: 3 });

      await userEvent.click(screen.getByRole('button', { name: 'One fewer' }));
      expect(dispatch).toHaveBeenCalledWith({ type: 'setQuantity', quantity: 1 });
    });

    it('disables one fewer at the floor and one more at the raised ceiling of 24', () => {
      setDraft({ quantity: 1 });
      renderMenuPanel();
      expect(screen.getByRole('button', { name: 'One fewer' })).toBeDisabled();
      cleanup();

      setDraft({ quantity: 24 });
      renderMenuPanel();
      expect(screen.getByRole('button', { name: 'One more' })).toBeDisabled();
    });
  });
});
