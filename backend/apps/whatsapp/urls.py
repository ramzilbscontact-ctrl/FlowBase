from django.urls import path
from apps.whatsapp import views

urlpatterns = [
    path('webhook/', views.WhatsAppWebhookView.as_view(), name='wa-webhook'),
    path('conversations/', views.ConversationListView.as_view(), name='wa-conversations'),
    path('conversations/<str:phone>/messages/', views.MessageListView.as_view(), name='wa-messages'),
    path('send/', views.SendMessageView.as_view(), name='wa-send'),
]
