import { fetchApi } from '../utils/api';

export const complaintService = {
  submitComplaint: async (formData) => {
    // formData should be an instance of FormData
    return await fetchApi('/complaints', {
      method: 'POST',
      body: formData,
    });
  },

  getComplaint: async (reportId) => {
    return await fetchApi(`/complaints/${reportId}`, {
      method: 'GET',
    });
  },

  listComplaints: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.department) params.append('department', filters.department);
    if (filters.priority_class) params.append('priority_class', filters.priority_class);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.skip) params.append('skip', filters.skip);

    const queryString = params.toString();
    const endpoint = `/complaints${queryString ? `?${queryString}` : ''}`;
    return await fetchApi(endpoint, { method: 'GET' });
  },

  upvoteComplaint: async (reportId) => {
    return await fetchApi(`/complaints/${reportId}/upvote`, {
      method: 'POST',
    });
  },

  adminOverride: async (reportId, payload) => {
    return await fetchApi(`/complaints/${reportId}/override`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  resolveComplaint: async (reportId) => {
    return await fetchApi(`/complaints/${reportId}/resolve`, {
      method: 'PATCH',
    });
  },
};
