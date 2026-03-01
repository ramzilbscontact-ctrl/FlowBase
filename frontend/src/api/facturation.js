import api from './axios'

export const facturationAPI = {
  // Invoices
  getInvoices:   (p)     => api.get('/api/invoices/',          { params: p }),
  getInvoice:    (id)    => api.get(`/api/invoices/${id}/`),
  createInvoice: (d)     => api.post('/api/invoices/',         d),
  updateInvoice: (id, d) => api.patch(`/api/invoices/${id}/`, d),
  sendInvoice:   (id)    => api.post(`/api/invoices/${id}/send/`),
  deleteInvoice: (id)    => api.delete(`/api/invoices/${id}/`),

  // Quotes
  getQuotes:   (p)     => api.get('/api/quotes/',          { params: p }),
  getQuote:    (id)    => api.get(`/api/quotes/${id}/`),
  createQuote: (d)     => api.post('/api/quotes/',         d),
  updateQuote: (id, d) => api.patch(`/api/quotes/${id}/`, d),
  convertQuote:(id)    => api.post(`/api/quotes/${id}/convert/`),
  deleteQuote: (id)    => api.delete(`/api/quotes/${id}/`),

  // Payments
  getPayments: (p) => api.get('/api/payments/', { params: p }),
}
