import api from './axios'

export const authAPI = {
  login:   (data) => api.post('/api/auth/login/',   data),
  refresh: (data) => api.post('/api/auth/refresh/', data),
  me:      ()     => api.get('/api/auth/me/'),
}
