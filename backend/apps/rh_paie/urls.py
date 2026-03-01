from django.urls import path
from apps.rh_paie import views

urlpatterns = [
    # Departments
    path('departments/', views.DepartmentListCreateView.as_view(), name='dept-list'),
    path('departments/<str:pk>/', views.DepartmentDetailView.as_view(), name='dept-detail'),
    # Employees
    path('employees/', views.EmployeeListCreateView.as_view(), name='employee-list'),
    path('employees/<str:pk>/', views.EmployeeDetailView.as_view(), name='employee-detail'),
    # Payslips
    path('payslips/', views.PayslipListCreateView.as_view(), name='payslip-list'),
    path('payslips/<str:pk>/', views.PayslipDetailView.as_view(), name='payslip-detail'),
    path('payslips/<str:pk>/validate/', views.ValidatePayslipView.as_view(), name='payslip-validate'),
    # Leave requests
    path('leaves/', views.LeaveRequestListCreateView.as_view(), name='leave-list'),
    path('leaves/<str:pk>/', views.LeaveRequestDetailView.as_view(), name='leave-detail'),
    path('leaves/<str:pk>/review/', views.ReviewLeaveRequestView.as_view(), name='leave-review'),
]
