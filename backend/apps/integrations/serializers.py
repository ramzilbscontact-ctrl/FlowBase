from rest_framework import serializers
from apps.integrations.models import GoogleToken, IntegrationConfig


class GoogleTokenSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    user_id = serializers.CharField(read_only=True)
    google_email = serializers.EmailField(read_only=True, allow_null=True)
    scopes = serializers.ListField(child=serializers.CharField(), read_only=True)
    expires_at = serializers.DateTimeField(read_only=True, allow_null=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)


class IntegrationConfigSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    integration_type = serializers.ChoiceField(
        choices=['google', 'stripe', 'whatsapp', 'instagram', 'custom_webhook']
    )
    name = serializers.CharField(max_length=200, required=False, allow_null=True, allow_blank=True)
    int_status = serializers.ChoiceField(
        choices=['connected', 'disconnected', 'error', 'pending'],
        default='disconnected',
    )
    config = serializers.DictField(default=dict)
    webhook_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    is_active = serializers.BooleanField(default=True)
    last_sync_at = serializers.DateTimeField(read_only=True, allow_null=True)
    last_error = serializers.CharField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def create(self, validated_data):
        return IntegrationConfig(**validated_data).save()

    def update(self, instance, validated_data):
        from datetime import datetime
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance
