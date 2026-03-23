from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import BookViewSet, CategoryViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("", BookViewSet, basename="book")

urlpatterns = [
    path("", include(router.urls)),
]
