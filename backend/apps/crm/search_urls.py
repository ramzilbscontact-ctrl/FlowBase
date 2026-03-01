"""
Global search endpoint — searches across contacts, companies, deals.
Mounted at /api/search/ in config/urls.py.
"""
from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.crm.models import Contact, Company, Deal
from apps.crm.serializers import ContactSerializer, CompanySerializer, DealSerializer


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        limit = min(20, int(request.query_params.get('limit', 10)))

        if not q or len(q) < 2:
            return Response({'query': q, 'results': []})

        results = []

        # Contacts
        contacts = Contact.objects.filter(
            __raw__={
                '$or': [
                    {'first_name': {'$regex': q, '$options': 'i'}},
                    {'last_name': {'$regex': q, '$options': 'i'}},
                    {'email': {'$regex': q, '$options': 'i'}},
                    {'company_name': {'$regex': q, '$options': 'i'}},
                ]
            }
        ).limit(limit)
        for c in contacts:
            results.append({
                'type': 'contact',
                'id': str(c.id),
                'label': c.full_name,
                'sublabel': c.email or c.company_name or '',
                'data': ContactSerializer(c).data,
            })

        # Companies
        companies = Company.objects.filter(
            __raw__={'name': {'$regex': q, '$options': 'i'}}
        ).limit(limit)
        for co in companies:
            results.append({
                'type': 'company',
                'id': str(co.id),
                'label': co.name,
                'sublabel': co.industry or '',
                'data': CompanySerializer(co).data,
            })

        # Deals
        deals = Deal.objects.filter(
            __raw__={'title': {'$regex': q, '$options': 'i'}}
        ).limit(limit)
        for d in deals:
            results.append({
                'type': 'deal',
                'id': str(d.id),
                'label': d.title,
                'sublabel': d.stage,
                'data': DealSerializer(d).data,
            })

        return Response({'query': q, 'count': len(results), 'results': results})


urlpatterns = [
    path('', GlobalSearchView.as_view(), name='global-search'),
]
