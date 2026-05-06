from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ContentUnit, Item
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


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related("content_unit").prefetch_related("tags").all()
    serializer_class = ItemSerializer
