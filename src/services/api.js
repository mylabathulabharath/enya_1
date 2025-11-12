import axios from 'axios'

// Use environment variable for API URL, fallback to /api for local development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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
  refresh: (id) => api.post(`/jobs/${id}/refresh`),
  getOutputs: (id) => api.get(`/jobs/${id}/outputs`),
  downloadOutput: (id, filename) => {
    // Always use the download endpoint without filename
    // The server will find and download the first (and only) file
    const url = filename 
      ? `/api/jobs/${id}/download/${encodeURIComponent(filename)}`
      : `/api/jobs/${id}/download`
    window.open(url, '_blank')
  },
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

