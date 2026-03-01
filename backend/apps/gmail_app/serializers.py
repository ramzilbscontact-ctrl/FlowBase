from rest_framework import serializers
from apps.gmail_app.models import GmailMessage, GmailThread


class GmailMessageSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    gmail_id = serializers.CharField(read_only=True)
    thread_id = serializers.CharField(read_only=True)
    subject = serializers.CharField(allow_null=True, read_only=True)
    from_email = serializers.CharField(allow_null=True, read_only=True)
    to_email = serializers.ListField(child=serializers.CharField(), read_only=True)
    cc_email = serializers.ListField(child=serializers.CharField(), read_only=True)
    snippet = serializers.CharField(allow_null=True, read_only=True)
    labels = serializers.ListField(child=serializers.CharField(), read_only=True)
    is_read = serializers.BooleanField(read_only=True)
    is_starred = serializers.BooleanField(read_only=True)
    has_attachments = serializers.BooleanField(read_only=True)
    body_plain = serializers.CharField(allow_null=True, read_only=True)
    crm_contact_id = serializers.CharField(allow_null=True, required=False)
    crm_deal_id = serializers.CharField(allow_null=True, required=False)
    received_at = serializers.DateTimeField(allow_null=True, read_only=True)

    def get_id(self, obj):
        return str(obj.id)


class GmailThreadSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    thread_id = serializers.CharField(read_only=True)
    subject = serializers.CharField(allow_null=True, read_only=True)
    snippet = serializers.CharField(allow_null=True, read_only=True)
    message_count = serializers.IntegerField(read_only=True)
    participants = serializers.ListField(child=serializers.CharField(), read_only=True)
    labels = serializers.ListField(child=serializers.CharField(), read_only=True)
    last_message_at = serializers.DateTimeField(allow_null=True, read_only=True)
    crm_contact_id = serializers.CharField(allow_null=True, required=False)

    def get_id(self, obj):
        return str(obj.id)


class ComposeEmailSerializer(serializers.Serializer):
    to = serializers.ListField(child=serializers.EmailField(), min_length=1)
    cc = serializers.ListField(child=serializers.EmailField(), default=list)
    bcc = serializers.ListField(child=serializers.EmailField(), default=list)
    subject = serializers.CharField(max_length=1000)
    body = serializers.CharField()
    thread_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    is_html = serializers.BooleanField(default=False)
