from django.contrib import admin
from .models import Learner, Attempt, ItemState

@admin.register(Learner)
class LearnerAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "teacher_proposal_status", "is_teacher_approved", "created_at")
    list_filter = ("teacher_proposal_status", "is_teacher_approved")
    search_fields = ("user__username", "user__email")

@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "learner", "item", "result", "timestamp")
    list_filter = ("result", "timestamp")

@admin.register(ItemState)
class ItemStateAdmin(admin.ModelAdmin):
    list_display = ("id", "learner", "item", "ease_factor", "interval_days", "next_due")
