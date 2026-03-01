from django.urls import path
from apps.workflows import views

urlpatterns = [
    path('workflows/', views.WorkflowListCreateView.as_view(), name='workflow-list'),
    path('workflows/<str:pk>/', views.WorkflowDetailView.as_view(), name='workflow-detail'),
    path('workflows/<str:pk>/trigger/', views.TriggerWorkflowView.as_view(), name='workflow-trigger'),
    path('workflows/<str:pk>/executions/', views.WorkflowExecutionListView.as_view(), name='workflow-executions'),
]
