import uuid
from datetime import date, timedelta

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Badge, DailyActivity, LearnerBadge, LearnerStats
from .serializers import (
    BadgeSerializer,
    DailyActivitySerializer,
    LeaderboardEntrySerializer,
    LearnerBadgeSerializer,
    LearnerStatsSerializer,
)


XP_PER_CORRECT = 10
XP_PER_PARTIAL = 5
XP_PER_INCORRECT = 2


class LearnerStatsViewSet(viewsets.ModelViewSet):
    queryset = LearnerStats.objects.select_related("learner").all()
    serializer_class = LearnerStatsSerializer
    lookup_field = "learner_id"
    lookup_url_kwarg = "learner_pk"


class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer


class LearnerBadgeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LearnerBadgeSerializer

    def get_queryset(self):
        return LearnerBadge.objects.filter(
            learner_id=self.kwargs["learner_pk"]
        ).select_related("badge").order_by("-awarded_at")


class DailyActivityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DailyActivitySerializer

    def get_queryset(self):
        qs = DailyActivity.objects.filter(
            learner_id=self.kwargs["learner_pk"]
        ).order_by("-date")
        days = self.request.query_params.get("days")
        if days:
            cutoff = date.today() - timedelta(days=int(days))
            qs = qs.filter(date__gte=cutoff)
        return qs


class GamificationViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["post"])
    def record_practice(self, request):
        learner_id = request.data.get("learner_id")
        result = request.data.get("result")
        session_xp = request.data.get("xp_earned", 0)
        items_done = request.data.get("items_completed", 1)
        seconds = request.data.get("seconds_practiced", 0)

        if not learner_id:
            return Response({"error": "learner_id required"}, status=400)

        stats, _ = LearnerStats.objects.get_or_create(
            learner_id=learner_id,
            defaults={"id": uuid.uuid4()},
        )

        xp = 0
        if result == "CORRECT":
            xp = XP_PER_CORRECT
            stats.total_correct += 1
        elif result == "PARTIAL":
            xp = XP_PER_PARTIAL
            stats.total_partial += 1
        else:
            xp = XP_PER_INCORRECT
            stats.total_incorrect += 1

        stats.xp += xp
        new_level = max(1, (stats.xp // 100) + 1)
        stats.level = new_level

        today = date.today()
        if stats.daily_xp_date != today:
            stats.daily_xp_earned = 0
            stats.daily_xp_date = today
        stats.daily_xp_earned += xp

        if stats.last_practice_date:
            if stats.last_practice_date == today - timedelta(days=1):
                stats.current_streak += 1
            elif stats.last_practice_date != today:
                stats.current_streak = 1
        else:
            stats.current_streak = 1
        stats.last_practice_date = today
        stats.longest_streak = max(stats.longest_streak, stats.current_streak)
        stats.total_sessions += 1
        stats.save()

        activity, _ = DailyActivity.objects.get_or_create(
            learner_id=learner_id, date=today,
            defaults={"id": uuid.uuid4()},
        )
        activity.xp_earned += xp
        activity.items_completed += items_done
        activity.seconds_practiced += seconds
        activity.save()

        self._check_badges(stats)

        serializer = LearnerStatsSerializer(stats)
        return Response(serializer.data)

    def _check_badges(self, stats):
        badges = Badge.objects.filter(
            required_xp__lte=stats.xp,
            required_streak__lte=stats.current_streak,
            required_correct_count__lte=stats.total_correct,
        )
        for badge in badges:
            LearnerBadge.objects.get_or_create(
                learner_id=stats.learner_id,
                badge=badge,
                defaults={"id": uuid.uuid4()},
            )

    @action(detail=False, methods=["get"])
    def leaderboard(self, request):
        limit = int(request.query_params.get("limit", 20))
        qs = LearnerStats.objects.select_related("learner").order_by("-xp")[:limit]
        entries = []
        for rank, stat in enumerate(qs, 1):
            entries.append({
                "learner_id": str(stat.learner_id),
                "xp": stat.xp,
                "level": stat.level,
                "streak": stat.current_streak,
                "rank": rank,
            })
        return Response(entries)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        learner_id = request.query_params.get("learner_id")
        if not learner_id:
            return Response({"error": "learner_id required"}, status=400)

        stats, _ = LearnerStats.objects.get_or_create(
            learner_id=learner_id,
            defaults={"id": uuid.uuid4()},
        )

        badges = LearnerBadge.objects.filter(
            learner_id=learner_id
        ).select_related("badge").order_by("-awarded_at")

        today = date.today()
        week_activities = DailyActivity.objects.filter(
            learner_id=learner_id,
            date__gte=today - timedelta(days=6),
        ).order_by("date")

        daily_xp_goal = stats.daily_xp_goal

        return Response({
            "stats": LearnerStatsSerializer(stats).data,
            "badges": LearnerBadgeSerializer(badges, many=True).data,
            "week_activities": DailyActivitySerializer(week_activities, many=True).data,
            "daily_xp_goal": daily_xp_goal,
        })

    @action(detail=False, methods=["post"])
    def set_daily_goal(self, request):
        learner_id = request.data.get("learner_id")
        goal = request.data.get("daily_xp_goal", 50)
        if not learner_id:
            return Response({"error": "learner_id required"}, status=400)
        stats = LearnerStats.objects.get(learner_id=learner_id)
        stats.daily_xp_goal = goal
        stats.save()
        return Response(LearnerStatsSerializer(stats).data)
