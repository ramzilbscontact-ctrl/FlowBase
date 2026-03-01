"""
Gmail integration models — MongoEngine Documents.
"""
import mongoengine as me
from datetime import datetime


class GmailMessage(me.Document):
    gmail_id = me.StringField(required=True, unique=True)   # Gmail message ID
    thread_id = me.StringField(required=True)
    subject = me.StringField(null=True, max_length=1000)
    from_email = me.StringField(null=True, max_length=500)
    to_email = me.ListField(me.StringField())
    cc_email = me.ListField(me.StringField())
    bcc_email = me.ListField(me.StringField())
    body_plain = me.StringField(null=True)
    body_html = me.StringField(null=True)
    snippet = me.StringField(null=True, max_length=500)
    labels = me.ListField(me.StringField())
    is_read = me.BooleanField(default=False)
    is_starred = me.BooleanField(default=False)
    has_attachments = me.BooleanField(default=False)
    attachments = me.ListField(me.DictField())   # [{name, mimeType, attachmentId}]
    owner_user_id = me.StringField(null=True)    # Which ERP user's mailbox
    # CRM links
    crm_contact_id = me.StringField(null=True)
    crm_deal_id = me.StringField(null=True)
    received_at = me.DateTimeField(null=True)
    synced_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'gmail_messages',
        'ordering': ['-received_at'],
        'indexes': ['thread_id', 'owner_user_id', 'labels', 'received_at'],
    }

    def __str__(self):
        return f'{self.subject or "(no subject)"} — {self.from_email}'


class GmailThread(me.Document):
    """Represents a Gmail conversation thread."""
    thread_id = me.StringField(required=True, unique=True)
    subject = me.StringField(null=True)
    snippet = me.StringField(null=True)
    message_count = me.IntField(default=0)
    participants = me.ListField(me.StringField())
    labels = me.ListField(me.StringField())
    last_message_at = me.DateTimeField(null=True)
    owner_user_id = me.StringField(null=True)
    crm_contact_id = me.StringField(null=True)
    synced_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'gmail_threads',
        'ordering': ['-last_message_at'],
        'indexes': ['owner_user_id', 'thread_id'],
    }
