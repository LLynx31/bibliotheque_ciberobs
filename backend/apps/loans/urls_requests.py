from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import BorrowRequestViewSet

router = DefaultRouter()
router.register("", BorrowRequestViewSet, basename="borrow-request")

urlpatterns = [
    path("", include(router.urls)),
]
