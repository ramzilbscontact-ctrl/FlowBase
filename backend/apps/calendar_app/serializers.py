from rest_framework import serializers
from apps.calendar_app.models import Event


class EventSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    title = serializers.CharField(max_length=300)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    event_type = serializers.ChoiceField(
        choices=['meeting', 'call', 'demo', 'task', 'reminder', 'other'],
        default='meeting',
    )
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    all_day = serializers.BooleanField(default=False)
    location = serializers.CharField(max_length=500, required=False, allow_null=True, allow_blank=True)
    attendees = serializers.ListField(child=serializers.EmailField(), default=list)
    organizer_id = serializers.CharField(required=False, allow_null=True)
    google_event_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    google_calendar_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    google_meet_link = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    related_contact_id = serializers.CharField(required=False, allow_null=True)
    related_deal_id = serializers.CharField(required=False, allow_null=True)
    event_status = serializers.ChoiceField(
        choices=['confirmed', 'tentative', 'cancelled'], default='confirmed'
    )
    recurrence_rule = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    color = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def validate(self, data):
        if data.get('end_datetime') and data.get('start_datetime'):
            if data['end_datetime'] <= data['start_datetime']:
                raise serializers.ValidationError('end_datetime must be after start_datetime.')
        return data

    def create(self, validated_data):
        return Event(**validated_data).save()

    def update(self, instance, validated_data):
        from datetime import datetime
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance
