from rest_framework import serializers

from .models import Attempt, ItemState, Learner


class LearnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Learner
        fields = ["id", "user", "created_at"]
        read_only_fields = ["id", "created_at"]


class AttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attempt
        fields = [
            "id",
            "learner",
            "item",
            "timestamp",
            "result",
            "response_data",
            "latency_ms",
        ]
        read_only_fields = ["id", "timestamp"]


class ItemStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemState
        fields = [
            "id",
            "learner",
            "item",
            "ease_factor",
            "interval_days",
            "repetitions",
            "next_due",
        ]
        read_only_fields = ["id"]
