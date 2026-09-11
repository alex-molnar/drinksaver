import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../../theme/muiTheme';
import CreatePanel from './CreatePanel';
import { useDraft } from '../../drink/useDraft';
import { useCreateCatalogueEntry } from '../../drink/useCreateCatalogueEntry';
import { initialDraftState, type DraftState } from '../../drink/draftReducer';
import type { CreatableCatalogueField } from '../../drink/useCreateCatalogueEntry';

vi.mock('../../drink/useDraft');
vi.mock('../../drink/useCreateCatalogueEntry');

const mockUseDraft = vi.mocked(useDraft);
const mockUseCreateCatalogueEntry = vi.mocked(useCreateCatalogueEntry);

const TODAY = '2026-09-10';
const dispatch = vi.fn();
const mutate = vi.fn();

const setDraft = (overrides: Partial<DraftState> = {}) => {
  const draft: DraftState = { ...initialDraftState(TODAY), ...overrides };
  mockUseDraft.mockReturnValue({ draft, dispatch });
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
      <CreatePanel field={field} onPopPanel={onPopPanel} />
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

  it('disables Add and use it until a name is entered', async () => {
    renderCreatePanel('brand');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Corona');
    expect(screen.getByRole('button', { name: /add and use it/i })).toBeEnabled();
  });

  it('creates an alcohol type with the trimmed name', async () => {
    renderCreatePanel('alcoholType');
    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Whiskey');
    await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

    expect(mutate).toHaveBeenCalledWith({ field: 'alcoholType', name: 'Whiskey' });
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

  it('creates a brand with the trimmed name', async () => {
    renderCreatePanel('brand');
    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), '  Corona  ');
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

  it('passes the current brand when creating a beer flavour', async () => {
    setDraft({ brandId: 50 });
    renderCreatePanel('beerFlavour');
    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Radler');
    await userEvent.click(screen.getByRole('button', { name: /add and use it/i }));

    expect(mutate).toHaveBeenCalledWith({ field: 'beerFlavour', name: 'Radler', brandId: 50 });
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
