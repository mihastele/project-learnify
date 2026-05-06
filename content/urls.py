from rest_framework.routers import DefaultRouter

from .views import ContentUnitViewSet, ItemViewSet

router = DefaultRouter()
router.register(r"content_units", ContentUnitViewSet)
router.register(r"items", ItemViewSet)

urlpatterns = router.urls
