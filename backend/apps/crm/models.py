"""
CRM models — MongoEngine Documents.
Covers: Contact, Company, Deal, Pipeline, Task, Note.
"""
import mongoengine as me
from datetime import datetime


# ─── Deal stage choices ───────────────────────────────────────────────────────
DEAL_STAGES = (
    'lead',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost',
)

TASK_STATUS = ('todo', 'in_progress', 'done', 'cancelled')
TASK_PRIORITY = ('low', 'medium', 'high', 'urgent')


# ─── Company ─────────────────────────────────────────────────────────────────

class Company(me.Document):
    name = me.StringField(required=True, max_length=255)
    website = me.URLField(null=True)
    industry = me.StringField(max_length=100, null=True)
    phone = me.StringField(max_length=30, null=True)
    email = me.EmailField(null=True)
    address = me.StringField(null=True)
    city = me.StringField(max_length=100, null=True)
    country = me.StringField(max_length=100, default='Algeria')
    notes = me.StringField(null=True)
    owner_id = me.StringField(null=True)          # User.id reference
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'companies',
        'ordering': ['-created_at'],
        'indexes': ['name', 'owner_id'],
    }

    def __str__(self):
        return self.name


# ─── Contact ─────────────────────────────────────────────────────────────────

class Contact(me.Document):
    first_name = me.StringField(required=True, max_length=100)
    last_name = me.StringField(required=True, max_length=100)
    email = me.EmailField(null=True)
    phone = me.StringField(max_length=30, null=True)
    mobile = me.StringField(max_length=30, null=True)
    job_title = me.StringField(max_length=150, null=True)
    company = me.ReferenceField(Company, null=True, reverse_delete_rule=me.NULLIFY)
    company_name = me.StringField(max_length=255, null=True)   # denormalised
    tags = me.ListField(me.StringField(max_length=50))
    source = me.StringField(max_length=100, null=True)         # lead source
    notes = me.StringField(null=True)
    owner_id = me.StringField(null=True)
    avatar_url = me.StringField(null=True)
    linkedin_url = me.URLField(null=True)
    instagram_handle = me.StringField(max_length=100, null=True)
    whatsapp_number = me.StringField(max_length=30, null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'contacts',
        'ordering': ['-created_at'],
        'indexes': ['email', 'owner_id', 'tags'],
    }

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def __str__(self):
        return self.full_name


# ─── Pipeline ────────────────────────────────────────────────────────────────

class Pipeline(me.Document):
    name = me.StringField(required=True, max_length=200)
    description = me.StringField(null=True)
    owner_id = me.StringField(null=True)
    is_default = me.BooleanField(default=False)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'pipelines',
        'ordering': ['-created_at'],
    }

    def __str__(self):
        return self.name


# ─── Deal ────────────────────────────────────────────────────────────────────

class Deal(me.Document):
    title = me.StringField(required=True, max_length=300)
    contact = me.ReferenceField(Contact, null=True, reverse_delete_rule=me.NULLIFY)
    company = me.ReferenceField(Company, null=True, reverse_delete_rule=me.NULLIFY)
    pipeline = me.ReferenceField(Pipeline, null=True, reverse_delete_rule=me.NULLIFY)
    stage = me.StringField(choices=DEAL_STAGES, default='lead')
    value = me.DecimalField(precision=2, default=0)
    currency = me.StringField(max_length=3, default='DZD')
    probability = me.IntField(min_value=0, max_value=100, default=20)
    expected_close_date = me.DateTimeField(null=True)
    closed_at = me.DateTimeField(null=True)
    owner_id = me.StringField(null=True)
    description = me.StringField(null=True)
    tags = me.ListField(me.StringField(max_length=50))
    # AI scoring fields (populated by analytics app)
    ai_score = me.FloatField(null=True)
    ai_score_updated_at = me.DateTimeField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'deals',
        'ordering': ['-created_at'],
        'indexes': ['stage', 'owner_id', 'contact', 'company'],
    }

    def __str__(self):
        return self.title


# ─── Task ────────────────────────────────────────────────────────────────────

class Task(me.Document):
    title = me.StringField(required=True, max_length=300)
    description = me.StringField(null=True)
    status = me.StringField(choices=TASK_STATUS, default='todo')
    priority = me.StringField(choices=TASK_PRIORITY, default='medium')
    due_date = me.DateTimeField(null=True)
    completed_at = me.DateTimeField(null=True)
    # Polymorphic relations — store type + id separately for MongoEngine ease
    related_type = me.StringField(
        choices=('contact', 'deal', 'company'), null=True
    )
    related_id = me.StringField(null=True)
    assigned_to_id = me.StringField(null=True)    # User.id
    created_by_id = me.StringField(null=True)     # User.id
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'tasks',
        'ordering': ['due_date', '-priority'],
        'indexes': ['status', 'assigned_to_id', 'related_id'],
    }

    def __str__(self):
        return self.title


# ─── Note ────────────────────────────────────────────────────────────────────

class Note(me.Document):
    content = me.StringField(required=True)
    related_type = me.StringField(
        choices=('contact', 'deal', 'company'), null=True
    )
    related_id = me.StringField(null=True)
    author_id = me.StringField(null=True)
    is_pinned = me.BooleanField(default=False)
    attachments = me.ListField(me.StringField())   # file URLs
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'notes',
        'ordering': ['-is_pinned', '-created_at'],
        'indexes': ['related_id', 'author_id'],
    }

    def __str__(self):
        return self.content[:80]
