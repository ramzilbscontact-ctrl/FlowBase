"""
Analytics Celery tasks.
"""
import logging
from datetime import datetime, timedelta

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='apps.analytics.tasks.recalculate_deal_scores')
def recalculate_deal_scores():
    """
    Runs every 24 hours (via CELERY_BEAT_SCHEDULE in settings).
    Re-scores all open deals using a simple heuristic model.
    The score is written back to both DealScore and Deal.ai_score.

    Returns a summary dict.
    """
    from apps.crm.models import Deal, Task, Note
    from apps.analytics.models import DealScore

    open_stages = ['lead', 'qualified', 'proposal', 'negotiation']
    open_deals = Deal.objects(stage__in=open_stages)
    scored = 0
    now = datetime.utcnow()

    for deal in open_deals:
        deal_id = str(deal.id)

        # ── Gather features ────────────────────────────────────────────
        days_in_stage = max(
            0,
            (now - (deal.updated_at or deal.created_at)).days,
        )
        tasks_done = Task.objects(related_id=deal_id, status='done').count()
        notes_count = Note.objects(related_id=deal_id).count()

        # ── Simple heuristic scoring ────────────────────────────────────
        # Base probability per stage
        stage_base = {
            'lead': 0.10,
            'qualified': 0.25,
            'proposal': 0.50,
            'negotiation': 0.70,
        }.get(deal.stage, 0.15)

        # Boost for activity (tasks done, notes)
        activity_boost = min(0.20, (tasks_done * 0.03) + (notes_count * 0.01))

        # Decay for age (stale deals are less likely to close)
        age_penalty = min(0.15, days_in_stage * 0.002)

        win_prob = max(0.01, min(0.99, stage_base + activity_boost - age_penalty))
        revenue_forecast = float(deal.value) * win_prob

        risk_level = 'low'
        if win_prob < 0.25 or days_in_stage > 60:
            risk_level = 'high'
        elif win_prob < 0.50 or days_in_stage > 30:
            risk_level = 'medium'

        # ── Upsert DealScore ───────────────────────────────────────────
        DealScore.objects(deal_id=deal_id).update_one(
            set__deal_title=deal.title,
            set__stage=deal.stage,
            set__value=float(deal.value),
            set__days_in_stage=days_in_stage,
            set__tasks_completed=tasks_done,
            set__notes_count=notes_count,
            set__win_probability=round(win_prob, 4),
            set__revenue_forecast=round(revenue_forecast, 2),
            set__risk_level=risk_level,
            set__scored_at=now,
            upsert=True,
        )

        # ── Write score back to Deal ───────────────────────────────────
        Deal.objects(id=deal.id).update_one(
            set__ai_score=round(win_prob, 4),
            set__ai_score_updated_at=now,
        )
        scored += 1

    logger.info('recalculate_deal_scores: scored %d deals.', scored)
    return {'scored': scored, 'run_at': now.isoformat()}


@shared_task(name='apps.analytics.tasks.generate_daily_kpi_snapshot')
def generate_daily_kpi_snapshot():
    """
    Create a KPI snapshot for today.  Can be added to CELERY_BEAT_SCHEDULE.
    """
    from apps.analytics.models import KPISnapshot
    from apps.crm.models import Deal, Contact, Company, Task
    from apps.facturation.models import Invoice
    from apps.whatsapp.models import WhatsAppMessage

    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)

    new_deals = Deal.objects(created_at__gte=yesterday).count()
    deals_won = Deal.objects(stage='won', closed_at__gte=yesterday).count()
    deals_lost = Deal.objects(stage='lost', closed_at__gte=yesterday).count()
    new_contacts = Contact.objects(created_at__gte=yesterday).count()
    new_companies = Company.objects(created_at__gte=yesterday).count()
    tasks_done = Task.objects(status='done', completed_at__gte=yesterday).count()

    paid_invoices = Invoice.objects(inv_status='paid', paid_at__gte=yesterday)
    revenue = sum(float(i.total) for i in paid_invoices)
    invoices_issued = Invoice.objects(created_at__gte=yesterday).count()
    invoices_overdue = Invoice.objects(inv_status='overdue').count()

    wa_sent = WhatsAppMessage.objects(direction='outbound', timestamp__gte=yesterday).count()
    wa_recv = WhatsAppMessage.objects(direction='inbound', timestamp__gte=yesterday).count()

    total_deals = deals_won + deals_lost
    win_rate = (deals_won / total_deals) if total_deals > 0 else 0

    KPISnapshot(
        period='daily',
        snapshot_date=yesterday,
        new_deals=new_deals,
        deals_won=deals_won,
        deals_lost=deals_lost,
        revenue_generated=revenue,
        win_rate=win_rate,
        new_contacts=new_contacts,
        new_companies=new_companies,
        tasks_completed=tasks_done,
        whatsapp_messages_sent=wa_sent,
        whatsapp_messages_received=wa_recv,
        invoices_issued=invoices_issued,
        invoices_paid=paid_invoices.count(),
        invoices_overdue=invoices_overdue,
        total_billed=revenue,
    ).save()

    logger.info('generate_daily_kpi_snapshot: snapshot created for %s.', yesterday.date())
    return {'snapshot_date': str(yesterday.date())}
