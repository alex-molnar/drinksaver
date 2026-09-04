import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import type { ErrorPageState, SuccessPageState, NewVolumePageState, NewSubtypePageState, NewBeerFlavourPageState } from '../types/api';

export const useAppNavigation = () => {
  const navigate = useNavigate();

  const navigateToSuccess = useCallback(
    (message: string) => {
      const state: SuccessPageState = { message };
      navigate('/success', { state });
    },
    [navigate]
  );

  const navigateToError = useCallback(
    (message: string) => {
      const state: ErrorPageState = { message };
      navigate('/error', { state });
    },
    [navigate]
  );

  const navigateToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const navigateToDetailed = useCallback(() => {
    navigate('/detailed');
  }, [navigate]);

  const navigateToNewAlcohol = useCallback(() => {
    navigate('/new-alcohol');
  }, [navigate]);

  const navigateToNewVolume = useCallback(
    (alcoholTypeId: number, alcoholTypeName: string) => {
      const state: NewVolumePageState = { alcoholTypeId, alcoholTypeName };
      navigate('/new-volume', { state });
    },
    [navigate]
  );

  const navigateToNewBrand = useCallback(() => {
    navigate('/new-brand');
  }, [navigate]);

  const navigateToNewSubtype = useCallback(
    (alcoholTypeId: number, alcoholTypeName: string) => {
      const state: NewSubtypePageState = { alcoholTypeId, alcoholTypeName };
      navigate('/new-subtype', { state });
    },
    [navigate]
  );

  const navigateToNewBeerFlavour = useCallback(
    (brandId: number, brandName: string) => {
      const state: NewBeerFlavourPageState = { brandId, brandName };
      navigate('/new-beer-flavour', { state });
    },
    [navigate]
  );

  return {
    navigateToSuccess,
    navigateToError,
    navigateToHome,
    navigateToDetailed,
    navigateToNewAlcohol,
    navigateToNewVolume,
    navigateToNewBrand,
    navigateToNewSubtype,
    navigateToNewBeerFlavour,
  };
};
