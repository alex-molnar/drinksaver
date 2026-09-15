import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../../theme/muiTheme';
import OptionPanel from './OptionPanel';
import { useDraft } from '../../drink/useDraft';
import { useCatalogue } from '../../drink/useCatalogue';
import { useSaveQueue } from '../../drink/useSaveQueue';
import { initialDraftState, type DraftState } from '../../drink/draftReducer';
import { previousIsoDate } from '../../drink/draftFields';
import { drinkingDay } from '../../drink/day';
import { TEST_PALETTE_BY_NAME } from '../../test/designFixtures';
import { TestDesignProvider } from '../../test/TestDesignProvider';
import type { MenuRowKey } from '../../drink/draftFields';

vi.mock('../../drink/useDraft');
vi.mock('../../drink/useCatalogue');
vi.mock('../../drink/useSaveQueue');

const mockUseDraft = vi.mocked(useDraft);
const mockUseCatalogue = vi.mocked(useCatalogue);
const mockUseSaveQueue = vi.mocked(useSaveQueue);
const save = vi.fn().mockReturnValue('save-1');

const TODAY = drinkingDay(new Date());
const YESTERDAY = previousIsoDate(TODAY);

const dispatch = vi.fn();

const CATALOGUE = {
  alcoholTypes: { data: [{ id: 1, name: 'Beer', volumeIds: [], colorPaletteId: 3, glasswareId: 1 }, { id: 2, name: 'Wine', volumeIds: [], colorPaletteId: 6, glasswareId: 3 }], isLoading: false },
  volumes: { data: [{ id: 10, name: 'Pint', volume: 0.5 }], isLoading: false },
  subtypes: { data: [
    { id: 30, name: 'Red', alcoholTypeId: 2, colorPaletteId: 4 },
    { id: 31, name: 'White', alcoholTypeId: 2, colorPaletteId: null },
  ], isLoading: false },
  consumptionTypes: { data: [{ id: 40, name: 'Draft', glasswareId: 1 }], isLoading: false },
  brands: { data: [
    { id: 50, name: 'Heineken', colorPaletteId: 1 },
    { id: 51, name: 'House lager', colorPaletteId: null },
  ], isLoading: false } as { data: { id: number; name: string; colorPaletteId?: number | null }[] | undefined; isLoading: boolean },
  beerFlavours: { data: [
    { id: 60, name: 'Lager', brandId: 50, colorPaletteId: 7 },
    { id: 61, name: 'Pils', brandId: 50, colorPaletteId: null },
  ], isLoading: false },
  isBeer: false,
};

const setDraft = (overrides: Partial<DraftState> = {}, catalogueOverrides: Partial<typeof CATALOGUE> = {}) => {
  const draft: DraftState = { ...initialDraftState(TODAY), ...overrides };
  mockUseDraft.mockReturnValue({ draft, dispatch });
  mockUseCatalogue.mockReturnValue({ ...CATALOGUE, ...catalogueOverrides } as unknown as ReturnType<typeof useCatalogue>);
  return draft;
};

const renderOptionPanel = (field: MenuRowKey, onPushPanel = vi.fn(), onPopPanel = vi.fn(), onDismiss = vi.fn()) => {
  render(
    <ThemeProvider theme={muiTheme}>
      <TestDesignProvider>
        <OptionPanel field={field} onPushPanel={onPushPanel} onPopPanel={onPopPanel} onDismiss={onDismiss} />
      </TestDesignProvider>
    </ThemeProvider>
  );
  return { onPushPanel, onPopPanel, onDismiss };
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

describe('OptionPanel', () => {
  it('focuses its own heading, a real heading element, on mount', () => {
    renderOptionPanel('alcoholType');
    const heading = screen.getByRole('heading', { name: 'What are you drinking?' });
    expect(heading.tagName).toBe('H2');
    expect(heading).toHaveFocus();
  });

  it('calls onPopPanel when Back is pressed', async () => {
    const { onPopPanel } = renderOptionPanel('alcoholType');
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onPopPanel).toHaveBeenCalledTimes(1);
  });

  describe('a catalogue-backed field', () => {
    it('lists every option and selects the tapped one, then pops back to the menu', async () => {
      const { onPopPanel } = renderOptionPanel('alcoholType');
      expect(screen.getByRole('button', { name: 'Beer' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Wine' })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Wine' }));

      expect(dispatch).toHaveBeenCalledWith({ type: 'select', field: 'alcoholType', id: 2 });
      expect(onPopPanel).toHaveBeenCalledTimes(1);
    });

    it('formats a volume option as "name (volumeL)"', () => {
      renderOptionPanel('volume');
      expect(screen.getByRole('button', { name: 'Pint (0.5L)' })).toBeInTheDocument();
    });

    it('marks the currently chosen option', () => {
      setDraft({ alcoholTypeId: 2 });
      renderOptionPanel('alcoholType');
      expect(screen.getByRole('button', { name: 'Wine' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Beer' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('uses backend palette IDs for drink and brand identity swatches', () => {
      renderOptionPanel('alcoholType');
      const beerSwatch = screen.getByRole('button', { name: 'Beer' }).querySelector('[data-color-palette-id="3"]');
      const wineSwatch = screen.getByRole('button', { name: 'Wine' }).querySelector('[data-color-palette-id="6"]');

      expect(beerSwatch).toHaveStyle({ '--palette-swatch-field': TEST_PALETTE_BY_NAME.cream.field });
      expect(wineSwatch).toHaveStyle({ '--palette-swatch-field': TEST_PALETTE_BY_NAME.plum.field });
      expect(document.querySelectorAll('[data-color-palette-id]')).toHaveLength(2);

      cleanup();
      setDraft({ alcoholTypeId: 1 });
      renderOptionPanel('brand');
      expect(screen.getByRole('button', { name: 'Heineken' }).querySelector('[data-color-palette-id="1"]')).toHaveStyle({
        '--palette-swatch-field': TEST_PALETTE_BY_NAME.green.field,
      });
      expect(screen.getByRole('button', { name: 'House lager' }).querySelector('[data-color-palette-id="3"]')).toHaveStyle({
        '--palette-swatch-field': TEST_PALETTE_BY_NAME.cream.field,
      });
    });

    it('uses subtype palettes before falling back to the selected alcohol type', () => {
      setDraft({ alcoholTypeId: 2 });
      renderOptionPanel('subtype');

      expect(screen.getByRole('button', { name: 'Red' }).querySelector('[data-color-palette-id="4"]')).toHaveStyle({
        '--palette-swatch-field': TEST_PALETTE_BY_NAME.red.field,
      });
      expect(screen.getByRole('button', { name: 'White' }).querySelector('[data-color-palette-id="6"]')).toHaveStyle({
        '--palette-swatch-field': TEST_PALETTE_BY_NAME.plum.field,
      });
    });

    it('uses flavour, brand, then alcohol-type palettes in the beer flavour selector', () => {
      setDraft({ alcoholTypeId: 1, brandId: 50 });
      renderOptionPanel('beerFlavour');

      expect(screen.getByRole('button', { name: 'Lager' }).querySelector('[data-color-palette-id="7"]')).toHaveStyle({
        '--palette-swatch-field': TEST_PALETTE_BY_NAME.amber.field,
      });
      expect(screen.getByRole('button', { name: 'Pils' }).querySelector('[data-color-palette-id="1"]')).toHaveStyle({
        '--palette-swatch-field': TEST_PALETTE_BY_NAME.green.field,
      });

      cleanup();
      setDraft(
        { alcoholTypeId: 1, brandId: 50 },
        { brands: { data: [{ id: 50, name: 'Heineken', colorPaletteId: null }], isLoading: false } },
      );
      renderOptionPanel('beerFlavour');
      expect(screen.getByRole('button', { name: 'Pils' }).querySelector('[data-color-palette-id="3"]')).toHaveStyle({
        '--palette-swatch-field': TEST_PALETTE_BY_NAME.cream.field,
      });
    });

    it('keeps labels and selected state meaningful without exposing decorative swatches', () => {
      setDraft({ alcoholTypeId: 2 });
      renderOptionPanel('alcoholType');

      const wine = screen.getByRole('button', { name: 'Wine' });
      expect(wine).toHaveAttribute('aria-pressed', 'true');
      expect(wine.querySelector('[data-color-palette-id="6"]')).toHaveAttribute('aria-hidden', 'true');
    });

    it('offers a New row for a creatable field, and pushes the create panel', async () => {
      setDraft({ alcoholTypeId: 1 });
      const { onPushPanel } = renderOptionPanel('brand');
      await userEvent.click(screen.getByRole('button', { name: 'New brand' }));
      expect(onPushPanel).toHaveBeenCalledWith({ kind: 'create', field: 'brand' });
    });

    it('offers no New row for consumption type, which is not creatable', () => {
      renderOptionPanel('consumptionType');
      expect(screen.queryByRole('button', { name: /^New /i })).not.toBeInTheDocument();
    });

    it('lists subtype options and selects one', async () => {
      setDraft({ alcoholTypeId: 2 });
      const { onPopPanel } = renderOptionPanel('subtype');
      await userEvent.click(screen.getByRole('button', { name: 'Red' }));
      expect(dispatch).toHaveBeenCalledWith({ type: 'select', field: 'subtype', id: 30 });
      expect(onPopPanel).toHaveBeenCalledTimes(1);
    });

    it('lists beer flavour options and selects one', async () => {
      setDraft({ alcoholTypeId: 1, brandId: 50 });
      const { onPopPanel } = renderOptionPanel('beerFlavour');
      await userEvent.click(screen.getByRole('button', { name: 'Lager' }));
      expect(dispatch).toHaveBeenCalledWith({ type: 'select', field: 'beerFlavour', id: 60 });
      expect(onPopPanel).toHaveBeenCalledTimes(1);
    });

    it('shows a loading indicator while the query is in flight', () => {
      setDraft({}, { brands: { data: undefined, isLoading: true } });
      renderOptionPanel('brand');
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('the When panel (field "date")', () => {
    it('offers Today, Yesterday and Another day', () => {
      renderOptionPanel('date');
      expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Yesterday' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Another day' })).toBeInTheDocument();
    });

    it('picking Today sets the date to today and pops back', async () => {
      setDraft({ date: YESTERDAY });
      const { onPopPanel } = renderOptionPanel('date');
      await userEvent.click(screen.getByRole('button', { name: 'Today' }));
      expect(dispatch).toHaveBeenCalledWith({ type: 'setDate', date: TODAY });
      expect(onPopPanel).toHaveBeenCalledTimes(1);
    });

    it('picking Yesterday sets the date to the day before today', async () => {
      const { onPopPanel } = renderOptionPanel('date');
      await userEvent.click(screen.getByRole('button', { name: 'Yesterday' }));
      expect(dispatch).toHaveBeenCalledWith({ type: 'setDate', date: YESTERDAY });
      expect(onPopPanel).toHaveBeenCalledTimes(1);
    });

    it('Another day reveals a native date input capped at today, which dispatches on change', async () => {
      const { onPopPanel } = renderOptionPanel('date');
      await userEvent.click(screen.getByRole('button', { name: 'Another day' }));

      const dateInput = screen.getByLabelText(/choose a date/i);
      expect(dateInput).toHaveAttribute('type', 'date');
      expect(dateInput).toHaveAttribute('max', TODAY);

      fireEvent.change(dateInput, { target: { value: '2026-01-05' } });
      expect(dispatch).toHaveBeenCalledWith({ type: 'setDate', date: '2026-01-05' });
      expect(onPopPanel).toHaveBeenCalledTimes(1);
    });
  });

  describe('the Notes panel', () => {
    it('binds a textarea to the draft comments and dispatches on change, without popping', async () => {
      setDraft({ comments: 'Nice evening' });
      const { onPopPanel } = renderOptionPanel('notes');
      const textarea = screen.getByLabelText(/notes/i);
      expect(textarea).toHaveValue('Nice evening');

      await userEvent.type(textarea, '!');
      expect(dispatch).toHaveBeenCalledWith({ type: 'setNotes', comments: 'Nice evening!' });
      expect(onPopPanel).not.toHaveBeenCalled();
    });
  });

  describe('the Recommend panel', () => {
    it('toggles addToRecommendations, and reveals only temporarily and name once checked', async () => {
      renderOptionPanel('recommend');
      const checkbox = screen.getByRole('checkbox', { name: /add as a recommendation/i });
      expect(checkbox).not.toBeChecked();
      expect(screen.queryByRole('checkbox', { name: /only temporarily/i })).not.toBeInTheDocument();

      await userEvent.click(checkbox);
      expect(dispatch).toHaveBeenCalledWith({ type: 'setRecommend', addToRecommendations: true });
    });

    it('shows inherited design previews and dispatches only explicit recommendation design overrides', async () => {
      setDraft({
        alcoholTypeId: 1,
        volumeId: 10,
        consumptionTypeId: 40,
        addToRecommendations: true,
        onlyTemporarily: true,
        recommendationName: 'House lager',
      }, { isBeer: true });
      renderOptionPanel('recommend');

      const onlyTemporarily = screen.getByRole('checkbox', { name: /only temporarily/i });
      expect(onlyTemporarily).toBeChecked();
      const nameField = screen.getByRole('textbox', { name: /name/i });
      expect(nameField).toHaveValue('House lager');
      expect(screen.getByLabelText('Color palette')).toHaveValue('');
      expect(screen.getByLabelText('Glassware')).toHaveValue('');
      expect(screen.getByTestId('palette-preview')).toHaveStyle({ background: TEST_PALETTE_BY_NAME.cream.field });

      await userEvent.click(onlyTemporarily);
      expect(dispatch).toHaveBeenCalledWith({ type: 'setOnlyTemporarily', onlyTemporarily: false });

      await userEvent.type(nameField, '!');
      expect(dispatch).toHaveBeenCalledWith({ type: 'setRecommendationName', recommendationName: 'House lager!' });

      await userEvent.selectOptions(screen.getByLabelText('Color palette'), '7');
      await userEvent.selectOptions(screen.getByLabelText('Glassware'), '8');
      expect(dispatch).toHaveBeenCalledWith({ type: 'setRecommendationColorPaletteId', colorPaletteId: 7 });
      expect(dispatch).toHaveBeenCalledWith({ type: 'setRecommendationGlasswareId', glasswareId: 8 });
    });

    it('saves concrete recommendation override IDs without changing the normal drink hierarchy', async () => {
      setDraft({
        alcoholTypeId: 1,
        volumeId: 10,
        consumptionTypeId: 40,
        addToRecommendations: true,
        recommendationColorPaletteId: 7,
        recommendationGlasswareId: 8,
      }, { isBeer: true });
      renderOptionPanel('recommend');

      await userEvent.click(screen.getByRole('button', { name: 'Save drink' }));

      expect(save).toHaveBeenCalledWith(expect.objectContaining({
        payload: expect.objectContaining({
          addToRecommendations: true,
          colorPaletteId: 7,
          glasswareId: 8,
        }),
      }));
    });

    it('previews a selected wine design before its size is selected', () => {
      setDraft({ alcoholTypeId: 2, addToRecommendations: true });
      renderOptionPanel('recommend');

      expect(screen.getByLabelText('Color palette')).toHaveValue('');
      expect(screen.getByLabelText('Glassware')).toHaveValue('');
      expect(screen.getByTestId('palette-preview')).toHaveStyle({ background: TEST_PALETTE_BY_NAME.plum.field });
      expect(screen.getByTestId('glass-wine')).toHaveAttribute('data-glassware-id', '3');
    });
  });
});
