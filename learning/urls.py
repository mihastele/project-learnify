from rest_framework.routers import DefaultRouter

from .views import AttemptViewSet, ItemStateViewSet, LearnerViewSet

router = DefaultRouter()
router.register(r"learners", LearnerViewSet)
router.register(r"attempts", AttemptViewSet)
router.register(r"item_states", ItemStateViewSet)

urlpatterns = router.urls
