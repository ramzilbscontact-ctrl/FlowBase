"""
Facturation models — Invoice, Quote, Payment.
MongoEngine Documents only.
"""
import mongoengine as me
from datetime import datetime

INVOICE_STATUS = ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')
QUOTE_STATUS = ('draft', 'sent', 'accepted', 'rejected', 'expired')
PAYMENT_METHOD = ('stripe', 'bank_transfer', 'cash', 'check', 'other')
PAYMENT_STATUS = ('pending', 'completed', 'failed', 'refunded')
CURRENCY_CHOICES = ('DZD', 'EUR', 'USD', 'GBP')


class LineItem(me.EmbeddedDocument):
    description = me.StringField(required=True, max_length=500)
    quantity = me.DecimalField(precision=3, default=1)
    unit_price = me.DecimalField(precision=2, required=True)
    tax_rate = me.DecimalField(precision=2, default=0)   # percentage, e.g. 19 for 19%
    discount_rate = me.DecimalField(precision=2, default=0)  # percentage

    @property
    def subtotal(self):
        return float(self.quantity) * float(self.unit_price)

    @property
    def tax_amount(self):
        return self.subtotal * float(self.tax_rate) / 100

    @property
    def discount_amount(self):
        return self.subtotal * float(self.discount_rate) / 100

    @property
    def total(self):
        return self.subtotal + self.tax_amount - self.discount_amount


class Invoice(me.Document):
    number = me.StringField(required=True, unique=True)   # e.g. INV-2024-001
    client_id = me.StringField(null=True)        # CRM Contact.id
    client_name = me.StringField(max_length=300, null=True)
    client_email = me.EmailField(null=True)
    client_address = me.StringField(null=True)
    client_tax_id = me.StringField(null=True)    # NIF/SIRET
    items = me.ListField(me.EmbeddedDocumentField(LineItem))
    subtotal = me.DecimalField(precision=2, default=0)
    tax_total = me.DecimalField(precision=2, default=0)
    discount_total = me.DecimalField(precision=2, default=0)
    total = me.DecimalField(precision=2, default=0)
    currency = me.StringField(choices=CURRENCY_CHOICES, default='DZD')
    inv_status = me.StringField(choices=INVOICE_STATUS, default='draft')
    issue_date = me.DateTimeField(default=datetime.utcnow)
    due_date = me.DateTimeField(null=True)
    paid_at = me.DateTimeField(null=True)
    notes = me.StringField(null=True)
    terms = me.StringField(null=True)
    # Stripe
    stripe_payment_intent_id = me.StringField(null=True)
    stripe_invoice_id = me.StringField(null=True)
    # PDF
    pdf_url = me.StringField(null=True)
    # CRM link
    deal_id = me.StringField(null=True)
    # Created by
    created_by_id = me.StringField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'invoices',
        'ordering': ['-created_at'],
        'indexes': ['number', 'client_id', 'inv_status', 'due_date'],
    }

    def recalculate_totals(self):
        self.subtotal = sum(item.subtotal for item in self.items)
        self.tax_total = sum(item.tax_amount for item in self.items)
        self.discount_total = sum(item.discount_amount for item in self.items)
        self.total = self.subtotal + self.tax_total - self.discount_total

    def __str__(self):
        return f'{self.number} — {self.client_name}'


class Quote(me.Document):
    number = me.StringField(required=True, unique=True)   # e.g. QTE-2024-001
    client_id = me.StringField(null=True)
    client_name = me.StringField(max_length=300, null=True)
    client_email = me.EmailField(null=True)
    client_address = me.StringField(null=True)
    items = me.ListField(me.EmbeddedDocumentField(LineItem))
    subtotal = me.DecimalField(precision=2, default=0)
    tax_total = me.DecimalField(precision=2, default=0)
    total = me.DecimalField(precision=2, default=0)
    currency = me.StringField(choices=CURRENCY_CHOICES, default='DZD')
    quote_status = me.StringField(choices=QUOTE_STATUS, default='draft')
    validity_days = me.IntField(default=30)
    issue_date = me.DateTimeField(default=datetime.utcnow)
    expiry_date = me.DateTimeField(null=True)
    notes = me.StringField(null=True)
    # Converted to invoice
    converted_invoice_id = me.StringField(null=True)
    converted_at = me.DateTimeField(null=True)
    deal_id = me.StringField(null=True)
    created_by_id = me.StringField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'quotes',
        'ordering': ['-created_at'],
        'indexes': ['number', 'client_id', 'quote_status'],
    }

    def recalculate_totals(self):
        self.subtotal = sum(item.subtotal for item in self.items)
        self.tax_total = sum(item.tax_amount for item in self.items)
        self.total = self.subtotal + self.tax_total

    def __str__(self):
        return f'{self.number} — {self.client_name}'


class Payment(me.Document):
    invoice = me.ReferenceField(Invoice, null=True, reverse_delete_rule=me.NULLIFY)
    invoice_number = me.StringField(null=True)    # denormalised
    amount = me.DecimalField(precision=2, required=True)
    currency = me.StringField(default='DZD')
    payment_method = me.StringField(choices=PAYMENT_METHOD, default='stripe')
    pay_status = me.StringField(choices=PAYMENT_STATUS, default='pending')
    stripe_payment_intent_id = me.StringField(null=True, unique=True, sparse=True)
    stripe_charge_id = me.StringField(null=True)
    reference = me.StringField(null=True)          # bank transfer ref / check number
    paid_at = me.DateTimeField(null=True)
    notes = me.StringField(null=True)
    created_by_id = me.StringField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'payments',
        'ordering': ['-created_at'],
        'indexes': ['invoice', 'pay_status', 'stripe_payment_intent_id'],
    }

    def __str__(self):
        return f'Payment {self.amount} {self.currency} — {self.pay_status}'
