import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../../theme/muiTheme';
import CreatePanel from './CreatePanel';
import { useDraft } from '../../drink/useDraft';
import { useCatalogue } from '../../drink/useCatalogue';
import { useCreateCatalogueEntry } from '../../drink/useCreateCatalogueEntry';
import { initialDraftState, type DraftState } from '../../drink/draftReducer';
import type { CreatableCatalogueField } from '../../drink/useCreateCatalogueEntry';
import { TEST_PALETTE_BY_NAME } from '../../test/designFixtures';
import { TestDesignProvider } from '../../test/TestDesignProvider';

vi.mock('../../drink/useDraft');
vi.mock('../../drink/useCatalogue');
vi.mock('../../drink/useCreateCatalogueEntry');

const mockUseDraft = vi.mocked(useDraft);
const mockUseCatalogue = vi.mocked(useCatalogue);
const mockUseCreateCatalogueEntry = vi.mocked(useCreateCatalogueEntry);

const TODAY = '2026-09-10';
const dispatch = vi.fn();
const mutate = vi.fn();

/** A catalogue where every query has already resolved, so a test only has to override the one
 *  field it cares about. */
const READY_CATALOGUE = {
  alcoholTypes: {
    data: [
      { id: 1, name: 'Beer', volumeIds: [], colorPaletteId: 1, glasswareId: 1 },
      { id: 2, name: 'Wine', volumeIds: [], colorPaletteId: 6, glasswareId: 3 },
      { id: 4, name: 'Beer', volumeIds: [], colorPaletteId: 7, glasswareId: 2 },
    ],
    isLoading: false,
  },
  volumes: { data: [], isLoading: false },
  subtypes: { data: [], isLoading: false },
  consumptionTypes: { data: [], isLoading: false },
  brands: {
    data: [
      { id: 50, name: 'Heineken', colorPaletteId: 1 },
      { id: 51, name: 'House lager', colorPaletteId: null },
    ],
    isLoading: false,
  },
  beerFlavours: { data: [], isLoading: false },
  isBeer: false,
} as unknown as ReturnType<typeof useCatalogue>;

const setDraft = (overrides: Partial<DraftState> = {}, catalogueOverrides: Partial<typeof READY_CATALOGUE> = {}) => {
  const draft: DraftState = { ...initialDraftState(TODAY), ...overrides };
  mockUseDraft.mockReturnValue({ draft, dispatch });
  mockUseCatalogue.mockReturnValue({ ...READY_CATALOGUE, ...catalogueOverrides });
  return draft;
};

let capturedOnAdopted: (() => void) | undefined;

const setMutationState = (overrides: Partial<ReturnType<typeof useCreateCatalogueEntry>> = {}) => {
  mockUseCreateCatalogueEntry.mockImplementation((onAdopted) => {
    capturedOnAdopted = onAdopted;
    return {
      mutate,
      isPending: false,
      isError: false,
      ...overrides,
    } as ReturnType<typeof useCreateCatalogueEntry>;
  });
};

const renderCreatePanel = (field: CreatableCatalogueField, onPopPanel = vi.fn()) => {
  render(
    <ThemeProvider theme={muiTheme}>
      <TestDesignProvider>
        <CreatePanel field={field} onPopPanel={onPopPanel} />
      </TestDesignProvider>
    </ThemeProvider>
  );
  return { onPopPanel };
};

beforeEach(() => {
  vi.clearAllMocks();
  capturedOnAdopted = undefined;
  setDraft();
  setMutationState();
});

