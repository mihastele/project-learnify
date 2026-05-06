from rest_framework.routers import DefaultRouter

from .views import (
    BadgeViewSet,
    DailyActivityViewSet,
    GamificationViewSet,
    LearnerBadgeViewSet,
    LearnerStatsViewSet,
    CanvasGameViewSet,
)

router = DefaultRouter()
router.register(r"badges", BadgeViewSet)
router.register(r"stats", LearnerStatsViewSet, basename="learner-stats")
router.register(r"gamification", GamificationViewSet, basename="gamification")
router.register(r"canvas-games", CanvasGameViewSet, basename="canvas-games")

urlpatterns = router.urls

urlpatterns += [
    # Nested under learners
]

urlpatterns_learner_nested = [
    (r"badges", LearnerBadgeViewSet, "learner-badges"),
    (r"activity", DailyActivityViewSet, "learner-activity"),
]
