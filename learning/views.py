import logging
import uuid
from datetime import date

from content.models import Item
from django.utils import timezone
from gamification.models import Badge, DailyActivity, LearnerBadge, LearnerStats
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from .models import Attempt, ItemState, Learner
from .serializers import AttemptSerializer, ItemStateSerializer, LearnerSerializer
from .srs import update_item_state
from django.contrib.auth.models import User, Group
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAdminUser

DEFAULT_NEXT_ITEMS_LIMIT = 20

XP_PER_CORRECT = 10
XP_PER_PARTIAL = 5
XP_PER_INCORRECT = 2


class LearnerViewSet(viewsets.ModelViewSet):
    queryset = Learner.objects.all()
    serializer_class = LearnerSerializer

    @action(detail=True, methods=["get"])
    def next_items(self, request, pk=None):
        learner = self.get_object()
        now = timezone.now()
        limit = int(request.query_params.get("limit", DEFAULT_NEXT_ITEMS_LIMIT))

        subject = request.query_params.get("subject")
        item_type = request.query_params.get("item_type")
        content_unit = request.query_params.get("content_unit")

        base_qs = Item.objects.all()
        if subject:
            base_qs = base_qs.filter(content_unit__subject=subject)
        if item_type:
            base_qs = base_qs.filter(item_type=item_type)
        if content_unit:
            base_qs = base_qs.filter(content_unit_id=content_unit)

        states = ItemState.objects.filter(learner=learner).select_related("item")
        seen_item_ids = set(states.values_list("item_id", flat=True))

        due_ids = list(
            states.filter(next_due__lte=now, item_id__in=base_qs.values("id"))
            .order_by("ease_factor")
            .values_list("item_id", flat=True)[:limit]
        )

        slots_left = limit - len(due_ids)
        if slots_left > 0:
            new_qs = base_qs.exclude(id__in=seen_item_ids)
            new_ids = list(
                new_qs.order_by("?")[:slots_left].values_list("id", flat=True)
            )
            due_ids.extend(new_ids)

        if len(due_ids) < limit:
            valid_ids = set(base_qs.values_list("id", flat=True))
            more_due = (
                states.filter(item_id__in=seen_item_ids & valid_ids)
                .exclude(item_id__in=due_ids)
                .order_by("next_due")
                .values_list("item_id", flat=True)[: slots_left]
            )
            due_ids.extend(more_due)

        items = Item.objects.filter(id__in=due_ids).select_related("content_unit")
        from content.serializers import ItemSerializer

        serializer = ItemSerializer(items, many=True)

        if content_unit and not due_ids:
            total = base_qs.count()
            logger.warning(
                "next_items: learner=%s content_unit=%s returned 0 items (total=%s in unit). "
                "Check that items exist and are assigned to this content_unit.",
                learner.id, content_unit, total,
            )

        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        learner = self.get_object()
        stats, _ = LearnerStats.objects.get_or_create(
            learner=learner,
            defaults={"id": uuid.uuid4()},
        )
        from gamification.serializers import LearnerStatsSerializer
        return Response(LearnerStatsSerializer(stats).data)

    @action(detail=True, methods=["post"])
    def request_teacher_access(self, request, pk=None):
        learner = self.get_object()
        learner.teacher_proposal_status = 'PENDING'
        learner.save()
        return Response({'status': 'Teacher access requested', 'teacher_proposal_status': learner.teacher_proposal_status})

class AuthViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def register(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username taken'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.create_user(username=username, password=password)
        learner = Learner.objects.create(user=user)
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'learner_id': learner.id,
            'username': user.username,
            'is_teacher_approved': learner.is_teacher_approved,
            'teacher_proposal_status': learner.teacher_proposal_status,
            'is_staff': user.is_staff
        })

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            learner, _ = Learner.objects.get_or_create(user=user)
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'learner_id': learner.id,
                'username': user.username,
                'is_teacher_approved': learner.is_teacher_approved,
                'teacher_proposal_status': learner.teacher_proposal_status,
                'is_staff': user.is_staff
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)



class AttemptViewSet(viewsets.ModelViewSet):
    queryset = Attempt.objects.select_related("learner", "item").all()
    serializer_class = AttemptSerializer

    def perform_create(self, serializer):
        attempt = serializer.save()
        self._update_srs(attempt)
        self._update_gamification(attempt)

    def _update_srs(self, attempt: Attempt) -> None:
        state, _ = ItemState.objects.get_or_create(
            learner=attempt.learner,
            item=attempt.item,
            defaults={"next_due": timezone.now()},
        )
        updated = update_item_state(
            ease_factor=state.ease_factor,
            interval_days=state.interval_days,
            repetitions=state.repetitions,
            next_due=state.next_due,
            result=attempt.result,
        )
        for field, value in updated.items():
            setattr(state, field, value)
        state.save()

    def _update_gamification(self, attempt: Attempt) -> None:
        stats, _ = LearnerStats.objects.get_or_create(
            learner_id=attempt.learner_id,
            defaults={"id": uuid.uuid4()},
        )

        xp = 0
        if attempt.result == "CORRECT":
            xp = XP_PER_CORRECT
            stats.total_correct += 1
        elif attempt.result == "PARTIAL":
            xp = XP_PER_PARTIAL
            stats.total_partial += 1
        else:
            xp = XP_PER_INCORRECT
            stats.total_incorrect += 1

        stats.xp += xp
        stats.level = max(1, (stats.xp // 100) + 1)

        today = date.today()
        if stats.daily_xp_date != today:
            stats.daily_xp_earned = 0
            stats.daily_xp_date = today
        stats.daily_xp_earned += xp

        from datetime import timedelta
        if stats.last_practice_date:
            if stats.last_practice_date == today:
                pass
            elif stats.last_practice_date == today - timedelta(days=1):
                stats.current_streak += 1
            else:
                stats.current_streak = 1
        else:
            stats.current_streak = 1

        stats.last_practice_date = today
        stats.longest_streak = max(stats.longest_streak, stats.current_streak)
        stats.total_sessions += 1
        stats.save()

        activity, _ = DailyActivity.objects.get_or_create(
            learner_id=attempt.learner_id, date=today,
            defaults={"id": uuid.uuid4()},
        )
        activity.xp_earned += xp
        activity.items_completed += 1
        activity.save()

        self._check_badges(stats)

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


class ItemStateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ItemState.objects.select_related("learner", "item").all()
    serializer_class = ItemStateSerializer
    filterset_fields = ["learner", "item"]

from .serializers import AdminLearnerSerializer

class AdminLearnerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Learner.objects.select_related("user").prefetch_related("user__groups").all()
    serializer_class = AdminLearnerSerializer

    @action(detail=True, methods=["post"])
    def approve_teacher(self, request, pk=None):
        learner = self.get_object()
        action_type = request.data.get("action")
        if action_type == "accept":
            learner.is_teacher_approved = True
            learner.teacher_proposal_status = "APPROVED"
        elif action_type == "decline":
            learner.is_teacher_approved = False
            learner.teacher_proposal_status = "REJECTED"
        learner.save()
        return Response({"status": "Success", "teacher_proposal_status": learner.teacher_proposal_status})

    @action(detail=True, methods=["patch"])
    def groups(self, request, pk=None):
        learner = self.get_object()
        group_ids = request.data.get("groups", [])
        if learner.user:
            learner.user.groups.set(group_ids)
            learner.user.save()
        return Response({"status": "Groups updated"})

    @action(detail=False, methods=["get"])
    def all_groups(self, request):
        groups = Group.objects.all().values("id", "name")
        return Response(groups)
