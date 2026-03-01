from django.urls import path
from apps.gmail_app import views

urlpatterns = [
    path('inbox/', views.InboxView.as_view(), name='gmail-inbox'),
    path('threads/', views.ThreadListView.as_view(), name='gmail-threads'),
    path('threads/<str:thread_id>/', views.ThreadDetailView.as_view(), name='gmail-thread-detail'),
    path('sync/', views.SyncInboxView.as_view(), name='gmail-sync'),
    path('compose/', views.ComposeEmailView.as_view(), name='gmail-compose'),
    path('messages/<str:pk>/read/', views.MarkReadView.as_view(), name='gmail-mark-read'),
]
