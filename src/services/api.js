import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// Jobs API
export const jobsAPI = {
  getAll: () => api.get('/jobs'),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (jobData) => api.post('/jobs', jobData),
  cancel: (id) => api.post(`/jobs/${id}/cancel`),
  delete: (id) => api.delete(`/jobs/${id}`),
}

// Nodes API
export const nodesAPI = {
  getAll: () => api.get('/nodes'),
  getById: (id) => api.get(`/nodes/${id}`),
  add: (nodeData) => api.post('/nodes', nodeData),
  update: (id, nodeData) => api.put(`/nodes/${id}`, nodeData),
  delete: (id) => api.delete(`/nodes/${id}`),
  test: (id) => api.post(`/nodes/${id}/test`),
  verify: (id) => api.post(`/nodes/${id}/verify`),
}

export default api

