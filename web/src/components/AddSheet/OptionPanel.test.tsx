import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../../theme/muiTheme';
import OptionPanel from './OptionPanel';
import { useDraft } from '../../drink/useDraft';
import { useCatalogue } from '../../drink/useCatalogue';
import { initialDraftState, type DraftState } from '../../drink/draftReducer';
import { previousIsoDate } from '../../drink/draftFields';
import { drinkingDay } from '../../drink/day';
import type { MenuRowKey } from '../../drink/draftFields';

vi.mock('../../drink/useDraft');
vi.mock('../../drink/useCatalogue');

const mockUseDraft = vi.mocked(useDraft);
const mockUseCatalogue = vi.mocked(useCatalogue);

const TODAY = drinkingDay(new Date());
const YESTERDAY = previousIsoDate(TODAY);

const dispatch = vi.fn();

const CATALOGUE = {
  alcoholTypes: { data: [{ id: 1, name: 'Beer', volumeIds: [] }, { id: 2, name: 'Wine', volumeIds: [] }], isLoading: false },
  volumes: { data: [{ id: 10, name: 'Pint', volume: 0.5 }], isLoading: false },
  subtypes: { data: [{ id: 30, name: 'Red', alcoholTypeId: 2 }], isLoading: false },
  consumptionTypes: { data: [{ id: 40, name: 'Draft' }], isLoading: false },
  brands: { data: [{ id: 50, name: 'Heineken' }], isLoading: false } as { data: { id: number; name: string }[] | undefined; isLoading: boolean },
  beerFlavours: { data: [{ id: 60, name: 'Lager', brandId: 50 }], isLoading: false },
  isBeer: false,
};

const setDraft = (overrides: Partial<DraftState> = {}, catalogueOverrides: Partial<typeof CATALOGUE> = {}) => {
  const draft: DraftState = { ...initialDraftState(TODAY), ...overrides };
  mockUseDraft.mockReturnValue({ draft, dispatch });
  mockUseCatalogue.mockReturnValue({ ...CATALOGUE, ...catalogueOverrides } as unknown as ReturnType<typeof useCatalogue>);
  return draft;
};

const renderOptionPanel = (field: MenuRowKey, onPushPanel = vi.fn(), onPopPanel = vi.fn()) => {
  render(
    <ThemeProvider theme={muiTheme}>
      <OptionPanel field={field} onPushPanel={onPushPanel} onPopPanel={onPopPanel} />
    </ThemeProvider>
  );
  return { onPushPanel, onPopPanel };
};

beforeEach(() => {
  vi.clearAllMocks();
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

    it('offers a New row for a creatable field, and pushes the create panel', async () => {
      const { onPushPanel } = renderOptionPanel('brand');
      await userEvent.click(screen.getByRole('button', { name: 'New brand' }));
      expect(onPushPanel).toHaveBeenCalledWith({ kind: 'create', field: 'brand' });
    });

    it('offers no New row for consumption type, which is not creatable', () => {
      renderOptionPanel('consumptionType');
      expect(screen.queryByRole('button', { name: /^New /i })).not.toBeInTheDocument();
    });

    it('lists subtype options and selects one', async () => {
      const { onPopPanel } = renderOptionPanel('subtype');
      await userEvent.click(screen.getByRole('button', { name: 'Red' }));
      expect(dispatch).toHaveBeenCalledWith({ type: 'select', field: 'subtype', id: 30 });
      expect(onPopPanel).toHaveBeenCalledTimes(1);
    });

    it('lists beer flavour options and selects one', async () => {
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

    it('shows the sub-options once addToRecommendations is already on', async () => {
      setDraft({ addToRecommendations: true, onlyTemporarily: true, recommendationName: 'House lager' });
      renderOptionPanel('recommend');

      const onlyTemporarily = screen.getByRole('checkbox', { name: /only temporarily/i });
      expect(onlyTemporarily).toBeChecked();
      const nameField = screen.getByRole('textbox', { name: /name/i });
      expect(nameField).toHaveValue('House lager');

      await userEvent.click(onlyTemporarily);
      expect(dispatch).toHaveBeenCalledWith({ type: 'setOnlyTemporarily', onlyTemporarily: false });

      await userEvent.type(nameField, '!');
      expect(dispatch).toHaveBeenCalledWith({ type: 'setRecommendationName', recommendationName: 'House lager!' });
    });
  });
});
