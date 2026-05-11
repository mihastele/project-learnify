from rest_framework import serializers

from content.models import ContentUnit, ContentVariant, Item, MediaResource


class ItemCreateSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField([
        ("MCQ", "MCQ"), ("CLOZE", "CLOZE"), ("TRUE_FALSE", "TRUE_FALSE"),
        ("LISTEN_ANSWER", "LISTEN_ANSWER"), ("SPEAK_REPEAT", "SPEAK_REPEAT"),
        ("PRONUNCIATION", "PRONUNCIATION"), ("MATH_INPUT", "MATH_INPUT"),
        ("MATCHING", "MATCHING"), ("SORTING", "SORTING"),
        ("DIAGRAM_LABEL", "DIAGRAM_LABEL"), ("WRITING", "WRITING"),
        ("ADVANCED_CANVAS_GAME", "ADVANCED_CANVAS_GAME"),
    ])
    prompt = serializers.CharField()
    hint = serializers.CharField(required=False, allow_blank=True, default="")
    metadata = serializers.JSONField(default=dict)
    sort_order = serializers.IntegerField(default=0)
    points = serializers.IntegerField(default=10)
    tag_names = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def validate(self, data):
        item_type = data.get("item_type")
        metadata = data.get("metadata", {})
        if item_type == "ADVANCED_CANVAS_GAME":
            self._validate_canvas_game_config(metadata)
        return data

    @staticmethod
    def _validate_canvas_game_config(metadata):
        game_config = metadata.get("game_config", {})
        if not game_config:
            raise serializers.ValidationError({"metadata": "game_config is required for ADVANCED_CANVAS_GAME items."})
        success = game_config.get("success_condition")
        failure = game_config.get("failure_condition")
        if not success:
            raise serializers.ValidationError({"metadata": "game_config.success_condition is required."})
        if not failure:
            raise serializers.ValidationError({"metadata": "game_config.failure_condition is required."})
        valid_success = {"score_threshold", "survive_for_seconds"}
        if success.get("type") not in valid_success:
            raise serializers.ValidationError({"metadata": f"success_condition.type must be one of: {valid_success}"})
        valid_failure = {"lives_reached_zero", "time_expired"}
        if failure.get("type") not in valid_failure:
            raise serializers.ValidationError({"metadata": f"failure_condition.type must be one of: {valid_failure}"})
        time_limit = game_config.get("time_limit")
        if time_limit is not None and (not isinstance(time_limit, (int, float)) or time_limit <= 0):
            raise serializers.ValidationError({"metadata": "time_limit must be a positive number."})


class MediaCreateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(["AUDIO", "IMAGE", "VIDEO", "OTHER"])
    url = serializers.URLField(required=False, allow_blank=True, default="")
    caption = serializers.CharField(required=False, allow_blank=True, default="")


class LessonCreateSerializer(serializers.ModelSerializer):
    language_code = serializers.CharField(write_only=True, default="en")
    script = serializers.CharField(write_only=True, default="Latin")
    body = serializers.CharField(write_only=True, default="")
    items = ItemCreateSerializer(many=True, required=False, default=list)
    media = MediaCreateSerializer(many=True, required=False, default=list)

    class Meta:
        model = ContentUnit
        fields = [
            "id", "title", "description", "subject", "level",
            "license_type", "source_url",
            "language_code", "script", "body",
            "items", "media",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        language_code = validated_data.pop("language_code", "en")
        script = validated_data.pop("script", "Latin")
        body = validated_data.pop("body", "")
        items_data = validated_data.pop("items", [])
        media_data = validated_data.pop("media", [])

        validated_data["created_by"] = self.context["request"].user
        content_unit = ContentUnit.objects.create(**validated_data)

        ContentVariant.objects.create(
            content_unit=content_unit,
            language_code=language_code,
            script=script,
            body=body,
        )

        for i, item_data in enumerate(items_data):
            tag_names = item_data.pop("tag_names", [])
            sort_order = item_data.get("sort_order", i)
            Item.objects.create(
                content_unit=content_unit,
                item_type=item_data["item_type"],
                prompt=item_data["prompt"],
                hint=item_data.get("hint", ""),
                metadata=item_data.get("metadata", {}),
                sort_order=sort_order,
                points=item_data.get("points", 10),
                difficulty_initial=item_data.get("difficulty_initial"),
            )

        for m in media_data:
            MediaResource.objects.create(
                content_unit=content_unit,
                type=m["type"],
                url=m.get("url", ""),
                caption=m.get("caption", ""),
            )

        return content_unit
