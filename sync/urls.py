from rest_framework.routers import DefaultRouter

from .views import SyncViewSet

router = DefaultRouter()
router.register(r"sync", SyncViewSet, basename="sync")

urlpatterns = router.urls
