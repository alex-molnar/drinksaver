import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import HistoryPage from './HistoryPage';
import { getSavedDrinksByDate, deleteDrinksByIds } from '../api/endpoints';
import type { EditableDrink } from '../types/api';

vi.mock('../api/endpoints');
vi.mock('../auth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

const mockGetSavedDrinksByDate = vi.mocked(getSavedDrinksByDate);
const mockDeleteDrinksByIds = vi.mocked(deleteDrinksByIds);

const mockDrinks: EditableDrink[] = [
  {
    id: 1,
    name: 'Heineken',
    alcoholTypeId: 4,
  },
  {
    id: 2,
    name: 'Red Wine',
    alcoholTypeId: 30,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSavedDrinksByDate.mockResolvedValue(mockDrinks);
  mockDeleteDrinksByIds.mockResolvedValue(2);
});

describe('HistoryPage', () => {
  it('renders a spinner while drinks are loading', () => {
    mockGetSavedDrinksByDate.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<HistoryPage />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the error state when the query rejects', async () => {
    mockGetSavedDrinksByDate.mockRejectedValue(new Error('API error'));

    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load drinks/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no drinks are recorded for the date', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue([]);

    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/no drinks recorded for this date/i)).toBeInTheDocument();
    });
  });

  it('fetches drinks for the selected date', async () => {
    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(mockGetSavedDrinksByDate).toHaveBeenCalled();
    });

    // Should have called with today's date
    const calls = mockGetSavedDrinksByDate.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
  });

  it('renders one card per drink', async () => {
    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/heineken/i)).toBeInTheDocument();
      expect(screen.getByText(/red wine/i)).toBeInTheDocument();
    });
  });

  it('changes the date and refetches drinks', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue(mockDrinks);

    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/heineken/i)).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-01-02');

    await waitFor(() => {
      const calls = mockGetSavedDrinksByDate.mock.calls;
      expect(calls.some(call => call[0] === '2026-01-02')).toBe(true);
    });
  });

  it('allows selecting individual drinks and shows delete FAB', async () => {
    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/heineken/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);

    // Delete FAB should appear when drinks are selected
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument();
    });
  });

  it('deletes selected drinks when delete FAB is clicked', async () => {
    mockDeleteDrinksByIds.mockResolvedValue(1);
    mockGetSavedDrinksByDate.mockResolvedValueOnce(mockDrinks).mockResolvedValueOnce([mockDrinks[1]]);

    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/heineken/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]); // Select first drink

    const deleteButton = screen.getByRole('button', { name: /delete selected/i });
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteDrinksByIds).toHaveBeenCalledWith([1]);
    });
  });

  it('deletes a single drink when delete icon is clicked', async () => {
    mockDeleteDrinksByIds.mockResolvedValue(1);
    mockGetSavedDrinksByDate.mockResolvedValueOnce(mockDrinks).mockResolvedValueOnce([mockDrinks[1]]);

    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/heineken/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    const singleDeleteButton = deleteButtons.find(btn => {
      const icon = within(btn).queryByTestId('DeleteIcon');
      return icon !== null;
    });

    if (singleDeleteButton) {
      await userEvent.click(singleDeleteButton);
    }

    await waitFor(() => {
      expect(mockDeleteDrinksByIds).toHaveBeenCalled();
    });
  });

  it('sends the selected drink ids when deleting', async () => {
    mockDeleteDrinksByIds.mockResolvedValue(2);
    mockGetSavedDrinksByDate.mockResolvedValueOnce(mockDrinks).mockResolvedValueOnce([]);

    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/heineken/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]); // First drink
    await userEvent.click(checkboxes[1]); // Second drink

    const deleteButton = screen.getByRole('button', { name: /delete selected/i });
    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteDrinksByIds).toHaveBeenCalledWith([1, 2]);
    });
  });

  it('clears selection when date changes', async () => {
    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/heineken/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]); // Select a drink

    // Should show delete FAB
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /delete selected/i })).toBeInTheDocument();
    });

    // Change date
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, '2026-01-02');

    // Delete FAB should be hidden (selection cleared)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /delete selected/i })).not.toBeInTheDocument();
    });
  });
});
