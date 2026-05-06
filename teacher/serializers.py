from rest_framework import serializers

from content.models import ContentUnit, ContentVariant


class ContentUnitCreateSerializer(serializers.ModelSerializer):
    """Creates a ContentUnit along with an initial ContentVariant in one call.

    Extra fields (not on ContentUnit):
        language_code – for the initial variant
        script        – for the initial variant (default "Latin")
        body          – the variant body text
    """

    language_code = serializers.CharField(write_only=True, default="en")
    script = serializers.CharField(write_only=True, default="Latin")
    body = serializers.CharField(write_only=True, default="")

    class Meta:
        model = ContentUnit
        fields = [
            "id",
            "title",
            "description",
            "subject",
            "level",
            "license_type",
            "source_url",
            "language_code",
            "script",
            "body",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        language_code = validated_data.pop("language_code", "en")
        script = validated_data.pop("script", "Latin")
        body = validated_data.pop("body", "")

        validated_data["created_by"] = self.context["request"].user
        content_unit = ContentUnit.objects.create(**validated_data)

        ContentVariant.objects.create(
            content_unit=content_unit,
            language_code=language_code,
            script=script,
            body=body,
        )
        return content_unit
