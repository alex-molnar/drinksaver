import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import RecommendationsPage from './RecommendationsPage';
import { getRecommendations, editRecommendations, deleteRecommendation } from '../api/endpoints';
import type { Recommendation } from '../types/api';

const ME = '423c91e4-491f-4f82-aba6-3c982857e0e4';
const ADMIN = '00000000-0000-0000-0000-000000000001';

vi.mock('../api/endpoints');
vi.mock('../auth', () => ({ useAuth: () => ({ userId: ME, logout: vi.fn() }) }));
// AppFrame reads the day's drink count; this page does not care about it.
vi.mock('../drink/useDrinksForDate', () => ({ useDrinksForDate: () => ({ status: 'loading' }) }));

const rec = (over: Partial<Recommendation>) =>
  ({ id: 1, userId: ME, name: 'x', alcoholTypeId: 1, alcoholVolumeId: 1, ...over }) as Recommendation;

const LIST = [
  rec({ id: 7, name: 'HJ pint' }),
  rec({ id: 3, name: 'Office Chouffe' }),
  { ...rec({ name: 'Whisky' }), id: undefined } as unknown as Recommendation, // history-derived
  rec({ id: 99, userId: ADMIN, name: 'Heineken Pint' }),                      // admin default
];

/** Open the editor, replace the text, commit with the checkmark. */
const rename = async (from: string, to: string) => {
  await userEvent.click(screen.getByRole('button', { name: `Rename ${from}` }));
  await userEvent.clear(screen.getByRole('textbox'));
  await userEvent.type(screen.getByRole('textbox'), to);
  await userEvent.click(screen.getByRole('button', { name: `Save name for ${from}` }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRecommendations).mockResolvedValue(LIST);
  vi.mocked(editRecommendations).mockResolvedValue(undefined);
  vi.mocked(deleteRecommendation).mockResolvedValue(undefined);
});

describe('RecommendationsPage', () => {
  it('names the screen in the header', async () => {
    renderWithProviders(<RecommendationsPage />);

    expect(await screen.findByRole('heading', { name: 'Recommendations' })).toBeInTheDocument();
  });

  it("lists only this user's saved rows", async () => {
    renderWithProviders(<RecommendationsPage />);

    expect(await screen.findByText('HJ pint')).toBeInTheDocument();
    expect(screen.getByText('Office Chouffe')).toBeInTheDocument();
    expect(screen.queryByText('Whisky')).not.toBeInTheDocument();
    expect(screen.queryByText('Heineken Pint')).not.toBeInTheDocument();
  });

  it('offers no Save or Cancel until something actually changes', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('shows Save and Cancel once a name is renamed, and shows the new name', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    await rename('HJ pint', 'Home pint');

    expect(screen.getByText('Home pint')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('Cancel puts the original name back and clears the bar', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    await rename('HJ pint', 'Home pint');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('HJ pint')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(editRecommendations).not.toHaveBeenCalled();
  });

  it('a delete crosses the row off at once and sends nothing yet', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={10_000} />);
    await screen.findByText('HJ pint');

    await userEvent.click(screen.getByRole('button', { name: 'Delete HJ pint' }));

    expect(await screen.findByText('HJ pint deleted.')).toBeInTheDocument();
    expect(deleteRecommendation).not.toHaveBeenCalled();
  });

  it('undoing a delete puts the row back and never sends', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={10_000} />);
    await screen.findByText('HJ pint');

    await userEvent.click(screen.getByRole('button', { name: 'Delete HJ pint' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));

    expect(screen.getByRole('button', { name: 'Rename HJ pint' })).toBeInTheDocument();
    expect(deleteRecommendation).not.toHaveBeenCalled();
  });

  it('a delete does not raise Save or Cancel', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={10_000} />);
    await screen.findByText('HJ pint');

    await userEvent.click(screen.getByRole('button', { name: 'Delete HJ pint' }));

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('Save offers undo first and sends the PATCH only when the window closes', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={30} />);
    await screen.findByText('HJ pint');

    await rename('HJ pint', 'Home pint');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Generous timeouts: this is a real ~30ms setTimeout racing real CI scheduling, not a fake
    // clock, so a contended runner can occasionally overshoot the default 1000ms budget.
    expect(await screen.findByText('Changes saved.', {}, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(
      () =>
        expect(editRecommendations).toHaveBeenCalledWith([
          { id: 7, name: 'Home pint' },
          { id: 3, name: 'Office Chouffe' },
        ]),
      { timeout: 5000 },
    );
  });

  it('undoing a Save puts the list back and sends nothing', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={10_000} />);
    await screen.findByText('HJ pint');

    await rename('HJ pint', 'Home pint');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByText('HJ pint')).toBeInTheDocument();
    expect(editRecommendations).not.toHaveBeenCalled();
  });

  it('a PATCH never carries a row the user deleted, and the DELETE goes first', async () => {
    renderWithProviders(<RecommendationsPage undoWindowMs={30} />);
    await screen.findByText('HJ pint');

    await userEvent.click(screen.getByRole('button', { name: 'Delete HJ pint' }));
    await rename('Office Chouffe', 'Chouffe');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(editRecommendations).toHaveBeenCalledWith([{ id: 3, name: 'Chouffe' }]));
    expect(deleteRecommendation).toHaveBeenCalledWith(7);
  });

  it('surfaces a failed save with a retry rather than pretending it landed', async () => {
    vi.mocked(editRecommendations).mockRejectedValue(new Error('boom'));
    renderWithProviders(<RecommendationsPage undoWindowMs={20} />);
    await screen.findByText('HJ pint');

    await rename('HJ pint', 'Home pint');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your changes.");
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('reorders with the keyboard and shows Save and Cancel', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Reorder HJ pint' }).focus();
    await user.keyboard('{ }');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ }');

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('reverts an in-progress rename on Escape without committing', async () => {
    renderWithProviders(<RecommendationsPage />);
    await screen.findByText('HJ pint');

    await userEvent.click(screen.getByRole('button', { name: 'Rename HJ pint' }));
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.type(screen.getByRole('textbox'), 'Home pint{Escape}');

    expect(screen.getByText('HJ pint')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('reports a failed list read rather than showing an empty list', async () => {
    vi.mocked(getRecommendations).mockRejectedValue(new Error('boom'));
    renderWithProviders(<RecommendationsPage />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/nothing saved yet/i)).not.toBeInTheDocument();
  });
});
