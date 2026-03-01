"""
Instagram integration models — MongoEngine Documents.
"""
import mongoengine as me
from datetime import datetime

MESSAGE_DIRECTION = ('inbound', 'outbound')
POST_TYPE = ('image', 'video', 'carousel', 'reel', 'story')


class InstagramAccount(me.Document):
    ig_user_id = me.StringField(required=True, unique=True)
    username = me.StringField(max_length=100)
    name = me.StringField(max_length=200, null=True)
    biography = me.StringField(null=True)
    followers_count = me.IntField(default=0)
    following_count = me.IntField(default=0)
    media_count = me.IntField(default=0)
    profile_picture_url = me.URLField(null=True)
    website = me.URLField(null=True)
    access_token = me.StringField(null=True)   # stored encrypted in prod
    token_expires_at = me.DateTimeField(null=True)
    synced_at = me.DateTimeField(default=datetime.utcnow)

    meta = {'collection': 'instagram_accounts'}


class InstagramMessage(me.Document):
    ig_message_id = me.StringField(required=True, unique=True)
    ig_conversation_id = me.StringField(null=True)
    direction = me.StringField(choices=MESSAGE_DIRECTION, required=True)
    from_ig_id = me.StringField(null=True)
    from_username = me.StringField(null=True)
    to_ig_id = me.StringField(null=True)
    content = me.StringField(null=True)           # text message
    story_mention = me.StringField(null=True)     # story mention URL
    attachments = me.ListField(me.DictField())    # [{type, url}]
    is_read = me.BooleanField(default=False)
    # CRM link
    crm_contact_id = me.StringField(null=True)
    sent_by_id = me.StringField(null=True)        # ERP User.id for outbound
    timestamp = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'instagram_messages',
        'ordering': ['-timestamp'],
        'indexes': ['from_ig_id', 'ig_conversation_id', 'timestamp'],
    }

    def __str__(self):
        return f'[{self.direction}] {self.from_username}: {self.content[:50] if self.content else "(media)"}'


class InstagramPost(me.Document):
    ig_media_id = me.StringField(required=True, unique=True)
    post_type = me.StringField(choices=POST_TYPE, default='image')
    caption = me.StringField(null=True)
    media_url = me.URLField(null=True)
    thumbnail_url = me.URLField(null=True)
    permalink = me.URLField(null=True)
    likes_count = me.IntField(default=0)
    comments_count = me.IntField(default=0)
    reach = me.IntField(default=0)
    impressions = me.IntField(default=0)
    engagement_rate = me.FloatField(default=0.0)
    published_at = me.DateTimeField(null=True)
    synced_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'instagram_posts',
        'ordering': ['-published_at'],
    }

    def __str__(self):
        return f'{self.post_type}: {self.ig_media_id}'


class InstagramComment(me.Document):
    ig_comment_id = me.StringField(required=True, unique=True)
    post = me.ReferenceField(InstagramPost, reverse_delete_rule=me.CASCADE)
    from_ig_id = me.StringField(null=True)
    from_username = me.StringField(null=True)
    text = me.StringField(null=True)
    is_replied = me.BooleanField(default=False)
    crm_contact_id = me.StringField(null=True)
    timestamp = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'instagram_comments',
        'ordering': ['-timestamp'],
    }
