from rest_framework.routers import DefaultRouter

from .views import AttemptViewSet, ItemStateViewSet, LearnerViewSet, AuthViewSet, AdminLearnerViewSet

router = DefaultRouter()
router.register(r"learners", LearnerViewSet)
router.register(r"attempts", AttemptViewSet)
router.register(r"item_states", ItemStateViewSet)
router.register(r"auth", AuthViewSet, basename="auth")
router.register(r"admin/learners", AdminLearnerViewSet, basename="admin_learners")

urlpatterns = router.urls
