from rest_framework import serializers
from apps.instagram.models import InstagramMessage, InstagramPost, InstagramComment


class InstagramMessageSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    ig_message_id = serializers.CharField(read_only=True)
    ig_conversation_id = serializers.CharField(allow_null=True, read_only=True)
    direction = serializers.CharField(read_only=True)
    from_ig_id = serializers.CharField(allow_null=True, read_only=True)
    from_username = serializers.CharField(allow_null=True, read_only=True)
    content = serializers.CharField(allow_null=True, read_only=True)
    attachments = serializers.ListField(read_only=True)
    is_read = serializers.BooleanField(read_only=True)
    crm_contact_id = serializers.CharField(allow_null=True, required=False)
    timestamp = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)


class InstagramPostSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    ig_media_id = serializers.CharField(read_only=True)
    post_type = serializers.CharField(read_only=True)
    caption = serializers.CharField(allow_null=True, read_only=True)
    media_url = serializers.URLField(allow_null=True, read_only=True)
    thumbnail_url = serializers.URLField(allow_null=True, read_only=True)
    permalink = serializers.URLField(allow_null=True, read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    reach = serializers.IntegerField(read_only=True)
    impressions = serializers.IntegerField(read_only=True)
    engagement_rate = serializers.FloatField(read_only=True)
    published_at = serializers.DateTimeField(allow_null=True, read_only=True)

    def get_id(self, obj):
        return str(obj.id)


class InstagramCommentSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    ig_comment_id = serializers.CharField(read_only=True)
    from_username = serializers.CharField(allow_null=True, read_only=True)
    text = serializers.CharField(allow_null=True, read_only=True)
    is_replied = serializers.BooleanField(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)


class ReplyCommentSerializer(serializers.Serializer):
    text = serializers.CharField(min_length=1)
