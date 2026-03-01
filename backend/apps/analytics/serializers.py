from rest_framework import serializers
from apps.analytics.models import DealScore, KPISnapshot, AIInsight


class DealScoreSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    deal_id = serializers.CharField(read_only=True)
    deal_title = serializers.CharField(read_only=True, allow_null=True)
    stage = serializers.CharField(read_only=True, allow_null=True)
    value = serializers.FloatField(read_only=True)
    days_in_stage = serializers.IntegerField(read_only=True)
    tasks_completed = serializers.IntegerField(read_only=True)
    notes_count = serializers.IntegerField(read_only=True)
    win_probability = serializers.FloatField(read_only=True)
    revenue_forecast = serializers.FloatField(read_only=True)
    risk_level = serializers.CharField(read_only=True)
    model_version = serializers.CharField(read_only=True)
    scored_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)


class KPISnapshotSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    period = serializers.CharField(read_only=True)
    snapshot_date = serializers.DateTimeField(read_only=True)
    new_deals = serializers.IntegerField(read_only=True)
    deals_won = serializers.IntegerField(read_only=True)
    deals_lost = serializers.IntegerField(read_only=True)
    revenue_generated = serializers.FloatField(read_only=True)
    avg_deal_value = serializers.FloatField(read_only=True)
    win_rate = serializers.FloatField(read_only=True)
    new_contacts = serializers.IntegerField(read_only=True)
    new_companies = serializers.IntegerField(read_only=True)
    tasks_completed = serializers.IntegerField(read_only=True)
    whatsapp_messages_sent = serializers.IntegerField(read_only=True)
    whatsapp_messages_received = serializers.IntegerField(read_only=True)
    emails_sent = serializers.IntegerField(read_only=True)
    invoices_issued = serializers.IntegerField(read_only=True)
    invoices_paid = serializers.IntegerField(read_only=True)
    invoices_overdue = serializers.IntegerField(read_only=True)
    total_billed = serializers.FloatField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)


class AIInsightSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    insight_type = serializers.CharField(read_only=True)
    severity = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    body = serializers.CharField(read_only=True)
    recommendation = serializers.CharField(read_only=True, allow_null=True)
    related_deal_id = serializers.CharField(read_only=True, allow_null=True)
    related_contact_id = serializers.CharField(read_only=True, allow_null=True)
    is_read = serializers.BooleanField()
    is_dismissed = serializers.BooleanField()
    generated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)
