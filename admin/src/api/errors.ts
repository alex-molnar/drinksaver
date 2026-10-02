import axios from 'axios';

export const apiStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

export const apiErrorMessage = (error: unknown, action: 'load' | 'save' | 'delete' = 'save'): string => {
  switch (apiStatus(error)) {
    case 403: return 'You are not authorised to change this catalogue.';
    case 404: return 'This entry is no longer available. The list has been refreshed.';
    case 409:
      if (action === 'delete') return 'This entry is still in use. Resolve its references before deleting it.';
      return 'The server rejected this change. Review the entry and try again.';
    default: return action === 'load' ? 'Could not load this catalogue. Try again.' : 'Could not save this entry. Your changes are still here; try again.';
  }
};
