from rest_framework import serializers
from apps.whatsapp.models import WhatsAppMessage, WhatsAppContact, WhatsAppTemplate


class WhatsAppContactSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    phone = serializers.CharField(max_length=30)
    display_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    crm_contact_id = serializers.CharField(required=False, allow_null=True)
    profile_picture_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    last_seen = serializers.DateTimeField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        return WhatsAppContact(**validated_data).save()

    def update(self, instance, validated_data):
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class WhatsAppMessageSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    wa_message_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    direction = serializers.ChoiceField(choices=['inbound', 'outbound'])
    message_type = serializers.ChoiceField(
        choices=['text', 'image', 'audio', 'video', 'document', 'location', 'template'],
        default='text',
    )
    phone = serializers.CharField(max_length=30)
    content = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    media_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    media_mime_type = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    template_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    template_params = serializers.ListField(child=serializers.CharField(), default=list)
    msg_status = serializers.CharField(read_only=True)
    sent_by_id = serializers.CharField(required=False, allow_null=True)
    timestamp = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        return WhatsAppMessage(**validated_data).save()
