from content.models import ContentUnit, ContentVariant, Item, MediaResource
from content.serializers import (
    ContentUnitDetailSerializer,
    ContentVariantSerializer,
    ItemSerializer,
    MediaResourceSerializer,
)
from django.utils import timezone
from learning.models import Attempt, ItemState, Learner
from learning.serializers import AttemptSerializer, ItemStateSerializer
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .models import SyncState


class SyncViewSet(viewsets.ViewSet):
    """Endpoints for device sync (pull content, push progress)."""

    @action(detail=False, methods=["get"])
    def content(self, request: Request) -> Response:
        """Pull content updated since ``last_sync_at``.

        Query params:
            learner_id (required)
            last_sync_at  – ISO 8601 timestamp (optional)
            subject, level, language_code – filters (optional)
        """
        learner_id = request.query_params.get("learner_id")
        if not learner_id:
            return Response(
                {"error": "learner_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        last_sync_str = request.query_params.get("last_sync_at")
        last_sync = None
        if last_sync_str:
            try:
                last_sync = timezone.datetime.fromisoformat(last_sync_str)
            except ValueError:
                return Response(
                    {"error": "Invalid last_sync_at format. Use ISO 8601."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        units_qs = ContentUnit.objects.prefetch_related(
            "variants", "media", "items"
        ).all()

        if last_sync:
            units_qs = units_qs.filter(updated_at__gt=last_sync)

        subject = request.query_params.get("subject")
        if subject:
            units_qs = units_qs.filter(subject=subject)
        level = request.query_params.get("level")
        if level:
            units_qs = units_qs.filter(level=level)

        # If language_code filter is requested, also filter variants.
        language_code = request.query_params.get("language_code")

        server_sync_time = timezone.now()
        data = []
        for unit in units_qs:
            unit_data = ContentUnitDetailSerializer(unit).data
            if language_code:
                unit_data["variants"] = [
                    v
                    for v in unit_data["variants"]
                    if v["language_code"] == language_code
                ]
            data.append(unit_data)

        return Response(
            {"content_units": data, "server_sync_time": server_sync_time.isoformat()}
        )

    @action(detail=False, methods=["post"])
    def progress(self, request: Request) -> Response:
        """Push unsynced attempts and item states from the client.

        Payload:
            learner_id (str)
            attempts: list of attempt dicts (client timestamps, temp IDs)
            item_states: optional list of item state dicts

        Idempotent — re-sending already-persisted data is safe.
        """
        learner_id = request.data.get("learner_id")
        if not learner_id:
            return Response(
                {"error": "learner_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            learner = Learner.objects.get(id=learner_id)
        except Learner.DoesNotExist:
            return Response(
                {"error": "Learner not found"}, status=status.HTTP_404_NOT_FOUND
            )

        results = {"attempts": [], "item_states": [], "server_sync_time": None}

        for attempt_data in request.data.get("attempts", []):
            attempt_id = attempt_data.get("id")
            if attempt_id and Attempt.objects.filter(id=attempt_id).exists():
                results["attempts"].append({"id": attempt_id, "status": "already_exists"})
                continue
            serializer = AttemptSerializer(data={**attempt_data, "learner": str(learner.id)})
            if serializer.is_valid():
                serializer.save()
                results["attempts"].append({"id": attempt_id, "status": "created"})
            else:
                results["attempts"].append(
                    {"id": attempt_id, "status": "error", "errors": serializer.errors}
                )

        for state_data in request.data.get("item_states", []):
            state_id = state_data.get("id")
            if state_id and ItemState.objects.filter(id=state_id).exists():
                results["item_states"].append({"id": state_id, "status": "already_exists"})
                continue
            serializer = ItemStateSerializer(data={**state_data, "learner": str(learner.id)})
            if serializer.is_valid():
                serializer.save()
                results["item_states"].append({"id": state_id, "status": "created"})
            else:
                results["item_states"].append(
                    {"id": state_id, "status": "error", "errors": serializer.errors}
                )

        server_sync_time = timezone.now()
        results["server_sync_time"] = server_sync_time.isoformat()

        # Update the learner's sync state.
        sync_state, _ = SyncState.objects.get_or_create(learner=learner)
        sync_state.last_progress_sync = server_sync_time
        sync_state.save()

        return Response(results)
