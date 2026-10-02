import { Navigate, Route, Routes } from 'react-router-dom';
import { Typography } from '@mui/material';
import { Workspace } from './components/Workspace';
import { AlcoholTypesPage } from './sections/alcohol/AlcoholTypesPage';
import { AlcoholSubtypesPage } from './sections/alcohol/AlcoholSubtypesPage';
import { BeerBrandsPage } from './sections/beer/BeerBrandsPage';
import { BeerFlavoursPage } from './sections/beer/BeerFlavoursPage';
import { DesignPage } from './sections/design/DesignPage';

const Page = ({ title }: { title: string }) => <Typography variant="h1" className="page-title">{title}</Typography>;

export const App = () => (
  <Workspace>
    <Routes>
      <Route path="/" element={<Navigate to="/recommendations" replace />} />
      <Route path="/recommendations" element={<Page title="Recommendations" />} />
      <Route path="/alcohol-types" element={<AlcoholTypesPage />} />
      <Route path="/alcohol-types/:typeId/subtypes" element={<AlcoholSubtypesPage />} />
      <Route path="/beer-brands" element={<BeerBrandsPage />} />
      <Route path="/beer-brands/:brandId/flavours" element={<BeerFlavoursPage />} />
      <Route path="/user-defined" element={<Page title="User-defined catalogue" />} />
      <Route path="/design" element={<DesignPage />} />
      <Route path="*" element={<Page title="Page not found" />} />
    </Routes>
  </Workspace>
);

export default App;
