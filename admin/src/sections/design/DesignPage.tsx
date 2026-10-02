import { useSearchParams } from 'react-router-dom';
import type { SyntheticEvent } from 'react';
import { Tab, Tabs, Typography } from '@mui/material';
import { PaletteSection } from './PaletteSection';
import { GlasswareSection } from './GlasswareSection';
import { ConsumptionTypesSection } from './ConsumptionTypesSection';

const tabs = ['palettes', 'glassware', 'consumption-types'] as const;
type DesignTab = typeof tabs[number];

const selectedTab = (value: string | null): DesignTab =>
  tabs.includes(value as DesignTab) ? value as DesignTab : 'palettes';

export const DesignPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = selectedTab(searchParams.get('tab'));
  const changeTab = (_event: SyntheticEvent, value: DesignTab) => setSearchParams({ tab: value });

  return <section>
    <Typography variant="h1" className="page-title">Design</Typography>
    <Tabs value={tab} onChange={changeTab} aria-label="Design collections" variant="scrollable" scrollButtons="auto">
      <Tab id="design-tab-palettes" aria-controls="design-panel-palettes" value="palettes" label="Palettes" />
      <Tab id="design-tab-glassware" aria-controls="design-panel-glassware" value="glassware" label="Glassware" />
      <Tab id="design-tab-consumption-types" aria-controls="design-panel-consumption-types" value="consumption-types" label="Consumption types" />
    </Tabs>
    <div id={`design-panel-${tab}`} role="tabpanel" aria-labelledby={`design-tab-${tab}`} tabIndex={0}>
      {tab === 'palettes' && <PaletteSection />}
      {tab === 'glassware' && <GlasswareSection />}
      {tab === 'consumption-types' && <ConsumptionTypesSection />}
    </div>
  </section>;
};

export default DesignPage;
