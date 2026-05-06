from django.db import models


class SyncState(models.Model):
    """Tracks the last successful sync time per learner so the mobile client
    can request only incremental updates."""

    learner = models.OneToOneField(
        "learning.Learner",
        on_delete=models.CASCADE,
        related_name="sync_state",
        primary_key=True,
    )
    last_content_sync = models.DateTimeField(null=True, blank=True)
    last_progress_sync = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"SyncState(learner={self.learner_id})"
