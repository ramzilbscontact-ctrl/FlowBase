import api from './axios'

export const rhAPI = {
  // Departments
  getDepartments:  (p)     => api.get('/api/departments/',           { params: p }),
  createDepartment:(d)     => api.post('/api/departments/',          d),

  // Employees
  getEmployees:    (p)     => api.get('/api/employees/',             { params: p }),
  getEmployee:     (id)    => api.get(`/api/employees/${id}/`),
  createEmployee:  (d)     => api.post('/api/employees/',            d),
  updateEmployee:  (id, d) => api.patch(`/api/employees/${id}/`,    d),

  // Payslips
  getPayslips:     (p)     => api.get('/api/payslips/',              { params: p }),
  createPayslip:   (d)     => api.post('/api/payslips/',             d),
  validatePayslip: (id)    => api.post(`/api/payslips/${id}/validate/`),

  // Leaves
  getLeaves:       (p)     => api.get('/api/leaves/',                { params: p }),
  createLeave:     (d)     => api.post('/api/leaves/',               d),
  reviewLeave:     (id, d) => api.post(`/api/leaves/${id}/review/`, d),
}
