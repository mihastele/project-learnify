from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from content.models import ContentUnit
from content.serializers import (
    ContentUnitDetailSerializer,
    ContentUnitListSerializer,
    ItemSerializer,
    MediaResourceSerializer,
)

from .serializers import LessonCreateSerializer


class TeacherViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["post"])
    def create_lesson(self, request):
        serializer = LessonCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            content_unit = serializer.save()
            return Response(
                ContentUnitDetailSerializer(content_unit).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def my_lessons(self, request):
        units = ContentUnit.objects.filter(
            created_by=request.user
        ).prefetch_related("variants", "media", "items").order_by("-created_at")
        serializer = ContentUnitListSerializer(units, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get", "put", "delete"])
    def lesson(self, request):
        lesson_id = request.query_params.get("id")
        if not lesson_id:
            return Response({"error": "id required"}, status=400)

        try:
            unit = ContentUnit.objects.get(id=lesson_id, created_by=request.user)
        except ContentUnit.DoesNotExist:
            return Response({"error": "Lesson not found"}, status=404)

        if request.method == "GET":
            return Response(ContentUnitDetailSerializer(unit).data)

        if request.method == "PUT":
            serializer = LessonCreateSerializer(
                unit, data=request.data, partial=True,
                context={"request": request},
            )
            if serializer.is_valid():
                updated = serializer.save()
                return Response(ContentUnitDetailSerializer(updated).data)
            return Response(serializer.errors, status=400)

        if request.method == "DELETE":
            unit.delete()
            return Response({"ok": True})

        return Response({"error": "Method not allowed"}, status=405)

    @action(detail=False, methods=["post"])
    def add_item(self, request):
        lesson_id = request.data.get("lesson_id")
        if not lesson_id:
            return Response({"error": "lesson_id required"}, status=400)

        try:
            unit = ContentUnit.objects.get(id=lesson_id, created_by=request.user)
        except ContentUnit.DoesNotExist:
            return Response({"error": "Lesson not found"}, status=404)

        serializer = ItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(content_unit=unit)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=["post"])
    def add_media(self, request):
        lesson_id = request.data.get("lesson_id")
        if not lesson_id:
            return Response({"error": "lesson_id required"}, status=400)

        try:
            unit = ContentUnit.objects.get(id=lesson_id, created_by=request.user)
        except ContentUnit.DoesNotExist:
            return Response({"error": "Lesson not found"}, status=404)

        serializer = MediaResourceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(content_unit=unit)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=["post"])
    def create_content_unit(self, request):
        from .serializers import LessonCreateSerializer
        serializer = LessonCreateSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            content_unit = serializer.save()
            return Response(
                ContentUnitDetailSerializer(content_unit).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
