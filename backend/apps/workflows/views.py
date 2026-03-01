"""
Workflows views — CRUD, manual trigger, execution history.
"""
import logging
from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.workflows.models import Workflow, WorkflowExecution
from apps.workflows.serializers import WorkflowSerializer, WorkflowExecutionSerializer

logger = logging.getLogger(__name__)


def execute_workflow(workflow: Workflow, trigger_data: dict, entity_type: str = None, entity_id: str = None):
    """
    Execute a workflow synchronously.
    In production, this would be delegated to a Celery task.
    Returns the WorkflowExecution document.
    """
    execution = WorkflowExecution(
        workflow=workflow,
        workflow_name=workflow.name,
        exec_status='running',
        trigger_data=trigger_data,
        entity_type=entity_type,
        entity_id=entity_id,
    ).save()

    steps_log = []
    try:
        for action in sorted(workflow.actions, key=lambda a: a.order):
            step = {
                'action_type': action.action_type,
                'status': 'pending',
                'executed_at': datetime.utcnow().isoformat(),
            }
            try:
                output = _run_action(action, trigger_data, entity_type, entity_id)
                step['status'] = 'completed'
                step['output'] = output
            except Exception as exc:
                step['status'] = 'failed'
                step['error'] = str(exc)
                logger.error('Workflow action %s failed: %s', action.action_type, exc)
            steps_log.append(step)

        # Update execution record
        now = datetime.utcnow()
        WorkflowExecution.objects(id=execution.id).update_one(
            set__exec_status='completed',
            set__steps_log=steps_log,
            set__completed_at=now,
        )
        # Increment execution counter on workflow
        Workflow.objects(id=workflow.id).update_one(
            inc__execution_count=1,
            set__last_executed_at=now,
        )
        execution.reload()
    except Exception as exc:
        WorkflowExecution.objects(id=execution.id).update_one(
            set__exec_status='failed',
            set__error_message=str(exc),
            set__completed_at=datetime.utcnow(),
        )
        logger.error('Workflow %s execution failed: %s', workflow.name, exc)

    return execution


def _run_action(action, trigger_data: dict, entity_type: str, entity_id: str) -> str:
    """Execute a single workflow action. Returns a description of what was done."""
    cfg = action.config or {}

    if action.action_type == 'send_email':
        from django.core.mail import send_mail
        from django.conf import settings
        to = cfg.get('to', trigger_data.get('email', ''))
        if to:
            send_mail(
                subject=cfg.get('subject', 'Radiance ERP Notification'),
                message=cfg.get('body', ''),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to],
                fail_silently=True,
            )
        return f'Email sent to {to}'

    elif action.action_type == 'send_whatsapp':
        phone = cfg.get('phone', trigger_data.get('phone', ''))
        message = cfg.get('message', '')
        if phone and message:
            from apps.whatsapp.views import _send_to_meta
            _send_to_meta({
                'messaging_product': 'whatsapp',
                'to': phone,
                'type': 'text',
                'text': {'body': message},
            })
        return f'WhatsApp sent to {phone}'

    elif action.action_type == 'create_task':
        from apps.crm.models import Task
        Task(
            title=cfg.get('title', 'Task from workflow'),
            description=cfg.get('description', ''),
            assigned_to_id=cfg.get('assigned_to_id'),
            related_type=entity_type,
            related_id=entity_id,
        ).save()
        return 'Task created'

    elif action.action_type == 'create_note':
        from apps.crm.models import Note
        Note(
            content=cfg.get('content', ''),
            related_type=entity_type,
            related_id=entity_id,
        ).save()
        return 'Note created'

    elif action.action_type == 'update_deal_stage':
        if entity_type == 'deal' and entity_id:
            from apps.crm.models import Deal
            Deal.objects(id=entity_id).update_one(
                set__stage=cfg.get('stage', 'qualified'),
                set__updated_at=datetime.utcnow(),
            )
        return f'Deal stage updated to {cfg.get("stage")}'

    elif action.action_type == 'send_webhook':
        import requests
        url = cfg.get('url', '')
        if url:
            requests.post(url, json=trigger_data, timeout=10)
        return f'Webhook sent to {url}'

    elif action.action_type == 'wait':
        import time
        delay = min(300, int(cfg.get('delay_seconds', 0)))  # max 5 min in sync mode
        if delay > 0:
            time.sleep(delay)
        return f'Waited {delay}s'

    return f'Action {action.action_type} executed'


# ─── Workflow CRUD ────────────────────────────────────────────────────────────

class WorkflowListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Workflow.objects.all()
        trigger = request.query_params.get('trigger')
        if trigger:
            qs = qs.filter(trigger=trigger)
        wf_status = request.query_params.get('status')
        if wf_status:
            qs = qs.filter(wf_status=wf_status)
        return Response(WorkflowSerializer(qs, many=True).data)

    def post(self, request):
        s = WorkflowSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        validated = s.validated_data
        validated.setdefault('created_by_id', str(request.user.id))
        wf = s.create(validated)
        return Response(WorkflowSerializer(wf).data, status=status.HTTP_201_CREATED)


class WorkflowDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Workflow.objects(id=pk).first()
        if not obj:
            raise NotFound('Workflow not found.')
        return obj

    def get(self, request, pk):
        return Response(WorkflowSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = WorkflowSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(WorkflowSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TriggerWorkflowView(APIView):
    """Manually trigger a workflow execution."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        workflow = Workflow.objects(id=pk).first()
        if not workflow:
            raise NotFound('Workflow not found.')
        if workflow.wf_status != 'active':
            return Response({'detail': 'Only active workflows can be triggered.'}, status=status.HTTP_400_BAD_REQUEST)

        trigger_data = request.data.get('trigger_data', {})
        entity_type = request.data.get('entity_type')
        entity_id = request.data.get('entity_id')

        execution = execute_workflow(workflow, trigger_data, entity_type, entity_id)
        return Response(WorkflowExecutionSerializer(execution).data, status=status.HTTP_201_CREATED)


class WorkflowExecutionListView(APIView):
    """List execution history for a workflow."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        workflow = Workflow.objects(id=pk).first()
        if not workflow:
            raise NotFound('Workflow not found.')
        executions = WorkflowExecution.objects(workflow=workflow).order_by('-started_at').limit(50)
        return Response(WorkflowExecutionSerializer(executions, many=True).data)
