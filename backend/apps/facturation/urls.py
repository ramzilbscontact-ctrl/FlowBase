from django.urls import path
from apps.facturation import views

urlpatterns = [
    # Invoices
    path('invoices/', views.InvoiceListCreateView.as_view(), name='invoice-list'),
    path('invoices/<str:pk>/', views.InvoiceDetailView.as_view(), name='invoice-detail'),
    path('invoices/<str:pk>/send/', views.InvoiceSendView.as_view(), name='invoice-send'),
    path('invoices/<str:pk>/stripe/payment-intent/', views.CreateStripePaymentIntentView.as_view(), name='invoice-stripe-pi'),
    # Stripe webhook
    path('stripe/webhook/', views.StripeWebhookView.as_view(), name='stripe-webhook'),
    # Quotes
    path('quotes/', views.QuoteListCreateView.as_view(), name='quote-list'),
    path('quotes/<str:pk>/', views.QuoteDetailView.as_view(), name='quote-detail'),
    path('quotes/<str:pk>/convert/', views.ConvertQuoteToInvoiceView.as_view(), name='quote-convert'),
    # Payments
    path('payments/', views.PaymentListView.as_view(), name='payment-list'),
]
