from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .ai_utils import generate_items_from_text
from .models import ContentUnit, ContentVariant, Item
from .serializers import (
    ContentUnitDetailSerializer,
    ContentUnitListSerializer,
    ItemSerializer,
)


class ContentUnitViewSet(viewsets.ModelViewSet):
    queryset = ContentUnit.objects.prefetch_related("variants", "media", "items").all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["subject", "level"]

    def get_serializer_class(self):
        if self.action == "list":
            return ContentUnitListSerializer
        return ContentUnitDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"])
    def items(self, request, pk=None):
        """Return all Items belonging to a ContentUnit."""
        content_unit = self.get_object()
        items_qs = content_unit.items.all()
        serializer = ItemSerializer(items_qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def auto_generate_items(self, request, pk=None):
        """Generate Items from a ContentUnit's variant body using AI stubs.

        Request body (optional):
            language_code – which variant to use as source text (default "en")
        """
        content_unit = self.get_object()
        language_code = request.data.get("language_code", "en")

        try:
            variant = ContentVariant.objects.get(
                content_unit=content_unit, language_code=language_code
            )
        except ContentVariant.DoesNotExist:
            return Response(
                {"error": f"No variant found for language '{language_code}'."},
                status=status.HTTP_404_NOT_FOUND,
            )

        item_dicts = generate_items_from_text(variant.body, language_code)
        created_items: list[Item] = []
        for data in item_dicts:
            item = Item.objects.create(
                content_unit=content_unit,
                item_type=data.get("item_type", "CLOZE"),
                prompt=data["prompt"],
                metadata=data.get("metadata", {}),
                difficulty_initial=data.get("difficulty_initial"),
            )
            created_items.append(item)

        serializer = ItemSerializer(created_items, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related("content_unit").prefetch_related("tags").all()
    serializer_class = ItemSerializer
