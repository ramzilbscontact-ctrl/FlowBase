"""
Celery tasks for the facturation app.
"""
import logging
from datetime import datetime

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='apps.facturation.tasks.check_overdue_invoices')
def check_overdue_invoices():
    """
    Runs every hour (via CELERY_BEAT_SCHEDULE in settings).
    Marks invoices as 'overdue' when their due_date has passed
    and they have not been paid yet.
    Returns a summary dict for logging.
    """
    from apps.facturation.models import Invoice

    now = datetime.utcnow()
    result = Invoice.objects(
        inv_status='sent',
        due_date__lt=now,
    ).update(set__inv_status='overdue', set__updated_at=now)

    logger.info('check_overdue_invoices: marked %d invoice(s) as overdue.', result)
    return {'overdue_count': result, 'checked_at': now.isoformat()}


@shared_task(name='apps.facturation.tasks.send_payment_reminder')
def send_payment_reminder(invoice_id: str):
    """
    Send an email reminder for a specific overdue invoice.
    Can be triggered manually or chained from check_overdue_invoices.
    """
    from apps.facturation.models import Invoice
    from django.core.mail import send_mail
    from django.conf import settings

    invoice = Invoice.objects(id=invoice_id).first()
    if not invoice:
        logger.warning('send_payment_reminder: Invoice %s not found.', invoice_id)
        return

    if not invoice.client_email:
        logger.info('send_payment_reminder: Invoice %s has no client email.', invoice_id)
        return

    try:
        send_mail(
            subject=f'Rappel de paiement — {invoice.number}',
            message=(
                f'Bonjour {invoice.client_name},\n\n'
                f'Votre facture {invoice.number} d\'un montant de '
                f'{invoice.total} {invoice.currency} est en retard de paiement.\n\n'
                f'Merci de régulariser votre situation.\n\n'
                f'Cordialement,\nRadiance ERP'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invoice.client_email],
            fail_silently=False,
        )
        logger.info('Payment reminder sent for invoice %s to %s', invoice.number, invoice.client_email)
    except Exception as exc:
        logger.error('Failed to send payment reminder for %s: %s', invoice_id, exc)
