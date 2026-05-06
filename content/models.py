import uuid

from django.conf import settings
from django.db import models


LICENSE_CHOICES = [
    ("CC-BY", "CC BY"),
    ("CC-BY-SA", "CC BY-SA"),
    ("CC-BY-NC", "CC BY-NC"),
    ("CC-BY-NC-SA", "CC BY-NC-SA"),
    ("CC-BY-ND", "CC BY-ND"),
    ("CC-BY-NC-ND", "CC BY-NC-ND"),
    ("CC0", "CC0 (Public Domain)"),
    ("PD", "Public Domain"),
    ("ALL_RIGHTS", "All Rights Reserved"),
]

MEDIA_TYPE_CHOICES = [
    ("AUDIO", "Audio"),
    ("IMAGE", "Image"),
    ("VIDEO", "Video"),
    ("OTHER", "Other"),
]

ITEM_TYPE_CHOICES = [
    ("MCQ", "Multiple Choice"),
    ("CLOZE", "Cloze / Fill-in-the-blank"),
    ("TRUE_FALSE", "True / False"),
    ("LISTEN_ANSWER", "Listen and Answer"),
    ("SPEAK_REPEAT", "Speak and Repeat"),
    ("PRONUNCIATION", "Pronunciation Practice"),
    ("MATH_INPUT", "Math Input"),
    ("MATCHING", "Matching Pairs"),
    ("SORTING", "Sorting / Ordering"),
    ("DIAGRAM_LABEL", "Diagram Label"),
    ("WRITING", "Writing / Open Response"),
]

SUBJECT_CHOICES = [
    ("LANGUAGE", "Language"),
    ("MATH", "Mathematics"),
    ("SCIENCE", "Science"),
    ("HISTORY", "History"),
    ("GEOGRAPHY", "Geography"),
    ("ART", "Art"),
    ("MUSIC", "Music"),
    ("CODING", "Coding"),
    ("OTHER", "Other"),
]


class Tag(models.Model):
    name = models.CharField(max_length=128, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ContentUnit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=512)
    description = models.TextField(blank=True, null=True)
    subject = models.CharField(max_length=128, db_index=True)
    level = models.CharField(max_length=64, db_index=True)
    license_type = models.CharField(max_length=32, choices=LICENSE_CHOICES)
    source_url = models.URLField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="content_units",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.subject}/{self.level})"


class ContentVariant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_unit = models.ForeignKey(
        ContentUnit, on_delete=models.CASCADE, related_name="variants"
    )
    language_code = models.CharField(max_length=12, db_index=True)
    script = models.CharField(max_length=32, default="Latin")
    body = models.TextField()
    is_official_translation = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["content_unit", "language_code"],
                name="unique_content_language",
            )
        ]

    def __str__(self) -> str:
        return f"{self.content_unit.title} [{self.language_code}]"


class MediaResource(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_unit = models.ForeignKey(
        ContentUnit, on_delete=models.CASCADE, related_name="media"
    )
    type = models.CharField(max_length=16, choices=MEDIA_TYPE_CHOICES)
    file = models.FileField(upload_to="media/", blank=True, null=True)
    url = models.URLField(blank=True, null=True)
    caption = models.TextField(blank=True, null=True)

    def __str__(self) -> str:
        return f"{self.get_type_display()} for {self.content_unit.title}"


class Item(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_unit = models.ForeignKey(
        ContentUnit, on_delete=models.CASCADE, related_name="items"
    )
    item_type = models.CharField(max_length=24, choices=ITEM_TYPE_CHOICES)
    prompt = models.TextField()
    hint = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    difficulty_initial = models.FloatField(blank=True, null=True)
    sort_order = models.IntegerField(default=0)
    points = models.PositiveIntegerField(default=10)
    tags = models.ManyToManyField(Tag, blank=True, related_name="items")
    media_resource = models.ForeignKey(
        MediaResource,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="linked_items"
    )
    ai_target_audio = models.FileField(upload_to="ai_pronunciation/", blank=True, null=True)
    ai_target_features = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["sort_order", "item_type"]

    def __str__(self) -> str:
        return f"[{self.get_item_type_display()}] {self.prompt[:80]}"