describe('CreatePanel', () => {
  it('renders a heading naming the field, and focuses it on mount', () => {
    renderCreatePanel('brand');
    const heading = screen.getByRole('heading', { name: 'New brand' });
    expect(heading.tagName).toBe('H2');
    expect(heading).toHaveFocus();
  });

  it('titles the panel for each creatable field', () => {
    renderCreatePanel('alcoholType');
    expect(screen.getByRole('heading', { name: 'New drink type' })).toBeInTheDocument();
  });

  it('calls onPopPanel when Back is pressed', async () => {
    const { onPopPanel } = renderCreatePanel('brand');
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onPopPanel).toHaveBeenCalledTimes(1);
  });

  it('disables Add and use it until every required input is entered', async () => {
    renderCreatePanel('brand');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Corona');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Color palette'), '3');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeEnabled();
  });

  it('requires real palette and glassware choices before creating an alcohol type', async () => {
    renderCreatePanel('alcoholType');
    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Whiskey');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Color palette'), '3');
    await userEvent.selectOptions(screen.getByLabelText('Glassware'), '4');
    await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

    expect(mutate).toHaveBeenCalledWith({
      field: 'alcoholType',
      name: 'Whiskey',
      colorPaletteId: 3,
      glasswareId: 4,
    });
  });

  it('ignores a form submission while the control is not ready to submit', () => {
    renderCreatePanel('brand');
    // Submitted directly, bypassing the disabled button: a defensive second check on the form
    // itself, in case a browser's Enter-to-submit behaviour ever reaches it regardless of the
    // button's own disabled state.
    const form = screen.getByRole('button', { name: /add and use it/i }).closest('form') as HTMLFormElement;
    fireEvent.submit(form);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('requires a palette for a brand without a selected beer type', async () => {
    renderCreatePanel('brand');
    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), '  Corona  ');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Color palette'), '3');
    await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

    expect(mutate).toHaveBeenCalledWith({ field: 'brand', name: 'Corona', colorPaletteId: 3 });
  });

  it('requires a palette for a non-structural type even when it is named Beer', async () => {
    setDraft({ alcoholTypeId: 1 });
    renderCreatePanel('brand');
    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Corona');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeDisabled();
  });

  it('keeps a structural beer brand palette-only and inherits ID 4\'s palette', async () => {
    setDraft({ alcoholTypeId: 4 });
    renderCreatePanel('brand');
    expect(screen.getByLabelText('Color palette')).toHaveValue('');
    expect(screen.queryByLabelText('Glassware')).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Corona');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

    expect(mutate).toHaveBeenCalledWith({ field: 'brand', name: 'Corona' });
  });

  it('passes the current alcohol type when creating a subtype', async () => {
    setDraft({ alcoholTypeId: 2 });
    renderCreatePanel('subtype');
    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Single Malt');
    await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

    expect(mutate).toHaveBeenCalledWith({ field: 'subtype', name: 'Single Malt', alcoholTypeId: 2 });
  });

  it('keeps subtype defaults inherited until explicit palette and glassware choices are made', async () => {
    setDraft({ alcoholTypeId: 2 });
    renderCreatePanel('subtype');
    expect(screen.getByLabelText('Color palette')).toHaveValue('');
    expect(screen.getByLabelText('Glassware')).toHaveValue('');

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Single Malt');
    await userEvent.selectOptions(screen.getByLabelText('Color palette'), '3');
    await userEvent.selectOptions(screen.getByLabelText('Glassware'), '4');
    await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

    expect(mutate).toHaveBeenCalledWith({
      field: 'subtype',
      name: 'Single Malt',
      alcoholTypeId: 2,
      colorPaletteId: 3,
      glasswareId: 4,
    });
  });

  it('names the alcohol type a new subtype is being added for, in the heading', () => {
    setDraft({ alcoholTypeId: 2 });
    renderCreatePanel('subtype');
    expect(screen.getByRole('heading', { name: 'New subtype for Wine' })).toBeInTheDocument();
  });

  it('colours the alcohol type name to match its own identity swatch, not the rest of the heading', () => {
    setDraft({ alcoholTypeId: 2 });
    renderCreatePanel('subtype');
    expect(screen.getByText('Wine')).toHaveStyle({ color: TEST_PALETTE_BY_NAME.plum.field });
  });

  it('passes the current brand when creating a beer flavour', async () => {
    setDraft({ alcoholTypeId: 4, brandId: 50 });
    renderCreatePanel('beerFlavour');
    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Radler');
    await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

    expect(mutate).toHaveBeenCalledWith({ field: 'beerFlavour', name: 'Radler', brandId: 50 });
  });

  it('requires a flavour palette without a selected structural beer parent, even when its brand has a palette', async () => {
    setDraft({ alcoholTypeId: 1, brandId: 50 });
    renderCreatePanel('beerFlavour');
    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Radler');

    expect(screen.getByRole('button', { name: /add and use it/i })).toBeDisabled();
  });

  it('uses a palette-only selector for beer flavour overrides', async () => {
    setDraft({ brandId: 50 });
    renderCreatePanel('beerFlavour');
    expect(screen.queryByLabelText('Glassware')).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Radler');
    await userEvent.selectOptions(screen.getByLabelText('Color palette'), '7');
    await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

    expect(mutate).toHaveBeenCalledWith({ field: 'beerFlavour', name: 'Radler', brandId: 50, colorPaletteId: 7 });
  });

  it('names the brand a new beer flavour is being added for, in the heading', () => {
    setDraft({ brandId: 50 });
    renderCreatePanel('beerFlavour');
    expect(screen.getByRole('heading', { name: 'New flavour for Heineken' })).toBeInTheDocument();
  });

  it("colours the brand name to match its own identity swatch when it has one", () => {
    setDraft({ alcoholTypeId: 1, brandId: 50 });
    renderCreatePanel('beerFlavour');
    expect(screen.getByText('Heineken')).toHaveStyle({ color: TEST_PALETTE_BY_NAME.green.field });
  });

  it("falls back to the alcohol type's colour for a brand with none of its own", () => {
    setDraft({ alcoholTypeId: 2, brandId: 51 });
    renderCreatePanel('beerFlavour');
    expect(screen.getByText('House lager')).toHaveStyle({ color: TEST_PALETTE_BY_NAME.plum.field });
  });

  it('shows no parent context for a field with none, such as brand', () => {
    renderCreatePanel('brand');
    expect(screen.getByRole('heading', { name: 'New brand' })).toBeInTheDocument();
  });

  describe('creating a volume', () => {
    it('additionally requires a litres value before enabling the submit control', async () => {
      setDraft({ alcoholTypeId: 2 });
      renderCreatePanel('volume');
      const submit = screen.getByRole('button', { name: /add and use it/i });
      await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Shot');
      expect(submit).toBeDisabled();

      await userEvent.type(screen.getByLabelText(/litres/i), '0.04');
      expect(submit).toBeEnabled();
    });

    it('creates a volume with the alcohol type and the litres value', async () => {
      setDraft({ alcoholTypeId: 2 });
      renderCreatePanel('volume');
      await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Shot');
      await userEvent.type(screen.getByLabelText(/litres/i), '0.04');
      await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

      expect(mutate).toHaveBeenCalledWith({ field: 'volume', name: 'Shot', volume: 0.04, alcoholTypeId: 2 });
    });
  });

  it('disables the submit control while the mutation is pending', () => {
    setMutationState({ isPending: true });
    renderCreatePanel('brand');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeDisabled();
  });

  it('shows an error message when the mutation fails', () => {
    setMutationState({ isError: true });
    renderCreatePanel('brand');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('wires onAdopted through to onPopPanel, so a successful create returns to the menu', () => {
    const { onPopPanel } = renderCreatePanel('brand');
    expect(capturedOnAdopted).toBeDefined();
    capturedOnAdopted?.();
    expect(onPopPanel).toHaveBeenCalledTimes(1);
  });
});
