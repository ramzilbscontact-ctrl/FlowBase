"""
Comptabilite models — Chart of Accounts, Journal Entries, Transactions.
MongoEngine Documents only.
"""
import mongoengine as me
from datetime import datetime

ACCOUNT_TYPE = (
    'asset',           # Actif
    'liability',       # Passif
    'equity',          # Capitaux propres
    'revenue',         # Produit
    'expense',         # Charge
)

ENTRY_STATUS = ('draft', 'posted', 'cancelled')
TRANSACTION_TYPE = ('debit', 'credit')


class Account(me.Document):
    """Chart of Accounts — Plan Comptable."""
    code = me.StringField(required=True, unique=True, max_length=20)  # e.g. 512
    name = me.StringField(required=True, max_length=300)
    account_type = me.StringField(choices=ACCOUNT_TYPE, required=True)
    parent_code = me.StringField(null=True, max_length=20)  # e.g. 51 for 512
    is_active = me.BooleanField(default=True)
    description = me.StringField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'accounts',
        'ordering': ['code'],
        'indexes': ['code', 'account_type'],
    }

    def __str__(self):
        return f'{self.code} — {self.name}'


class JournalEntryLine(me.EmbeddedDocument):
    """A single debit or credit line in a journal entry."""
    account_code = me.StringField(required=True, max_length=20)
    account_name = me.StringField(max_length=300)   # denormalised
    entry_type = me.StringField(choices=TRANSACTION_TYPE, required=True)
    amount = me.DecimalField(precision=2, required=True)
    label = me.StringField(max_length=500, null=True)


class JournalEntry(me.Document):
    """Ecriture comptable — double-entry accounting."""
    number = me.StringField(required=True, unique=True)  # e.g. JE-2024-001
    date = me.DateTimeField(required=True, default=datetime.utcnow)
    description = me.StringField(required=True, max_length=1000)
    lines = me.ListField(me.EmbeddedDocumentField(JournalEntryLine))
    entry_status = me.StringField(choices=ENTRY_STATUS, default='draft')
    reference = me.StringField(null=True, max_length=200)  # invoice/payment ref
    reference_type = me.StringField(null=True)             # 'invoice', 'payment', etc.
    created_by_id = me.StringField(null=True)
    posted_at = me.DateTimeField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'journal_entries',
        'ordering': ['-date'],
        'indexes': ['number', 'entry_status', 'date', 'reference'],
    }

    @property
    def total_debit(self):
        return sum(float(l.amount) for l in self.lines if l.entry_type == 'debit')

    @property
    def total_credit(self):
        return sum(float(l.amount) for l in self.lines if l.entry_type == 'credit')

    @property
    def is_balanced(self):
        return abs(self.total_debit - self.total_credit) < 0.01

    def __str__(self):
        return f'{self.number} — {self.description}'


class Transaction(me.Document):
    """Aggregated transaction record (for bank reconciliation / reporting)."""
    date = me.DateTimeField(required=True)
    description = me.StringField(required=True, max_length=1000)
    amount = me.DecimalField(precision=2, required=True)
    transaction_type = me.StringField(choices=TRANSACTION_TYPE, required=True)
    account_code = me.StringField(required=True, max_length=20)
    balance_after = me.DecimalField(precision=2, null=True)
    journal_entry = me.ReferenceField(JournalEntry, null=True, reverse_delete_rule=me.NULLIFY)
    reconciled = me.BooleanField(default=False)
    reconciled_at = me.DateTimeField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'transactions',
        'ordering': ['-date'],
        'indexes': ['account_code', 'date', 'reconciled'],
    }

    def __str__(self):
        return f'{self.transaction_type} {self.amount} — {self.account_code} ({self.date})'
