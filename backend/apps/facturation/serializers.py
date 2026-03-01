from rest_framework import serializers
from apps.facturation.models import Invoice, Quote, Payment, LineItem


class LineItemSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=500)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_price = serializers.DecimalField(max_digits=15, decimal_places=2)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    def get_subtotal(self, obj):
        if hasattr(obj, 'subtotal'):
            return float(obj.subtotal)
        return 0

    def get_total(self, obj):
        if hasattr(obj, 'total'):
            return float(obj.total)
        return 0


class InvoiceSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    number = serializers.CharField(max_length=50)
    client_id = serializers.CharField(required=False, allow_null=True)
    client_name = serializers.CharField(max_length=300, required=False, allow_null=True, allow_blank=True)
    client_email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    client_address = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    client_tax_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    items = LineItemSerializer(many=True, default=list)
    subtotal = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    tax_total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    discount_total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    currency = serializers.ChoiceField(choices=['DZD', 'EUR', 'USD', 'GBP'], default='DZD')
    inv_status = serializers.ChoiceField(
        choices=['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'],
        default='draft',
    )
    issue_date = serializers.DateTimeField(required=False)
    due_date = serializers.DateTimeField(required=False, allow_null=True)
    paid_at = serializers.DateTimeField(read_only=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    terms = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    stripe_payment_intent_id = serializers.CharField(read_only=True, allow_null=True)
    pdf_url = serializers.CharField(read_only=True, allow_null=True)
    deal_id = serializers.CharField(required=False, allow_null=True)
    created_by_id = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def _build_items(self, items_data):
        return [LineItem(**item) for item in items_data]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        invoice = Invoice(**validated_data)
        invoice.items = self._build_items(items_data)
        invoice.recalculate_totals()
        invoice.save()
        return invoice

    def update(self, instance, validated_data):
        from datetime import datetime
        items_data = validated_data.pop('items', None)
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if items_data is not None:
            instance.items = self._build_items(items_data)
        instance.recalculate_totals()
        instance.save()
        return instance


class QuoteSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    number = serializers.CharField(max_length=50)
    client_id = serializers.CharField(required=False, allow_null=True)
    client_name = serializers.CharField(max_length=300, required=False, allow_null=True, allow_blank=True)
    client_email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    client_address = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    items = LineItemSerializer(many=True, default=list)
    subtotal = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    tax_total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    currency = serializers.ChoiceField(choices=['DZD', 'EUR', 'USD', 'GBP'], default='DZD')
    quote_status = serializers.ChoiceField(
        choices=['draft', 'sent', 'accepted', 'rejected', 'expired'],
        default='draft',
    )
    validity_days = serializers.IntegerField(default=30)
    issue_date = serializers.DateTimeField(required=False)
    expiry_date = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    deal_id = serializers.CharField(required=False, allow_null=True)
    converted_invoice_id = serializers.CharField(read_only=True, allow_null=True)
    created_by_id = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def _build_items(self, items_data):
        return [LineItem(**item) for item in items_data]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        quote = Quote(**validated_data)
        quote.items = self._build_items(items_data)
        quote.recalculate_totals()
        quote.save()
        return quote

    def update(self, instance, validated_data):
        from datetime import datetime
        items_data = validated_data.pop('items', None)
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if items_data is not None:
            instance.items = self._build_items(items_data)
        instance.recalculate_totals()
        instance.save()
        return instance


class PaymentSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    invoice_id = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(read_only=True, allow_null=True)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    currency = serializers.CharField(default='DZD')
    payment_method = serializers.ChoiceField(
        choices=['stripe', 'bank_transfer', 'cash', 'check', 'other'],
        default='stripe',
    )
    pay_status = serializers.CharField(read_only=True)
    stripe_payment_intent_id = serializers.CharField(read_only=True, allow_null=True)
    reference = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    paid_at = serializers.DateTimeField(read_only=True, allow_null=True)
    notes = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_invoice_id(self, obj):
        return str(obj.invoice.id) if obj.invoice else None
