import api from './axios'

export const calendarAPI = {
  getEvents:    (p)     => api.get('/api/events/',          { params: p }),
  getUpcoming:  ()      => api.get('/api/events/upcoming/'),
  getEvent:     (id)    => api.get(`/api/events/${id}/`),
  createEvent:  (d)     => api.post('/api/events/',         d),
  updateEvent:  (id, d) => api.patch(`/api/events/${id}/`, d),
  deleteEvent:  (id)    => api.delete(`/api/events/${id}/`),
}
