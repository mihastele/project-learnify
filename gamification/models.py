import uuid

from django.db import models


class Badge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=128, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=32, default="\u2B50")
    category = models.CharField(max_length=64, db_index=True, default="general")
    required_xp = models.PositiveIntegerField(default=0)
    required_streak = models.PositiveIntegerField(default=0)
    required_correct_count = models.PositiveIntegerField(default=0)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "required_xp"]

    def __str__(self) -> str:
        return f"{self.icon} {self.name}"


class LearnerStats(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    learner = models.OneToOneField(
        "learning.Learner", on_delete=models.CASCADE, related_name="stats"
    )
    xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_practice_date = models.DateField(null=True, blank=True)
    total_correct = models.PositiveIntegerField(default=0)
    total_incorrect = models.PositiveIntegerField(default=0)
    total_partial = models.PositiveIntegerField(default=0)
    total_sessions = models.PositiveIntegerField(default=0)
    daily_xp_goal = models.PositiveIntegerField(default=50)
    daily_xp_earned = models.PositiveIntegerField(default=0)
    daily_xp_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def xp_for_next_level(self) -> int:
        return self.level * 100

    def progress_to_next_level(self) -> float:
        needed = self.xp_for_next_level()
        prev = (self.level - 1) * 100 if self.level > 1 else 0
        return (self.xp - prev) / (needed - prev)

    def __str__(self) -> str:
        return f"Stats({self.learner}) Lv.{self.level} XP:{self.xp}"


class LearnerBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    learner = models.ForeignKey(
        "learning.Learner", on_delete=models.CASCADE, related_name="badges"
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="awarded")
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["learner", "badge"], name="unique_learner_badge"
            )
        ]
        ordering = ["-awarded_at"]

    def __str__(self) -> str:
        return f"{self.learner} earned {self.badge}"


class DailyActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    learner = models.ForeignKey(
        "learning.Learner", on_delete=models.CASCADE, related_name="daily_activities"
    )
    date = models.DateField(db_index=True)
    xp_earned = models.PositiveIntegerField(default=0)
    items_completed = models.PositiveIntegerField(default=0)
    seconds_practiced = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["learner", "date"], name="unique_learner_date"
            )
        ]
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"Activity({self.learner}) {self.date}: {self.xp_earned}XP"


class CanvasGame(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="canvas_games"
    )
    tools_config = models.JSONField(
        default=dict, help_text="JSON configuration for reusable tools like boxes, buttons, etc."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name
