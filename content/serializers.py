from rest_framework import serializers

from .models import ContentUnit, ContentVariant, Item, MediaResource, Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class ContentVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentVariant
        fields = [
            "id", "content_unit", "language_code", "script",
            "body", "is_official_translation", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MediaResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaResource
        fields = ["id", "content_unit", "type", "file", "url", "caption"]
        read_only_fields = ["id"]


class ItemSerializer(serializers.ModelSerializer):
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, source="tags", queryset=Tag.objects.all(), required=False,
    )

    class Meta:
        model = Item
        fields = [
            "id", "content_unit", "item_type", "prompt", "hint",
            "metadata", "difficulty_initial", "sort_order", "points",
            "tag_ids",
        ]
        read_only_fields = ["id"]


class ContentUnitListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = ContentUnit
        fields = [
            "id", "title", "description", "subject", "level",
            "license_type", "source_url", "item_count",
            "created_at", "updated_at",
        ]

    def get_item_count(self, obj):
        return obj.items.count()


class ContentUnitDetailSerializer(serializers.ModelSerializer):
    variants = ContentVariantSerializer(many=True, read_only=True)
    media = MediaResourceSerializer(many=True, read_only=True)
    items = ItemSerializer(many=True, read_only=True)
    created_by = serializers.StringRelatedField()

    class Meta:
        model = ContentUnit
        fields = [
            "id", "title", "description", "subject", "level",
            "license_type", "source_url", "created_by",
            "variants", "media", "items",
            "created_at", "updated_at",
        ]
