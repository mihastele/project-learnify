from django.contrib import admin

from .models import Badge, DailyActivity, LearnerBadge, LearnerStats


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ["name", "icon", "category", "required_xp", "sort_order"]


@admin.register(LearnerStats)
class LearnerStatsAdmin(admin.ModelAdmin):
    list_display = ["learner", "xp", "level", "current_streak", "last_practice_date"]


@admin.register(LearnerBadge)
class LearnerBadgeAdmin(admin.ModelAdmin):
    list_display = ["learner", "badge", "awarded_at"]


@admin.register(DailyActivity)
class DailyActivityAdmin(admin.ModelAdmin):
    list_display = ["learner", "date", "xp_earned", "items_completed"]
