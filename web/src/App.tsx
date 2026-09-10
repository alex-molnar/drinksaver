import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { KeycloakProvider, ProtectedRoute } from './auth';
import AppErrorBoundary from './components/AppErrorBoundary';
import { SaveQueueProvider } from './drink/SaveQueueProvider';

/**
 * Routes are loaded on demand. Every page pulls in MUI, so a single eager bundle
 * meant the first paint waited on the five "new entry" forms and the history screen
 * as well as the screen actually being opened.
 */
const QuickSavePage = lazy(() => import('./pages/QuickSavePage'));
const DetailedPage = lazy(() => import('./pages/DetailedPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const NewAlcoholPage = lazy(() => import('./pages/NewAlcoholPage'));
const NewVolumePage = lazy(() => import('./pages/NewVolumePage'));
const NewBeerBrandPage = lazy(() => import('./pages/NewBeerBrandPage'));
const NewSubtypePage = lazy(() => import('./pages/NewSubtypePage'));
const NewBeerFlavourPage = lazy(() => import('./pages/NewBeerFlavourPage'));

const RouteFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress aria-label="Loading page" />
  </Box>
);

function App() {
  // Keyed by pathname so navigating elsewhere remounts the boundary, clearing a stuck error
  // rather than leaving the fallback on screen for the rest of the session.
  const location = useLocation();

  return (
    <KeycloakProvider>
      <ProtectedRoute>
        {/*
          Above the error boundary and Routes, deliberately: AppErrorBoundary remounts on every
          navigation (it is keyed on the pathname, to clear a stuck error), and the queue and its
          undo strip must survive a route change rather than being torn down by it. The strip
          itself portals to document.body regardless, but the timers, mutations and lifecycle
          listeners that drive it live in this provider and must not be remounted mid-window.
        */}
        <SaveQueueProvider>
          <AppErrorBoundary key={location.pathname}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<QuickSavePage />} />
                <Route path="/detailed" element={<DetailedPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/success" element={<SuccessPage />} />
                <Route path="/error" element={<ErrorPage />} />
                <Route path="/new-alcohol" element={<NewAlcoholPage />} />
                <Route path="/new-volume" element={<NewVolumePage />} />
                <Route path="/new-brand" element={<NewBeerBrandPage />} />
                <Route path="/new-subtype" element={<NewSubtypePage />} />
                <Route path="/new-beer-flavour" element={<NewBeerFlavourPage />} />
              </Routes>
            </Suspense>
          </AppErrorBoundary>
        </SaveQueueProvider>
      </ProtectedRoute>
    </KeycloakProvider>
  );
}

export default App;
