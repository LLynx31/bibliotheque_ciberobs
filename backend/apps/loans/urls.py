from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LoanViewSet, ExtensionRequestViewSet

router = DefaultRouter()
router.register("extensions", ExtensionRequestViewSet, basename="extension")
router.register("", LoanViewSet, basename="loan")

urlpatterns = [
    path("", include(router.urls)),
]
