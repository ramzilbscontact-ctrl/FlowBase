from rest_framework import serializers
from apps.workflows.models import Workflow, WorkflowExecution, WorkflowAction, WorkflowCondition


class WorkflowConditionSerializer(serializers.Serializer):
    field = serializers.CharField()
    operator = serializers.ChoiceField(choices=[
        'equals', 'not_equals', 'contains', 'gt', 'lt', 'gte', 'lte',
        'is_null', 'is_not_null',
    ])
    value = serializers.JSONField(required=False, allow_null=True)


class WorkflowActionSerializer(serializers.Serializer):
    action_type = serializers.ChoiceField(choices=[
        'send_email', 'send_whatsapp', 'create_task', 'create_note',
        'update_deal_stage', 'assign_owner', 'send_webhook', 'wait',
        'create_invoice',
    ])
    order = serializers.IntegerField(default=0)
    config = serializers.DictField(default=dict)


class WorkflowSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    name = serializers.CharField(max_length=300)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    trigger = serializers.ChoiceField(choices=[
        'deal_stage_changed', 'deal_created', 'contact_created', 'invoice_overdue',
        'invoice_paid', 'task_completed', 'form_submitted', 'webhook', 'scheduled', 'manual',
    ])
    trigger_config = serializers.DictField(default=dict)
    conditions = WorkflowConditionSerializer(many=True, default=list)
    actions = WorkflowActionSerializer(many=True, default=list)
    wf_status = serializers.ChoiceField(
        choices=['active', 'inactive', 'draft', 'archived'],
        default='draft',
    )
    execution_count = serializers.IntegerField(read_only=True)
    last_executed_at = serializers.DateTimeField(read_only=True, allow_null=True)
    created_by_id = serializers.CharField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_id(self, obj):
        return str(obj.id)

    def _build(self, validated_data):
        conditions_data = validated_data.pop('conditions', [])
        actions_data = validated_data.pop('actions', [])
        validated_data['conditions'] = [WorkflowCondition(**c) for c in conditions_data]
        validated_data['actions'] = sorted(
            [WorkflowAction(**a) for a in actions_data],
            key=lambda x: x.order,
        )
        return validated_data

    def create(self, validated_data):
        validated_data = self._build(validated_data)
        return Workflow(**validated_data).save()

    def update(self, instance, validated_data):
        from datetime import datetime
        validated_data = self._build(validated_data)
        validated_data['updated_at'] = datetime.utcnow()
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        return instance


class WorkflowExecutionSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    workflow_id = serializers.SerializerMethodField()
    workflow_name = serializers.CharField(read_only=True, allow_null=True)
    exec_status = serializers.CharField(read_only=True)
    entity_type = serializers.CharField(read_only=True, allow_null=True)
    entity_id = serializers.CharField(read_only=True, allow_null=True)
    steps_log = serializers.ListField(read_only=True)
    error_message = serializers.CharField(read_only=True, allow_null=True)
    started_at = serializers.DateTimeField(read_only=True)
    completed_at = serializers.DateTimeField(read_only=True, allow_null=True)

    def get_id(self, obj):
        return str(obj.id)

    def get_workflow_id(self, obj):
        return str(obj.workflow.id) if obj.workflow else None
