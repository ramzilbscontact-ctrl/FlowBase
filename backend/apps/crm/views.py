"""
CRM views — CRUD for Contact, Company, Deal, Pipeline, Task, Note.
Uses APIView directly because MongoEngine is not compatible with ViewSet
querysets/filters out of the box.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from apps.crm.models import Contact, Company, Deal, Pipeline, Task, Note
from apps.crm.serializers import (
    ContactSerializer, CompanySerializer, DealSerializer,
    PipelineSerializer, TaskSerializer, NoteSerializer,
)


def paginate(queryset, request, serializer_class):
    """Simple pagination helper."""
    try:
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(200, int(request.query_params.get('page_size', 50)))
    except (ValueError, TypeError):
        page, page_size = 1, 50

    total = queryset.count()
    offset = (page - 1) * page_size
    items = queryset.skip(offset).limit(page_size)

    return Response({
        'count': total,
        'page': page,
        'page_size': page_size,
        'results': serializer_class(items, many=True).data,
    })


# ─── Contact views ────────────────────────────────────────────────────────────

class ContactListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Contact.objects.all()
        # Basic filters
        email = request.query_params.get('email')
        if email:
            qs = qs.filter(email__icontains=email)
        search = request.query_params.get('q')
        if search:
            qs = qs.filter(
                me__or=[
                    {'first_name__icontains': search},
                    {'last_name__icontains': search},
                    {'email__icontains': search},
                    {'company_name__icontains': search},
                ]
            )
        return paginate(qs, request, ContactSerializer)

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        validated.setdefault('owner_id', str(request.user.id))
        contact = serializer.create(validated)
        return Response(ContactSerializer(contact).data, status=status.HTTP_201_CREATED)


class ContactDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        contact = Contact.objects(id=pk).first()
        if not contact:
            from rest_framework.exceptions import NotFound
            raise NotFound('Contact not found.')
        return contact

    def get(self, request, pk):
        return Response(ContactSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        contact = self._get(pk)
        serializer = ContactSerializer(contact, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        contact = serializer.update(contact, serializer.validated_data)
        return Response(ContactSerializer(contact).data)

    def put(self, request, pk):
        contact = self._get(pk)
        serializer = ContactSerializer(contact, data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = serializer.update(contact, serializer.validated_data)
        return Response(ContactSerializer(contact).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Company views ────────────────────────────────────────────────────────────

class CompanyListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Company.objects.all()
        search = request.query_params.get('q')
        if search:
            qs = qs.filter(name__icontains=search)
        return paginate(qs, request, CompanySerializer)

    def post(self, request):
        serializer = CompanySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        validated.setdefault('owner_id', str(request.user.id))
        company = serializer.create(validated)
        return Response(CompanySerializer(company).data, status=status.HTTP_201_CREATED)


class CompanyDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Company.objects(id=pk).first()
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound('Company not found.')
        return obj

    def get(self, request, pk):
        return Response(CompanySerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = CompanySerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        obj = s.update(obj, s.validated_data)
        return Response(CompanySerializer(obj).data)

    def put(self, request, pk):
        obj = self._get(pk)
        s = CompanySerializer(obj, data=request.data)
        s.is_valid(raise_exception=True)
        obj = s.update(obj, s.validated_data)
        return Response(CompanySerializer(obj).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Pipeline views ───────────────────────────────────────────────────────────

class PipelineListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pipelines = Pipeline.objects.all()
        return Response(PipelineSerializer(pipelines, many=True).data)

    def post(self, request):
        s = PipelineSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        obj = s.create(s.validated_data)
        return Response(PipelineSerializer(obj).data, status=status.HTTP_201_CREATED)


class PipelineDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Pipeline.objects(id=pk).first()
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound('Pipeline not found.')
        return obj

    def get(self, request, pk):
        return Response(PipelineSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = PipelineSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(PipelineSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Deal views ───────────────────────────────────────────────────────────────

class DealListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Deal.objects.all()
        stage = request.query_params.get('stage')
        if stage:
            qs = qs.filter(stage=stage)
        pipeline_id = request.query_params.get('pipeline_id')
        if pipeline_id:
            pipeline = Pipeline.objects(id=pipeline_id).first()
            if pipeline:
                qs = qs.filter(pipeline=pipeline)
        return paginate(qs, request, DealSerializer)

    def post(self, request):
        s = DealSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        validated = s.validated_data
        validated.setdefault('owner_id', str(request.user.id))
        deal = s.create(validated)
        return Response(DealSerializer(deal).data, status=status.HTTP_201_CREATED)


class DealDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Deal.objects(id=pk).first()
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound('Deal not found.')
        return obj

    def get(self, request, pk):
        return Response(DealSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = DealSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(DealSerializer(s.update(obj, s.validated_data)).data)

    def put(self, request, pk):
        obj = self._get(pk)
        s = DealSerializer(obj, data=request.data)
        s.is_valid(raise_exception=True)
        return Response(DealSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Task views ───────────────────────────────────────────────────────────────

class TaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Task.objects.all()
        task_status = request.query_params.get('status')
        if task_status:
            qs = qs.filter(status=task_status)
        assigned = request.query_params.get('assigned_to_id')
        if assigned:
            qs = qs.filter(assigned_to_id=assigned)
        related_id = request.query_params.get('related_id')
        if related_id:
            qs = qs.filter(related_id=related_id)
        return paginate(qs, request, TaskSerializer)

    def post(self, request):
        s = TaskSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        validated = s.validated_data
        validated.setdefault('created_by_id', str(request.user.id))
        task = s.create(validated)
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Task.objects(id=pk).first()
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound('Task not found.')
        return obj

    def get(self, request, pk):
        return Response(TaskSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = TaskSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(TaskSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Note views ───────────────────────────────────────────────────────────────

class NoteListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Note.objects.all()
        related_id = request.query_params.get('related_id')
        if related_id:
            qs = qs.filter(related_id=related_id)
        return paginate(qs, request, NoteSerializer)

    def post(self, request):
        s = NoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        validated = s.validated_data
        validated.setdefault('author_id', str(request.user.id))
        note = s.create(validated)
        return Response(NoteSerializer(note).data, status=status.HTTP_201_CREATED)


class NoteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Note.objects(id=pk).first()
        if not obj:
            from rest_framework.exceptions import NotFound
            raise NotFound('Note not found.')
        return obj

    def get(self, request, pk):
        return Response(NoteSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = NoteSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(NoteSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Dashboard / stats ────────────────────────────────────────────────────────

class CRMDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pipeline_stats = {}
        from apps.crm.models import DEAL_STAGES
        for stage in DEAL_STAGES:
            pipeline_stats[stage] = Deal.objects(stage=stage).count()

        return Response({
            'contacts_total': Contact.objects.count(),
            'companies_total': Company.objects.count(),
            'deals_total': Deal.objects.count(),
            'deals_by_stage': pipeline_stats,
            'tasks_pending': Task.objects(status__in=['todo', 'in_progress']).count(),
        })
