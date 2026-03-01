"""
Calendar app models — MongoEngine Documents.
"""
import mongoengine as me
from datetime import datetime

EVENT_STATUS = ('confirmed', 'tentative', 'cancelled')
EVENT_TYPE = ('meeting', 'call', 'demo', 'task', 'reminder', 'other')


class Event(me.Document):
    title = me.StringField(required=True, max_length=300)
    description = me.StringField(null=True)
    event_type = me.StringField(choices=EVENT_TYPE, default='meeting')
    start_datetime = me.DateTimeField(required=True)
    end_datetime = me.DateTimeField(required=True)
    all_day = me.BooleanField(default=False)
    location = me.StringField(max_length=500, null=True)
    attendees = me.ListField(me.StringField())    # list of emails
    organizer_id = me.StringField(null=True)     # User.id
    # Google Calendar sync
    google_event_id = me.StringField(null=True, unique=True, sparse=True)
    google_calendar_id = me.StringField(null=True)
    google_meet_link = me.URLField(null=True)
    # CRM links
    related_contact_id = me.StringField(null=True)
    related_deal_id = me.StringField(null=True)
    # Status
    event_status = me.StringField(choices=EVENT_STATUS, default='confirmed')
    recurrence_rule = me.StringField(null=True)  # RFC 5545 RRULE
    color = me.StringField(max_length=20, null=True)  # hex color
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'events',
        'ordering': ['start_datetime'],
        'indexes': ['organizer_id', 'start_datetime', 'google_event_id'],
    }

    def __str__(self):
        return f'{self.title} ({self.start_datetime})'
