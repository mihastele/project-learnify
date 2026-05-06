import uuid

from django.db import models


RESULT_CHOICES = [
    ("CORRECT", "Correct"),
    ("INCORRECT", "Incorrect"),
    ("PARTIAL", "Partial"),
]


class Learner(models.Model):
    """Represents an end-user learner.

    May be linked to a Django auth User for authenticated access, or exist
    anonymously via a UUID for offline-first scenarios.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="learner_profile",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    teacher_proposal_status = models.CharField(
        max_length=20,
        choices=[('NONE', 'None'), ('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')],
        default='NONE'
    )
    is_teacher_approved = models.BooleanField(default=False)

    def __str__(self) -> str:
        user_info = self.user.username if self.user else f"anon-{self.id.hex[:8]}"
        return f"Learner({user_info})"


class Attempt(models.Model):
    """A single attempt at an Item by a Learner."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    learner = models.ForeignKey(Learner, on_delete=models.CASCADE, related_name="attempts")
    item = models.ForeignKey("content.Item", on_delete=models.CASCADE, related_name="attempts")
    timestamp = models.DateTimeField(auto_now_add=True)
    result = models.CharField(max_length=16, choices=RESULT_CHOICES)
    response_data = models.JSONField(default=dict, blank=True)
    latency_ms = models.IntegerField(blank=True, null=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["learner", "timestamp"]),
            models.Index(fields=["item", "timestamp"]),
        ]

    def __str__(self) -> str:
        return f"Attempt by {self.learner_id} on {self.item_id}: {self.result}"


class ItemState(models.Model):
    """Tracks a Learner's spaced-repetition state for a specific Item."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    learner = models.ForeignKey(Learner, on_delete=models.CASCADE, related_name="item_states")
    item = models.ForeignKey("content.Item", on_delete=models.CASCADE, related_name="item_states")
    ease_factor = models.FloatField(default=2.5)
    interval_days = models.IntegerField(default=0)
    repetitions = models.IntegerField(default=0)
    next_due = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["learner", "item"], name="unique_learner_item_state"
            )
        ]
        indexes = [
            models.Index(fields=["learner", "next_due"]),
        ]

    def __str__(self) -> str:
        return (
            f"ItemState({self.learner_id}, {self.item_id}) "
            f"ef={self.ease_factor:.2f} iv={self.interval_days}d "
            f"due={self.next_due:%Y-%m-%d}"
        )
