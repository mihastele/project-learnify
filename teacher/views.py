from content.models import ContentUnit
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import ContentUnitCreateSerializer


class TeacherViewSet(viewsets.ViewSet):
    """Teacher-facing endpoints for content authoring and management."""

    @action(detail=False, methods=["post"])
    def create_content_unit(self, request):
        """Create a ContentUnit with an initial ContentVariant.

        Simplifies teacher workflow by accepting body text alongside metadata
        in one request, instead of requiring a separate variant POST.
        """
        serializer = ContentUnitCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            content_unit = serializer.save()
            return Response(
                ContentUnitCreateSerializer(content_unit).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
