"""
Facturation views — invoices, quotes, payments, Stripe webhooks, PDF generation.
"""
import json
import logging
import hashlib
import hmac
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.http import HttpResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.facturation.models import Invoice, Quote, Payment
from apps.facturation.serializers import InvoiceSerializer, QuoteSerializer, PaymentSerializer

logger = logging.getLogger(__name__)


def _auto_invoice_number():
    """Generate sequential invoice number: INV-YYYY-NNNN."""
    year = datetime.utcnow().year
    count = Invoice.objects(number__startswith=f'INV-{year}').count() + 1
    return f'INV-{year}-{count:04d}'


def _auto_quote_number():
    year = datetime.utcnow().year
    count = Quote.objects(number__startswith=f'QTE-{year}').count() + 1
    return f'QTE-{year}-{count:04d}'


# ─── Invoice views ────────────────────────────────────────────────────────────

class InvoiceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Invoice.objects.all()
        inv_status = request.query_params.get('status')
        if inv_status:
            qs = qs.filter(inv_status=inv_status)
        client_id = request.query_params.get('client_id')
        if client_id:
            qs = qs.filter(client_id=client_id)
        return Response(InvoiceSerializer(qs.limit(100), many=True).data)

    def post(self, request):
        data = request.data.copy()
        data.setdefault('number', _auto_invoice_number())
        data.setdefault('created_by_id', str(request.user.id))
        s = InvoiceSerializer(data=data)
        s.is_valid(raise_exception=True)
        invoice = s.create(s.validated_data)
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class InvoiceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Invoice.objects(id=pk).first()
        if not obj:
            raise NotFound('Invoice not found.')
        return obj

    def get(self, request, pk):
        return Response(InvoiceSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = InvoiceSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        obj = s.update(obj, s.validated_data)
        return Response(InvoiceSerializer(obj).data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if obj.inv_status not in ('draft', 'cancelled'):
            return Response(
                {'detail': 'Only draft or cancelled invoices can be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvoiceSendView(APIView):
    """Mark invoice as 'sent' and email it to the client."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        invoice = Invoice.objects(id=pk).first()
        if not invoice:
            raise NotFound('Invoice not found.')
        Invoice.objects(id=pk).update_one(
            set__inv_status='sent',
            set__updated_at=datetime.utcnow(),
        )
        # Send email if client_email is set
        if invoice.client_email:
            from django.core.mail import send_mail
            try:
                send_mail(
                    subject=f'Facture {invoice.number}',
                    message=f'Veuillez trouver ci-joint votre facture {invoice.number} de {invoice.total} {invoice.currency}.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[invoice.client_email],
                    fail_silently=True,
                )
            except Exception as exc:
                logger.warning('Failed to send invoice email: %s', exc)
        return Response({'detail': 'Invoice sent.', 'inv_status': 'sent'})


class CreateStripePaymentIntentView(APIView):
    """Create a Stripe PaymentIntent for an invoice."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        invoice = Invoice.objects(id=pk).first()
        if not invoice:
            raise NotFound('Invoice not found.')
        if invoice.inv_status == 'paid':
            return Response({'detail': 'Invoice already paid.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            # Amount in smallest currency unit (centimes for DZD/EUR)
            amount_cents = int(Decimal(str(invoice.total)) * 100)
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=invoice.currency.lower(),
                metadata={'invoice_id': str(invoice.id), 'invoice_number': invoice.number},
            )
            Invoice.objects(id=pk).update_one(
                set__stripe_payment_intent_id=intent.id
            )
            return Response({'client_secret': intent.client_secret, 'payment_intent_id': intent.id})
        except Exception as exc:
            logger.error('Stripe error: %s', exc)
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(View):
    """Stripe webhook receiver — updates invoice/payment status on events."""

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET

        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except stripe.error.SignatureVerificationError:
            return HttpResponse('Invalid signature', status=400)
        except Exception as exc:
            return HttpResponse(str(exc), status=400)

        event_type = event['type']
        data_object = event['data']['object']

        if event_type == 'payment_intent.succeeded':
            self._handle_payment_success(data_object)
        elif event_type == 'payment_intent.payment_failed':
            self._handle_payment_failure(data_object)
        elif event_type == 'charge.refunded':
            self._handle_refund(data_object)

        return HttpResponse('OK', status=200)

    def _handle_payment_success(self, pi):
        now = datetime.utcnow()
        invoice = Invoice.objects(stripe_payment_intent_id=pi['id']).first()
        if invoice:
            Invoice.objects(id=invoice.id).update_one(
                set__inv_status='paid',
                set__paid_at=now,
                set__updated_at=now,
            )
            Payment(
                invoice=invoice,
                invoice_number=invoice.number,
                amount=Decimal(pi['amount']) / 100,
                currency=pi['currency'].upper(),
                payment_method='stripe',
                pay_status='completed',
                stripe_payment_intent_id=pi['id'],
                paid_at=now,
            ).save()

    def _handle_payment_failure(self, pi):
        Payment.objects(stripe_payment_intent_id=pi['id']).update_one(
            set__pay_status='failed'
        )

    def _handle_refund(self, charge):
        pi_id = charge.get('payment_intent')
        if pi_id:
            invoice = Invoice.objects(stripe_payment_intent_id=pi_id).first()
            if invoice:
                Invoice.objects(id=invoice.id).update_one(
                    set__inv_status='refunded',
                    set__updated_at=datetime.utcnow(),
                )


# ─── Quote views ─────────────────────────────────────────────────────────────

class QuoteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Quote.objects.all()
        qs_status = request.query_params.get('status')
        if qs_status:
            qs = qs.filter(quote_status=qs_status)
        return Response(QuoteSerializer(qs.limit(100), many=True).data)

    def post(self, request):
        data = request.data.copy()
        data.setdefault('number', _auto_quote_number())
        data.setdefault('created_by_id', str(request.user.id))
        s = QuoteSerializer(data=data)
        s.is_valid(raise_exception=True)
        quote = s.create(s.validated_data)
        return Response(QuoteSerializer(quote).data, status=status.HTTP_201_CREATED)


class QuoteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Quote.objects(id=pk).first()
        if not obj:
            raise NotFound('Quote not found.')
        return obj

    def get(self, request, pk):
        return Response(QuoteSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = QuoteSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(QuoteSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        obj = self._get(pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConvertQuoteToInvoiceView(APIView):
    """Convert an accepted quote into an invoice."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        quote = Quote.objects(id=pk).first()
        if not quote:
            raise NotFound('Quote not found.')
        if quote.quote_status not in ('accepted', 'sent'):
            return Response(
                {'detail': 'Only accepted or sent quotes can be converted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice = Invoice(
            number=_auto_invoice_number(),
            client_id=quote.client_id,
            client_name=quote.client_name,
            client_email=quote.client_email,
            client_address=quote.client_address,
            items=quote.items,
            currency=quote.currency,
            deal_id=quote.deal_id,
            created_by_id=str(request.user.id),
        )
        invoice.recalculate_totals()
        invoice.save()

        Quote.objects(id=pk).update_one(
            set__quote_status='accepted',
            set__converted_invoice_id=str(invoice.id),
            set__converted_at=datetime.utcnow(),
        )

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


# ─── Payment views ────────────────────────────────────────────────────────────

class PaymentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Payment.objects.all()
        invoice_id = request.query_params.get('invoice_id')
        if invoice_id:
            invoice = Invoice.objects(id=invoice_id).first()
            if invoice:
                qs = qs.filter(invoice=invoice)
        return Response(PaymentSerializer(qs.limit(100), many=True).data)
