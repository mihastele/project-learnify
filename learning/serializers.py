from rest_framework import serializers
from django.contrib.auth.models import User, Group
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

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class UserSerializer(serializers.ModelSerializer):
    groups = GroupSerializer(many=True, read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'groups']

class AdminLearnerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Learner
        fields = ['id', 'user', 'is_teacher_approved', 'teacher_proposal_status', 'created_at']
