import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { KeycloakProvider, ProtectedRoute } from './auth';
import AppErrorBoundary from './components/AppErrorBoundary';
import { SaveQueueProvider } from './drink/SaveQueueProvider';
import { DraftProvider } from './drink/DraftProvider';
import SheetHost from './components/AddSheet';
import { SheetPortalContext } from './components/AddSheet/SheetPortalContext';

/**
 * Routes are loaded on demand. Every page pulls in MUI, so a single eager bundle
 * meant the first paint waited on the screen actually being opened as well as the one
 * requested.
 */
const QuickSavePage = lazy(() => import('./pages/QuickSavePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));

const RouteFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress aria-label="Loading page" />
  </Box>
);

function App() {
  // Keyed by pathname so navigating elsewhere remounts the boundary, clearing a stuck error
  // rather than leaving the fallback on screen for the rest of the session.
  const location = useLocation();

  // The add sheet's own container while it is open, or null: see `SheetPortalContext.ts`'s
  // module doc. Held here, not in `SheetHost` or `SaveQueueProvider`, because it is the one
  // ancestor of both: `SaveQueueProvider` renders `TapeStrip` above this state, and `SheetHost`
  // (which sets it) is mounted inside `SaveQueueProvider`'s own children, so neither on its own
  // can hold state the other one also needs to read.
  const [stripContainer, setStripContainer] = useState<HTMLElement | null>(null);

  return (
    <KeycloakProvider>
      <ProtectedRoute>
        <SheetPortalContext.Provider value={{ container: stripContainer, setContainer: setStripContainer }}>
          {/*
            Above the error boundary and Routes, deliberately: AppErrorBoundary remounts on every
            navigation (it is keyed on the pathname, to clear a stuck error), and the queue and its
            undo strip must survive a route change rather than being torn down by it. The strip
            itself portals to document.body (or into the add sheet, while one is open) regardless,
            but the timers, mutations and lifecycle listeners that drive it live in this provider
            and must not be remounted mid-window.

            `DraftProvider` mounts here too, above `Routes` and next to `SaveQueueProvider`: the
            sheet host below is a sibling of `Routes` so it can render over any route, and React
            context does not flow sideways, so a provider mounted inside a route element would
            leave the sheet reading a null context and throwing on first open. See the design doc,
            "Sheets are routes".
          */}
          <SaveQueueProvider>
            <DraftProvider>
              <AppErrorBoundary key={location.pathname}>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<QuickSavePage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    {/* Retired routes. No bookmark or stale tab should land on a blank page. */}
                    <Route path="/detailed" element={<Navigate to="/?sheet=add" replace />} />
                    <Route path="/success" element={<Navigate to="/" replace />} />
                    <Route path="/error" element={<Navigate to="/" replace />} />
                    <Route path="/new-alcohol" element={<Navigate to="/" replace />} />
                    <Route path="/new-volume" element={<Navigate to="/" replace />} />
                    <Route path="/new-brand" element={<Navigate to="/" replace />} />
                    <Route path="/new-subtype" element={<Navigate to="/" replace />} />
                    <Route path="/new-beer-flavour" element={<Navigate to="/" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  {/*
                    A sibling of Routes, not a child of any one route, so it renders over whichever
                    page is mounted. It carries its own Suspense inside `SheetHost` itself: as a
                    sibling of Routes it sits inside this same outer boundary, so without one of
                    its own a lazily loaded panel would blank this whole screen while its chunk
                    loads, rather than only the sheet.
                  */}
                  <SheetHost />
                </Suspense>
              </AppErrorBoundary>
            </DraftProvider>
          </SaveQueueProvider>
        </SheetPortalContext.Provider>
      </ProtectedRoute>
    </KeycloakProvider>
  );
}

export default App;
