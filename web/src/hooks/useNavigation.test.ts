import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import { useAppNavigation } from './useNavigation';

vi.mock('react-router-dom');

const mockNavigate = vi.fn();

beforeEach(() => {
  vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  vi.clearAllMocks();
});

describe('useAppNavigation', () => {
  it('navigateToSuccess navigates to /success with message state', () => {
    const { result } = renderHook(() => useAppNavigation());

    result.current.navigateToSuccess('Beer saved!');

    expect(mockNavigate).toHaveBeenCalledWith('/success', {
      state: { message: 'Beer saved!' },
    });
  });

  it('navigateToError navigates to /error with message state', () => {
    const { result } = renderHook(() => useAppNavigation());

    result.current.navigateToError('Failed to save');

    expect(mockNavigate).toHaveBeenCalledWith('/error', {
      state: { message: 'Failed to save' },
    });
  });

  it('navigateToHome navigates to /', () => {
    const { result } = renderHook(() => useAppNavigation());

    result.current.navigateToHome();

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigateToDetailed navigates to /detailed', () => {
    const { result } = renderHook(() => useAppNavigation());

    result.current.navigateToDetailed();

    expect(mockNavigate).toHaveBeenCalledWith('/detailed');
  });

  it('navigateToNewAlcohol navigates to /new-alcohol', () => {
    const { result } = renderHook(() => useAppNavigation());

    result.current.navigateToNewAlcohol();

    expect(mockNavigate).toHaveBeenCalledWith('/new-alcohol');
  });

  it('navigateToNewVolume navigates to /new-volume with state', () => {
    const { result } = renderHook(() => useAppNavigation());

    result.current.navigateToNewVolume(7, 'Whiskey');

    expect(mockNavigate).toHaveBeenCalledWith('/new-volume', {
      state: { alcoholTypeId: 7, alcoholTypeName: 'Whiskey' },
    });
  });

  it('navigateToNewBrand navigates to /new-brand', () => {
    const { result } = renderHook(() => useAppNavigation());

    result.current.navigateToNewBrand();

    expect(mockNavigate).toHaveBeenCalledWith('/new-brand');
  });

  it('navigateToNewSubtype navigates to /new-subtype with state', () => {
    const { result } = renderHook(() => useAppNavigation());

    result.current.navigateToNewSubtype(4, 'Beer');

    expect(mockNavigate).toHaveBeenCalledWith('/new-subtype', {
      state: { alcoholTypeId: 4, alcoholTypeName: 'Beer' },
    });
  });

  it('navigateToNewBeerFlavour navigates to /new-beer-flavour with state', () => {
    const { result } = renderHook(() => useAppNavigation());

    result.current.navigateToNewBeerFlavour(50, 'Heineken');

    expect(mockNavigate).toHaveBeenCalledWith('/new-beer-flavour', {
      state: { brandId: 50, brandName: 'Heineken' },
    });
  });
});
