import { fetchApi } from '../utils/api';

export const authService = {
  login: async (username, password) => {
    return await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  signup: async (username, password, role) => {
    return await fetchApi('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  },
};
