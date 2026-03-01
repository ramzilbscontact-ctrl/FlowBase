from django.urls import path
from apps.crm import views

urlpatterns = [
    # Dashboard
    path('crm/dashboard/', views.CRMDashboardView.as_view(), name='crm-dashboard'),

    # Contacts
    path('contacts/', views.ContactListCreateView.as_view(), name='contact-list'),
    path('contacts/<str:pk>/', views.ContactDetailView.as_view(), name='contact-detail'),

    # Companies
    path('companies/', views.CompanyListCreateView.as_view(), name='company-list'),
    path('companies/<str:pk>/', views.CompanyDetailView.as_view(), name='company-detail'),

    # Pipelines
    path('pipelines/', views.PipelineListCreateView.as_view(), name='pipeline-list'),
    path('pipelines/<str:pk>/', views.PipelineDetailView.as_view(), name='pipeline-detail'),

    # Deals
    path('deals/', views.DealListCreateView.as_view(), name='deal-list'),
    path('deals/<str:pk>/', views.DealDetailView.as_view(), name='deal-detail'),

    # Tasks
    path('tasks/', views.TaskListCreateView.as_view(), name='task-list'),
    path('tasks/<str:pk>/', views.TaskDetailView.as_view(), name='task-detail'),

    # Notes
    path('notes/', views.NoteListCreateView.as_view(), name='note-list'),
    path('notes/<str:pk>/', views.NoteDetailView.as_view(), name='note-detail'),
]
