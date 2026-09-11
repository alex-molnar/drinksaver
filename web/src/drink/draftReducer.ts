/**
 * The add-draft's state and cascade rules, ported from `DetailedPage.handleAlcoholTypeChange`
 * and `handleBrandChange` (now deleted). Pure, like `saveQueueReducer.ts` and `day.ts`: nothing
 * here reads the clock or the network, so `reset`'s caller supplies "today" rather than this
 * module computing it, which is what keeps the cascade unit testable without mounting anything.
 *
 * Two cascades, unchanged from the form they replace:
 * - Choosing a drink type invalidates everything that depended on the old one: subtype, volume,
 *   brand, flavour and consumption type.
 * - Choosing a brand invalidates the flavour, since flavours are scoped to a brand.
 *
 * `select` and `adoptCreated` share the cascade rule on purpose: picking an existing brand and
 * creating-then-adopting a new one both mean "the brand is now this", so a flavour chosen under
 * the old brand cannot survive either path. They stay two action types rather than one because
 * `useCreateCatalogueEntry` and `OptionPanel` dispatch them from different moments (a network
 * response versus a plain tap) and collapsing them would blur that in the devtools log.
 */
/** The `?sheet=` value the add-sheet answers to. Shared by `useSheet` callers and `DraftProvider`
 *  (which resets the draft whenever this sheet transitions from closed to open) so the two never
 *  drift onto different literal strings. */
export const ADD_SHEET_ID = 'add';

export type DraftFieldKey = 'alcoholType' | 'volume' | 'subtype' | 'consumptionType' | 'brand' | 'beerFlavour';

export interface DraftState {
  readonly alcoholTypeId: number | null;
  readonly volumeId: number | null;
  readonly subtypeId: number | null;
  readonly consumptionTypeId: number | null;
  readonly brandId: number | null;
  readonly beerFlavourId: number | null;
  /** `YYYY-MM-DD`. Defaults to the drinking day the draft was created on; see `day.ts`. */
  readonly date: string;
  readonly quantity: number;
  readonly comments: string;
  readonly addToRecommendations: boolean;
  readonly onlyTemporarily: boolean;
  readonly recommendationName: string;
}

/** The stepper's floor. Unchanged by this PR. */
export const QUANTITY_MIN = 1;
/** The stepper's new ceiling, raised from 9. See the design doc's batch-save defect writeup:
 *  the backend now returns every row a batch save creates, which is what makes undo on a larger
 *  batch safe enough to allow one in the first place. */
export const QUANTITY_MAX = 24;

const clampQuantity = (quantity: number): number => Math.min(QUANTITY_MAX, Math.max(QUANTITY_MIN, quantity));

/** A fresh draft for `today` (a drinking day, `YYYY-MM-DD`). The sheet calls this once per open;
 *  see `DraftProvider.tsx`. */
export const initialDraftState = (today: string): DraftState => ({
  alcoholTypeId: null,
  volumeId: null,
  subtypeId: null,
  consumptionTypeId: null,
  brandId: null,
  beerFlavourId: null,
  date: today,
  quantity: QUANTITY_MIN,
  comments: '',
  addToRecommendations: false,
  onlyTemporarily: false,
  recommendationName: '',
});

export type DraftAction =
  | { type: 'select'; field: DraftFieldKey; id: number }
  | { type: 'adoptCreated'; field: DraftFieldKey; id: number }
  | { type: 'setQuantity'; quantity: number }
  | { type: 'setDate'; date: string }
  | { type: 'setNotes'; comments: string }
  | { type: 'setRecommend'; addToRecommendations: boolean }
  | { type: 'setOnlyTemporarily'; onlyTemporarily: boolean }
  | { type: 'setRecommendationName'; recommendationName: string }
  | { type: 'reset'; today: string };

/** The one cascade rule, shared by `select` and `adoptCreated`: see the module doc. */
const applyFieldChoice = (state: DraftState, field: DraftFieldKey, id: number): DraftState => {
  switch (field) {
    case 'alcoholType':
      return {
        ...state,
        alcoholTypeId: id,
        subtypeId: null,
        volumeId: null,
        brandId: null,
        beerFlavourId: null,
        consumptionTypeId: null,
      };
    case 'volume':
      return { ...state, volumeId: id };
    case 'subtype':
      return { ...state, subtypeId: id };
    case 'consumptionType':
      return { ...state, consumptionTypeId: id };
    case 'brand':
      return { ...state, brandId: id, beerFlavourId: null };
    case 'beerFlavour':
      return { ...state, beerFlavourId: id };
  }
};

export const reduceDraft = (state: DraftState, action: DraftAction): DraftState => {
  switch (action.type) {
    case 'select':
      return applyFieldChoice(state, action.field, action.id);

    case 'adoptCreated':
      return applyFieldChoice(state, action.field, action.id);

    case 'setQuantity':
      return { ...state, quantity: clampQuantity(action.quantity) };

    case 'setDate':
      return { ...state, date: action.date };

    case 'setNotes':
      return { ...state, comments: action.comments };

    case 'setRecommend':
      // Turning the recommendation off drops its sub-fields too, so a name typed under an
      // earlier "on" cannot resurface silently if the checkbox is ticked again later.
      return action.addToRecommendations
        ? { ...state, addToRecommendations: true }
        : { ...state, addToRecommendations: false, onlyTemporarily: false, recommendationName: '' };

    case 'setOnlyTemporarily':
      return { ...state, onlyTemporarily: action.onlyTemporarily };

    case 'setRecommendationName':
      return { ...state, recommendationName: action.recommendationName };

    case 'reset':
      return initialDraftState(action.today);

    default:
      return state;
  }
};
