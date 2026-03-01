from django.urls import path, include
from django.http import JsonResponse


def health(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('api/health/', health),
    # Auth
    path('api/auth/', include('apps.authentication.urls')),
    # CRM
    path('api/', include('apps.crm.urls')),
    # Calendar
    path('api/', include('apps.calendar_app.urls')),
    # WhatsApp
    path('api/whatsapp/', include('apps.whatsapp.urls')),
    # Gmail
    path('api/gmail/', include('apps.gmail_app.urls')),
    # Instagram
    path('api/instagram/', include('apps.instagram.urls')),
    # Facturation + Stripe
    path('api/', include('apps.facturation.urls')),
    # RH & Paie
    path('api/', include('apps.rh_paie.urls')),
    # Comptabilité
    path('api/', include('apps.comptabilite.urls')),
    # Analytics & AI
    path('api/analytics/', include('apps.analytics.urls')),
    # Workflows
    path('api/', include('apps.workflows.urls')),
    # Integrations
    path('api/integrations/', include('apps.integrations.urls')),
    # Global search
    path('api/search/', include('apps.crm.search_urls')),
]
