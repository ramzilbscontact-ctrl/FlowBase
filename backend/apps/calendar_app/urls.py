from django.urls import path
from apps.calendar_app import views

urlpatterns = [
    path('events/', views.EventListCreateView.as_view(), name='event-list'),
    path('events/upcoming/', views.UpcomingEventsView.as_view(), name='event-upcoming'),
    path('events/<str:pk>/', views.EventDetailView.as_view(), name='event-detail'),
]
