import { Navigate, Route, Routes } from 'react-router-dom';
import { Typography } from '@mui/material';
import { Workspace } from './components/Workspace';

const Page = ({ title }: { title: string }) => <Typography variant="h1" className="page-title">{title}</Typography>;

export const App = () => (
  <Workspace>
    <Routes>
      <Route path="/" element={<Navigate to="/recommendations" replace />} />
      <Route path="/recommendations" element={<Page title="Recommendations" />} />
      <Route path="/alcohol-types" element={<Page title="Alcohol types" />} />
      <Route path="/alcohol-types/:typeId/subtypes" element={<Page title="Alcohol subtypes" />} />
      <Route path="/beer-brands" element={<Page title="Beer brands" />} />
      <Route path="/beer-brands/:brandId/flavours" element={<Page title="Beer flavours" />} />
      <Route path="/user-defined" element={<Page title="User-defined catalogue" />} />
      <Route path="/design" element={<Page title="Design" />} />
      <Route path="*" element={<Page title="Page not found" />} />
    </Routes>
  </Workspace>
);

export default App;
