import { fetchApi } from '../utils/api';

export const statsService = {
  getStats: async () => {
    return await fetchApi('/stats', {
      method: 'GET',
    });
  },
  
  triggerMonitoring: async () => {
    return await fetchApi('/monitoring/check', {
      method: 'POST',
    });
  }
};
