from django.urls import path
from apps.integrations import views

urlpatterns = [
    # Google OAuth
    path('google/connect/', views.GoogleConnectView.as_view(), name='google-connect'),
    path('google/callback/', views.GoogleCallbackView.as_view(), name='google-callback'),
    path('google/disconnect/', views.GoogleDisconnectView.as_view(), name='google-disconnect'),
    path('google/status/', views.GoogleTokenStatusView.as_view(), name='google-status'),
    # Integration configs
    path('configs/', views.IntegrationConfigListView.as_view(), name='integration-config-list'),
    path('configs/<str:pk>/', views.IntegrationConfigDetailView.as_view(), name='integration-config-detail'),
    # Status overview
    path('status/', views.IntegrationStatusOverviewView.as_view(), name='integration-status'),
]
