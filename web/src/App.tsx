import { Routes, Route } from 'react-router-dom';
import { KeycloakProvider, ProtectedRoute } from './auth';
import IndexPage from './pages/IndexPage';
import DetailedPage from './pages/DetailedPage';
import HistoryPage from './pages/HistoryPage';
import SuccessPage from './pages/SuccessPage';
import ErrorPage from './pages/ErrorPage';
import NewAlcoholPage from './pages/NewAlcoholPage';
import NewVolumePage from './pages/NewVolumePage';
import NewBeerBrandPage from './pages/NewBeerBrandPage';
import NewSubtypePage from './pages/NewSubtypePage';
import NewBeerFlavourPage from './pages/NewBeerFlavourPage';

function App() {
  return (
    <KeycloakProvider>
      <ProtectedRoute>
        <Routes>
          <Route path="/" element={<IndexPage />} />
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
      </ProtectedRoute>
    </KeycloakProvider>
  );
}

export default App;
