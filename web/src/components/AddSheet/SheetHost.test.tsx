import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../../theme/muiTheme';
import SheetHost from './SheetHost';
import { SheetPortalContext } from './SheetPortalContext';
import type { AddSheetPanel } from './panels';

/**
 * `SheetHost`'s own job is the Drawer, the panel-stack swap, the Suspense boundary and the strip's
 * portal slot - not the panels' own content, which each have their own test file. Mocking the
 * three panels keeps this file about exactly that, and free of the catalogue/save-queue/draft
 * plumbing the real panels need.
 */
vi.mock('./MenuPanel', () => ({
  default: ({ onPushPanel, onDismiss }: { onPushPanel: (p: AddSheetPanel) => void; onDismiss: () => void }) => (
    <div>
      <span>menu-panel</span>
      <button onClick={() => onPushPanel({ kind: 'option', field: 'alcoholType' })}>push-option</button>
      <button onClick={onDismiss}>dismiss</button>
    </div>
  ),
}));

vi.mock('./OptionPanel', () => ({
  default: ({
    field,
    onPushPanel,
    onPopPanel,
  }: {
    field: string;
    onPushPanel: (p: AddSheetPanel) => void;
    onPopPanel: () => void;
  }) => (
    <div>
      <span>option-panel:{field}</span>
      <button onClick={() => onPushPanel({ kind: 'create', field: 'brand' })}>push-create</button>
      <button onClick={onPopPanel}>pop</button>
    </div>
  ),
}));

vi.mock('./CreatePanel', () => ({
  default: ({ field, onPopPanel }: { field: string; onPopPanel: () => void }) => (
    <div>
      <span>create-panel:{field}</span>
      <button onClick={onPopPanel}>pop</button>
    </div>
  ),
}));

const LocationSearch = () => {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
};

const renderSheetHost = (route: string, setContainer = vi.fn()) => {
  render(
    <ThemeProvider theme={muiTheme}>
      <MemoryRouter initialEntries={[route]}>
        <SheetPortalContext.Provider value={{ container: null, setContainer }}>
          <SheetHost />
          <LocationSearch />
        </SheetPortalContext.Provider>
      </MemoryRouter>
    </ThemeProvider>
  );
  return { setContainer };
};

describe('SheetHost', () => {
  it('renders nothing from the panel stack when the sheet has never been opened', () => {
    renderSheetHost('/');
    expect(screen.queryByText('menu-panel')).not.toBeInTheDocument();
  });

  it('shows the menu panel once ?sheet=add is present', async () => {
    renderSheetHost('/?sheet=add');
    expect(await screen.findByText('menu-panel')).toBeInTheDocument();
  });

  it('swaps to the option panel for the field pushed, then back to the menu on pop', async () => {
    renderSheetHost('/?sheet=add');
    await screen.findByText('menu-panel');

    await userEvent.click(screen.getByText('push-option'));
    expect(await screen.findByText('option-panel:alcoholType')).toBeInTheDocument();
    expect(screen.queryByText('menu-panel')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('pop'));
    expect(await screen.findByText('menu-panel')).toBeInTheDocument();
  });

  it('pushes the create panel over the option panel', async () => {
    renderSheetHost('/?sheet=add');
    await screen.findByText('menu-panel');
    await userEvent.click(screen.getByText('push-option'));
    await screen.findByText('option-panel:alcoholType');

    await userEvent.click(screen.getByText('push-create'));
    expect(await screen.findByText('create-panel:brand')).toBeInTheDocument();
  });

  it('dismissing from the menu clears the sheet param from the URL', async () => {
    renderSheetHost('/?sheet=add');
    await screen.findByText('menu-panel');

    await userEvent.click(screen.getByText('dismiss'));

    await waitFor(() => expect(screen.getByTestId('location-search')).toHaveTextContent(''));
  });

  it('registers the strip container while open, and releases it once closed', async () => {
    const { setContainer } = renderSheetHost('/?sheet=add');
    await screen.findByText('menu-panel');

    await waitFor(() => {
      const node = setContainer.mock.calls.at(-1)?.[0];
      expect(node).toBeInstanceOf(HTMLElement);
    });

    await userEvent.click(screen.getByText('dismiss'));

    await waitFor(() => expect(setContainer.mock.calls.at(-1)?.[0]).toBeNull());
  });

  it('gives the Drawer an accessible label pointing at the panel heading', async () => {
    renderSheetHost('/?sheet=add');
    await screen.findByText('menu-panel');
    expect(document.querySelector('[role="presentation"][aria-labelledby="add-sheet-heading"]')).toBeInTheDocument();
  });
});
