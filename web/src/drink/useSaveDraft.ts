import { useCatalogue } from './useCatalogue';
import { useDraft } from './useDraft';
import { useSaveQueue } from './useSaveQueue';
import { isDraftReady, type DraftFieldsCatalogue } from './draftFields';
import { resolveDraftDesign, resolveRecommendationSaveDesign } from './designSelection';

/**
 * A provisional display name for the row the queue and the strip show until the server's
 * composed name replaces it on the next refetch - see the design doc's known gap on this.
 */
const provisionalLabel = (
  catalogue: DraftFieldsCatalogue,
  draft: { alcoholTypeId: number | null; brandId: number | null; subtypeId: number | null },
  isBeer: boolean,
): string => {
  const typeName = catalogue.alcoholTypes?.find((t) => t.id === draft.alcoholTypeId)?.name ?? 'Drink';
  const detail = isBeer
    ? catalogue.brands?.find((b) => b.id === draft.brandId)?.name
    : catalogue.subtypes?.find((s) => s.id === draft.subtypeId)?.name;
  return detail ? `${typeName} (${detail})` : typeName;
};

/**
 * The one save mechanism behind the sheet's Cta button. Shared by `MenuPanel` (its usual home,
 * via `SaveControls`) and the Recommend panel's own shortcut save button, so saving from either
 * place behaves identically - same payload, same queue, same dismissal.
 */
export const useSaveDraft = (onSaved: () => void) => {
  const { draft } = useDraft();
  const catalogue = useCatalogue(draft);
  const { save } = useSaveQueue();

  const draftCatalogue: DraftFieldsCatalogue = {
    alcoholTypes: catalogue.alcoholTypes.data,
    volumes: catalogue.volumes.data,
    subtypes: catalogue.subtypes.data,
    consumptionTypes: catalogue.consumptionTypes.data,
    brands: catalogue.brands.data,
    beerFlavours: catalogue.beerFlavours.data,
  };

  const ready = isDraftReady(draft, catalogue.isBeer);

  // No `!ready` guard here: every caller only wires this to a button that is itself `disabled`
  // whenever `ready` is false, so a browser (and `userEvent.click`, which respects `disabled`)
  // never actually fires this in that state. Guarding it a second time here would be defensive
  // code with no path that could ever exercise it.
  const handleSave = () => {
    const design = resolveRecommendationSaveDesign(
      resolveDraftDesign(draft, draftCatalogue, catalogue.isBeer),
      {
        colorPaletteId: draft.addToRecommendations ? draft.recommendationColorPaletteId : null,
        glasswareId: draft.addToRecommendations ? draft.recommendationGlasswareId : null,
      },
    );
    save({
      label: provisionalLabel(draftCatalogue, draft, catalogue.isBeer),
      date: draft.date,
      alcoholTypeId: draft.alcoholTypeId as number,
      payload: {
        alcoholTypeId: draft.alcoholTypeId as number,
        alcoholSubtypeId: draft.subtypeId ?? undefined,
        alcoholVolumeId: draft.volumeId as number,
        brandId: draft.brandId ?? undefined,
        beerFlavourId: draft.beerFlavourId ?? undefined,
        consumptionTypeId: draft.consumptionTypeId ?? undefined,
        ...design,
        comments: draft.comments.trim() ? draft.comments : undefined,
        quantity: draft.quantity > 1 ? draft.quantity : undefined,
        addToRecommendations: draft.addToRecommendations || undefined,
        onlyTemporarily: draft.addToRecommendations && draft.onlyTemporarily ? true : undefined,
        name: draft.addToRecommendations && draft.recommendationName ? draft.recommendationName : undefined,
      },
    });
    onSaved();
  };

  return { ready, handleSave };
};

export default useSaveDraft;
