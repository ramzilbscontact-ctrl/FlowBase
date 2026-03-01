import api from './axios'

export const crmAPI = {
  // Dashboard
  dashboard: () => api.get('/api/crm/dashboard/'),

  // Contacts
  getContacts:    (p) => api.get('/api/contacts/',      { params: p }),
  getContact:     (id) => api.get(`/api/contacts/${id}/`),
  createContact:  (d)  => api.post('/api/contacts/',    d),
  updateContact:  (id, d) => api.patch(`/api/contacts/${id}/`, d),
  deleteContact:  (id) => api.delete(`/api/contacts/${id}/`),

  // Companies
  getCompanies:   (p) => api.get('/api/companies/',     { params: p }),
  getCompany:     (id) => api.get(`/api/companies/${id}/`),
  createCompany:  (d)  => api.post('/api/companies/',   d),
  updateCompany:  (id, d) => api.patch(`/api/companies/${id}/`, d),
  deleteCompany:  (id) => api.delete(`/api/companies/${id}/`),

  // Pipelines
  getPipelines:   () => api.get('/api/pipelines/'),
  createPipeline: (d) => api.post('/api/pipelines/', d),

  // Deals
  getDeals:    (p)     => api.get('/api/deals/',       { params: p }),
  getDeal:     (id)    => api.get(`/api/deals/${id}/`),
  createDeal:  (d)     => api.post('/api/deals/',      d),
  updateDeal:  (id, d) => api.patch(`/api/deals/${id}/`, d),
  deleteDeal:  (id)    => api.delete(`/api/deals/${id}/`),

  // Tasks
  getTasks:   (p)     => api.get('/api/tasks/',        { params: p }),
  createTask: (d)     => api.post('/api/tasks/',       d),
  updateTask: (id, d) => api.patch(`/api/tasks/${id}/`, d),
  deleteTask: (id)    => api.delete(`/api/tasks/${id}/`),

  // Notes
  getNotes:   (p) => api.get('/api/notes/', { params: p }),
  createNote: (d) => api.post('/api/notes/', d),
}
