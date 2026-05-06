from rest_framework import serializers

from .models import Badge, DailyActivity, LearnerBadge, LearnerStats, CanvasGame


class CanvasGameSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanvasGame
        fields = ["id", "name", "description", "created_by", "tools_config", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = [
            "id", "name", "description", "icon", "category",
            "required_xp", "required_streak", "required_correct_count",
            "sort_order",
        ]


class LearnerBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = LearnerBadge
        fields = ["id", "learner", "badge", "awarded_at"]
        read_only_fields = ["id", "awarded_at"]


class LearnerStatsSerializer(serializers.ModelSerializer):
    xp_for_next_level = serializers.IntegerField(read_only=True)
    progress_to_next_level = serializers.FloatField(read_only=True)

    class Meta:
        model = LearnerStats
        fields = [
            "id", "learner", "xp", "level",
            "xp_for_next_level", "progress_to_next_level",
            "current_streak", "longest_streak",
            "last_practice_date", "total_correct", "total_incorrect",
            "total_partial", "total_sessions",
            "daily_xp_goal", "daily_xp_earned", "daily_xp_date",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class DailyActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyActivity
        fields = ["id", "learner", "date", "xp_earned", "items_completed", "seconds_practiced"]
        read_only_fields = ["id"]


class LeaderboardEntrySerializer(serializers.Serializer):
    learner_id = serializers.UUIDField()
    xp = serializers.IntegerField()
    level = serializers.IntegerField()
    streak = serializers.IntegerField()
    rank = serializers.IntegerField()
