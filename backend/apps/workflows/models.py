"""
Workflows models — automated business workflows.
MongoEngine Documents only.
"""
import mongoengine as me
from datetime import datetime

TRIGGER_TYPE = (
    'deal_stage_changed',
    'deal_created',
    'contact_created',
    'invoice_overdue',
    'invoice_paid',
    'task_completed',
    'form_submitted',
    'webhook',
    'scheduled',
    'manual',
)

ACTION_TYPE = (
    'send_email',
    'send_whatsapp',
    'create_task',
    'create_note',
    'update_deal_stage',
    'assign_owner',
    'send_webhook',
    'wait',
    'create_invoice',
)

WORKFLOW_STATUS = ('active', 'inactive', 'draft', 'archived')
EXECUTION_STATUS = ('pending', 'running', 'completed', 'failed', 'cancelled')


class WorkflowAction(me.EmbeddedDocument):
    """A single step in a workflow."""
    action_type = me.StringField(choices=ACTION_TYPE, required=True)
    order = me.IntField(default=0)
    config = me.DictField()     # action-specific configuration
    # e.g. send_email: {template: '...', to: '{{contact.email}}'}
    # e.g. wait: {delay_seconds: 86400}
    # e.g. create_task: {title: '...', assigned_to: '...'}

    def __str__(self):
        return f'[{self.order}] {self.action_type}'


class WorkflowCondition(me.EmbeddedDocument):
    """A filter condition that must be met for the workflow to proceed."""
    field = me.StringField(required=True)       # e.g. 'deal.stage'
    operator = me.StringField(choices=(
        'equals', 'not_equals', 'contains', 'gt', 'lt', 'gte', 'lte',
        'is_null', 'is_not_null',
    ), required=True)
    value = me.DynamicField(null=True)


class Workflow(me.Document):
    name = me.StringField(required=True, max_length=300)
    description = me.StringField(null=True)
    trigger = me.StringField(choices=TRIGGER_TYPE, required=True)
    trigger_config = me.DictField()              # e.g. {stage: 'won'}
    conditions = me.ListField(me.EmbeddedDocumentField(WorkflowCondition))
    actions = me.ListField(me.EmbeddedDocumentField(WorkflowAction))
    wf_status = me.StringField(choices=WORKFLOW_STATUS, default='draft')
    execution_count = me.IntField(default=0)
    last_executed_at = me.DateTimeField(null=True)
    created_by_id = me.StringField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'workflows',
        'ordering': ['-created_at'],
        'indexes': ['trigger', 'wf_status'],
    }

    def __str__(self):
        return f'{self.name} ({self.trigger})'


class WorkflowExecution(me.Document):
    """Log of a single workflow run."""
    workflow = me.ReferenceField(Workflow, required=True, reverse_delete_rule=me.CASCADE)
    workflow_name = me.StringField(null=True)    # denormalised
    exec_status = me.StringField(choices=EXECUTION_STATUS, default='pending')
    trigger_data = me.DictField()                # the event that triggered execution
    # References to the entity that triggered the workflow
    entity_type = me.StringField(null=True)      # 'deal', 'contact', etc.
    entity_id = me.StringField(null=True)
    # Execution steps log
    steps_log = me.ListField(me.DictField())     # [{action_type, status, output, error, executed_at}]
    error_message = me.StringField(null=True)
    started_at = me.DateTimeField(default=datetime.utcnow)
    completed_at = me.DateTimeField(null=True)

    meta = {
        'collection': 'workflow_executions',
        'ordering': ['-started_at'],
        'indexes': ['workflow', 'exec_status', 'entity_id', 'started_at'],
    }

    def __str__(self):
        return f'Execution of {self.workflow_name} — {self.exec_status}'
