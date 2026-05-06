from rest_framework.routers import DefaultRouter

from .views import (
    BadgeViewSet,
    DailyActivityViewSet,
    GamificationViewSet,
    LearnerBadgeViewSet,
    LearnerStatsViewSet,
)

router = DefaultRouter()
router.register(r"badges", BadgeViewSet)
router.register(r"stats", LearnerStatsViewSet, basename="learner-stats")
router.register(r"gamification", GamificationViewSet, basename="gamification")

urlpatterns = router.urls

urlpatterns += [
    # Nested under learners
]

urlpatterns_learner_nested = [
    (r"badges", LearnerBadgeViewSet, "learner-badges"),
    (r"activity", DailyActivityViewSet, "learner-activity"),
]
