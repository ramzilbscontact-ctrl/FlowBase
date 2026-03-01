"""
Calendar views — CRUD for events + Google Calendar sync helpers.
"""
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.calendar_app.models import Event
from apps.calendar_app.serializers import EventSerializer


class EventListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Event.objects.all()
        # Filter by date range
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        if start:
            try:
                qs = qs.filter(start_datetime__gte=datetime.fromisoformat(start))
            except ValueError:
                pass
        if end:
            try:
                qs = qs.filter(end_datetime__lte=datetime.fromisoformat(end))
            except ValueError:
                pass
        organizer = request.query_params.get('organizer_id')
        if organizer:
            qs = qs.filter(organizer_id=organizer)
        return Response(EventSerializer(qs, many=True).data)

    def post(self, request):
        s = EventSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        validated = s.validated_data
        validated.setdefault('organizer_id', str(request.user.id))
        event = s.create(validated)
        return Response(EventSerializer(event).data, status=status.HTTP_201_CREATED)


class EventDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = Event.objects(id=pk).first()
        if not obj:
            raise NotFound('Event not found.')
        return obj

    def get(self, request, pk):
        return Response(EventSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = EventSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(EventSerializer(s.update(obj, s.validated_data)).data)

    def put(self, request, pk):
        obj = self._get(pk)
        s = EventSerializer(obj, data=request.data)
        s.is_valid(raise_exception=True)
        return Response(EventSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UpcomingEventsView(APIView):
    """Return the next N events for the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(50, int(request.query_params.get('limit', 10)))
        now = datetime.utcnow()
        events = Event.objects(
            organizer_id=str(request.user.id),
            start_datetime__gte=now,
            event_status__ne='cancelled',
        ).order_by('start_datetime').limit(limit)
        return Response(EventSerializer(events, many=True).data)
