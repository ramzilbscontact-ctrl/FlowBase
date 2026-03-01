"""
WhatsApp integration models — MongoEngine Documents.
"""
import mongoengine as me
from datetime import datetime

MESSAGE_DIRECTION = ('inbound', 'outbound')
MESSAGE_STATUS = ('pending', 'sent', 'delivered', 'read', 'failed')
MESSAGE_TYPE = ('text', 'image', 'audio', 'video', 'document', 'location', 'template')


class WhatsAppContact(me.Document):
    """Maps a WhatsApp phone number to a CRM Contact."""
    phone = me.StringField(required=True, unique=True, max_length=30)
    display_name = me.StringField(max_length=200, null=True)
    crm_contact_id = me.StringField(null=True)   # apps.crm.Contact.id
    profile_picture_url = me.URLField(null=True)
    last_seen = me.DateTimeField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {'collection': 'whatsapp_contacts', 'indexes': ['phone', 'crm_contact_id']}

    def __str__(self):
        return self.phone


class WhatsAppMessage(me.Document):
    wa_message_id = me.StringField(null=True, unique=True, sparse=True)  # Meta message ID
    direction = me.StringField(choices=MESSAGE_DIRECTION, required=True)
    message_type = me.StringField(choices=MESSAGE_TYPE, default='text')
    phone = me.StringField(required=True, max_length=30)
    wa_contact = me.ReferenceField(WhatsAppContact, null=True, reverse_delete_rule=me.NULLIFY)
    content = me.StringField(null=True)            # text body
    media_url = me.URLField(null=True)             # image/audio/video/doc
    media_mime_type = me.StringField(null=True)
    template_name = me.StringField(null=True)      # for template messages
    template_params = me.ListField(me.StringField())
    msg_status = me.StringField(choices=MESSAGE_STATUS, default='pending')
    error_message = me.StringField(null=True)
    sent_by_id = me.StringField(null=True)         # User.id (for outbound)
    timestamp = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'whatsapp_messages',
        'ordering': ['-timestamp'],
        'indexes': ['phone', 'direction', 'timestamp', 'wa_message_id'],
    }

    def __str__(self):
        return f'[{self.direction}] {self.phone}: {self.content[:50] if self.content else "(media)"}'


class WhatsAppTemplate(me.Document):
    """Approved Meta message templates."""
    name = me.StringField(required=True, unique=True)
    language = me.StringField(default='fr')
    category = me.StringField(default='MARKETING')
    status = me.StringField(default='APPROVED')
    components = me.ListField(me.DictField())   # raw Meta template components
    created_at = me.DateTimeField(default=datetime.utcnow)

    meta = {'collection': 'whatsapp_templates'}
