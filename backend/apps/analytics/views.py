"""
Analytics views — KPIs, deal scores, AI insights, Claude integration.
"""
import logging
from datetime import datetime, timedelta

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.exceptions import NotFound
from django.conf import settings

from apps.analytics.models import DealScore, KPISnapshot, AIInsight
from apps.analytics.serializers import DealScoreSerializer, KPISnapshotSerializer, AIInsightSerializer

logger = logging.getLogger(__name__)


class DashboardSummaryView(APIView):
    """Main analytics dashboard — real-time aggregated KPIs."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.crm.models import Deal, Contact, Company, Task
        from apps.facturation.models import Invoice

        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Pipeline value per stage
        pipeline_value = {}
        for stage in ('lead', 'qualified', 'proposal', 'negotiation', 'won'):
            deals_in_stage = Deal.objects(stage=stage)
            pipeline_value[stage] = {
                'count': deals_in_stage.count(),
                'value': sum(float(d.value) for d in deals_in_stage),
            }

        # Monthly metrics
        monthly_won = Deal.objects(stage='won', closed_at__gte=month_start)
        monthly_revenue = sum(float(d.value) for d in monthly_won)

        return Response({
            'pipeline': pipeline_value,
            'monthly': {
                'deals_won': monthly_won.count(),
                'revenue': monthly_revenue,
                'new_contacts': Contact.objects(created_at__gte=month_start).count(),
                'invoices_paid': Invoice.objects(inv_status='paid', paid_at__gte=month_start).count(),
            },
            'totals': {
                'contacts': Contact.objects.count(),
                'companies': Company.objects.count(),
                'open_deals': Deal.objects(stage__in=['lead', 'qualified', 'proposal', 'negotiation']).count(),
                'overdue_invoices': Invoice.objects(inv_status='overdue').count(),
                'pending_tasks': Task.objects(status__in=['todo', 'in_progress']).count(),
            },
            'generated_at': now.isoformat(),
        })


class DealScoreListView(APIView):
    """List AI scores for open deals."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = DealScore.objects.all()
        risk = request.query_params.get('risk_level')
        if risk:
            qs = qs.filter(risk_level=risk)
        return Response(DealScoreSerializer(qs.limit(100), many=True).data)


class DealScoreDetailView(APIView):
    """Get the AI score for a specific deal."""
    permission_classes = [IsAuthenticated]

    def get(self, request, deal_id):
        score = DealScore.objects(deal_id=deal_id).first()
        if not score:
            raise NotFound('No score found for this deal.')
        return Response(DealScoreSerializer(score).data)


class TriggerScoringView(APIView):
    """Manually trigger deal scoring (for admins / testing)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.analytics.tasks import recalculate_deal_scores
        task = recalculate_deal_scores.delay()
        return Response({'task_id': task.id, 'detail': 'Scoring task queued.'})


class KPISnapshotListView(APIView):
    """List KPI snapshots for charts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'daily')
        limit = min(365, int(request.query_params.get('limit', 30)))
        snapshots = KPISnapshot.objects(period=period).order_by('-snapshot_date').limit(limit)
        return Response(KPISnapshotSerializer(snapshots, many=True).data)


class AIInsightListView(APIView):
    """List AI insights for the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = AIInsight.objects(
            target_user_id=str(request.user.id),
            is_dismissed=False,
        ).order_by('-generated_at').limit(20)
        return Response(AIInsightSerializer(qs, many=True).data)


class DismissInsightView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        insight = AIInsight.objects(id=pk, target_user_id=str(request.user.id)).first()
        if not insight:
            raise NotFound('Insight not found.')
        AIInsight.objects(id=pk).update_one(set__is_dismissed=True)
        return Response({'detail': 'Insight dismissed.'})


class ClaudeAnalysisView(APIView):
    """
    Ask Claude (Anthropic) to analyse a deal or contact and return insights.
    Uses the ANTHROPIC_API_KEY from settings.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import anthropic
        deal_id = request.data.get('deal_id')
        contact_id = request.data.get('contact_id')
        prompt = request.data.get('prompt', '')

        context_parts = []

        if deal_id:
            from apps.crm.models import Deal, Note, Task
            deal = Deal.objects(id=deal_id).first()
            if deal:
                context_parts.append(
                    f'Deal: {deal.title}\nStage: {deal.stage}\n'
                    f'Value: {deal.value} {deal.currency}\n'
                    f'Probability: {deal.probability}%\n'
                    f'AI Score: {deal.ai_score}'
                )
                notes = Note.objects(related_id=deal_id).limit(5)
                if notes:
                    context_parts.append('Recent notes:\n' + '\n'.join(n.content[:200] for n in notes))

        if contact_id:
            from apps.crm.models import Contact
            contact = Contact.objects(id=contact_id).first()
            if contact:
                context_parts.append(
                    f'Contact: {contact.full_name}\nEmail: {contact.email}\n'
                    f'Company: {contact.company_name}\nSource: {contact.source}'
                )

        system_prompt = (
            'You are Radiance ERP AI assistant. You help sales teams in Algeria '
            'to close deals faster, understand their clients better, and improve '
            'their sales performance. Always respond in French. Be concise and actionable.'
        )
        user_message = ''
        if context_parts:
            user_message = 'Contexte:\n' + '\n\n'.join(context_parts)
        if prompt:
            user_message += f'\n\nQuestion: {prompt}'
        if not user_message:
            return Response({'detail': 'Provide deal_id, contact_id, or prompt.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            message = client.messages.create(
                model='claude-opus-4-6',
                max_tokens=1024,
                system=system_prompt,
                messages=[{'role': 'user', 'content': user_message}],
            )
            analysis = message.content[0].text

            # Store as an insight
            insight = AIInsight(
                insight_type='general',
                severity='info',
                title=f'AI Analysis{f" — {deal_id}" if deal_id else ""}',
                body=analysis,
                related_deal_id=deal_id,
                related_contact_id=contact_id,
                target_user_id=str(request.user.id),
            ).save()

            return Response({'analysis': analysis, 'insight_id': str(insight.id)})
        except Exception as exc:
            logger.error('Claude API error: %s', exc)
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


class ForecastView(APIView):
    """Simple revenue forecast based on pipeline value and win probabilities."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.crm.models import Deal
        from apps.analytics.models import DealScore

        open_stages = ['lead', 'qualified', 'proposal', 'negotiation']
        deals = Deal.objects(stage__in=open_stages)

        forecast_data = []
        total_expected = 0.0

        for deal in deals:
            score = DealScore.objects(deal_id=str(deal.id)).first()
            win_prob = score.win_probability if score else (deal.probability / 100)
            expected = float(deal.value) * win_prob
            total_expected += expected
            forecast_data.append({
                'deal_id': str(deal.id),
                'deal_title': deal.title,
                'value': float(deal.value),
                'stage': deal.stage,
                'win_probability': win_prob,
                'expected_value': round(expected, 2),
                'expected_close_date': deal.expected_close_date.isoformat() if deal.expected_close_date else None,
            })

        return Response({
            'total_pipeline_expected': round(total_expected, 2),
            'deals': sorted(forecast_data, key=lambda x: x['expected_value'], reverse=True),
        })
