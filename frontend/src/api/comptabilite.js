import api from './axios'

export const comptaAPI = {
  getAccounts:     (p)     => api.get('/api/accounts/',            { params: p }),
  createAccount:   (d)     => api.post('/api/accounts/',           d),
  updateAccount:   (id, d) => api.patch(`/api/accounts/${id}/`,   d),

  getJournal:      (p)     => api.get('/api/journal/',             { params: p }),
  createJournal:   (d)     => api.post('/api/journal/',            d),
  postJournal:     (id)    => api.post(`/api/journal/${id}/post/`),

  getTransactions: (p)     => api.get('/api/transactions/',        { params: p }),

  balanceSheet:    ()      => api.get('/api/reports/balance-sheet/'),
  profitLoss:      ()      => api.get('/api/reports/profit-loss/'),
}
