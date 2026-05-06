from content.models import Item
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Attempt, ItemState, Learner
from .serializers import AttemptSerializer, ItemStateSerializer, LearnerSerializer
from .srs import update_item_state

# Items due for review or new — cap per request to keep responses small.
DEFAULT_NEXT_ITEMS_LIMIT = 20


class LearnerViewSet(viewsets.ModelViewSet):
    queryset = Learner.objects.all()
    serializer_class = LearnerSerializer

    @action(detail=True, methods=["get"])
    def next_items(self, request, pk=None):
        """Return items ordered by due date, then predicted weakness.

        Due items come first (next_due <= now), then items the learner hasn't
        seen yet (no ItemState row).  Within each group items are ordered by
        ease_factor ascending (lower = harder).
        """
        learner = self.get_object()
        now = timezone.now()
        limit = int(request.query_params.get("limit", DEFAULT_NEXT_ITEMS_LIMIT))

        # Items the learner has seen: pick overdue ones first.
        states = ItemState.objects.filter(learner=learner).select_related("item")
        seen_item_ids = set(states.values_list("item_id", flat=True))

        due_ids = list(
            states.filter(next_due__lte=now)
            .order_by("ease_factor")
            .values_list("item_id", flat=True)[:limit]
        )

        # Fill remaining slots with unseen items.
        slots_left = limit - len(due_ids)
        if slots_left > 0:
            new_ids = list(
                Item.objects.exclude(id__in=seen_item_ids)
                .order_by("?")[:slots_left]
                .values_list("id", flat=True)
            )
            due_ids.extend(new_ids)

        # If there aren't enough new items, add overdue-but-seen items.
        if len(due_ids) < limit:
            more_due = (
                states.filter(item_id__in=seen_item_ids)
                .exclude(item_id__in=due_ids)
                .order_by("next_due")
                .values_list("item_id", flat=True)[: slots_left]
            )
            due_ids.extend(more_due)

        items = Item.objects.filter(id__in=due_ids).select_related("content_unit")
        from content.serializers import ItemSerializer

        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)


class AttemptViewSet(viewsets.ModelViewSet):
    queryset = Attempt.objects.select_related("learner", "item").all()
    serializer_class = AttemptSerializer

    def perform_create(self, serializer):
        attempt = serializer.save()
        self._update_srs(attempt)

    def _update_srs(self, attempt: Attempt) -> None:
        state, _ = ItemState.objects.get_or_create(
            learner=attempt.learner,
            item=attempt.item,
            defaults={"next_due": timezone.now()},
        )
        updated = update_item_state(
            ease_factor=state.ease_factor,
            interval_days=state.interval_days,
            repetitions=state.repetitions,
            next_due=state.next_due,
            result=attempt.result,
        )
        for field, value in updated.items():
            setattr(state, field, value)
        state.save()


class ItemStateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ItemState.objects.select_related("learner", "item").all()
    serializer_class = ItemStateSerializer
    filterset_fields = ["learner", "item"]
